using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using StarterKit.Auth.Options;

namespace StarterKit.Auth.Services;

/// <summary>
/// Thin typed client over the GoTrue Admin API (<c>/auth/v1/admin/users</c>), authenticated with
/// the service-role key. Server-only — the service role bypasses all row-level security.
/// </summary>
internal sealed class GoTrueAdminClient(HttpClient httpClient, SupabaseOptions options)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull,
    };

    /// <summary>Creates a user and returns its GoTrue id (UUID).</summary>
    public async Task<string> CreateUserAsync(
        CreateUserRequest request,
        CancellationToken cancellationToken
    )
    {
        using var message = BuildRequest(HttpMethod.Post, "admin/users");
        message.Content = JsonContent.Create(request, options: JsonOptions);

        using var response = await httpClient.SendAsync(message, cancellationToken);
        await EnsureSuccessAsync(response, "create user", cancellationToken);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken);
        if (body.TryGetProperty("id", out var id) && id.ValueKind == JsonValueKind.String)
            return id.GetString()!;

        throw new InvalidOperationException(
            "GoTrue admin create-user response did not contain an id."
        );
    }

    /// <summary>Updates a user (password, app_metadata, ban_duration, …).</summary>
    public async Task UpdateUserAsync(
        string userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken
    )
    {
        using var message = BuildRequest(HttpMethod.Put, $"admin/users/{userId}");
        message.Content = JsonContent.Create(request, options: JsonOptions);

        using var response = await httpClient.SendAsync(message, cancellationToken);
        await EnsureSuccessAsync(response, "update user", cancellationToken);
    }

    /// <summary>Deletes a user. Treats 404 as success (already gone).</summary>
    public async Task DeleteUserAsync(string userId, CancellationToken cancellationToken)
    {
        using var message = BuildRequest(HttpMethod.Delete, $"admin/users/{userId}");
        using var response = await httpClient.SendAsync(message, cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return;

        await EnsureSuccessAsync(response, "delete user", cancellationToken);
    }

    private HttpRequestMessage BuildRequest(HttpMethod method, string relativePath)
    {
        var message = new HttpRequestMessage(
            method,
            $"{options.AdminBaseUrl}/auth/v1/{relativePath}"
        );
        // GoTrue admin endpoints require BOTH the apikey header and a service-role bearer token.
        message.Headers.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            options.ServiceRoleKey
        );
        message.Headers.TryAddWithoutValidation(
            "apikey",
            string.IsNullOrEmpty(options.AnonKey) ? options.ServiceRoleKey : options.AnonKey
        );
        return message;
    }

    private static async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        string operation,
        CancellationToken cancellationToken
    )
    {
        if (response.IsSuccessStatusCode)
            return;

        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new InvalidOperationException(
            $"GoTrue admin {operation} failed ({(int)response.StatusCode} {response.StatusCode}): {body}"
        );
    }
}

/// <summary>Body for <c>POST /admin/users</c>. Serialised snake_case.</summary>
internal sealed class CreateUserRequest
{
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Password { get; init; }

    /// <summary>Create the account already email-confirmed (admin provisioning skips verification).</summary>
    public bool? EmailConfirm { get; init; }
    public bool? PhoneConfirm { get; init; }

    public Dictionary<string, object>? UserMetadata { get; init; }
    public Dictionary<string, object?>? AppMetadata { get; init; }
}

/// <summary>Body for <c>PUT /admin/users/{id}</c>. Serialised snake_case; nulls omitted.</summary>
internal sealed class UpdateUserRequest
{
    public string? Password { get; init; }
    public Dictionary<string, object?>? AppMetadata { get; init; }

    /// <summary>Ban duration, e.g. <c>"876000h"</c> to suspend, <c>"none"</c> to lift.</summary>
    public string? BanDuration { get; init; }
}
