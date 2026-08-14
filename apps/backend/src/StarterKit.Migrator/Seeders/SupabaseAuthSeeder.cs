using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace StarterKit.Migrator.Seeders;

/// <summary>
/// Ensures the local dev admin exists as a Supabase (GoTrue) auth user with a known password,
/// so <c>admin@starterkit.local</c> can sign in immediately after a fresh setup. Idempotent: creates
/// the user if missing, otherwise resets the password + app_metadata to the known values.
///
/// DEVELOPMENT ONLY — the password is a fixed dev credential; never run this against a real
/// environment (the caller guards on IHostEnvironment.IsDevelopment()).
/// The matching StarterKit <c>Users</c> row + SuperAdmin role are seeded by <see cref="DevAdminSeeder"/>;
/// RoleClaimsTransformer links the two by email on first sign-in.
/// </summary>
internal static class SupabaseAuthSeeder
{
    public const string DevAdminEmail = "admin@starterkit.local";

    /// <summary>Fixed local dev admin password. DEV ONLY — see class remarks.</summary>
    public const string DevAdminPassword = "P@ssword01*$";

    public static async Task SeedDevAdminAsync(
        string baseUrl,
        string serviceRoleKey,
        string? anonKey,
        Guid clubId,
        CancellationToken ct = default
    )
    {
        var root = baseUrl.TrimEnd('/');
        using var http = new HttpClient();
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            serviceRoleKey
        );
        http.DefaultRequestHeaders.TryAddWithoutValidation(
            "apikey",
            string.IsNullOrWhiteSpace(anonKey) ? serviceRoleKey : anonKey
        );

        var appMetadata = new Dictionary<string, object> { ["club_id"] = clubId.ToString() };

        var existingId = await FindUserIdByEmailAsync(http, root, DevAdminEmail, ct);

        if (existingId is null)
        {
            using var resp = await http.PostAsJsonAsync(
                $"{root}/auth/v1/admin/users",
                new
                {
                    email = DevAdminEmail,
                    password = DevAdminPassword,
                    email_confirm = true,
                    app_metadata = appMetadata,
                },
                ct
            );
            resp.EnsureSuccessStatusCode();
            Console.WriteLine($"  Supabase auth user created: {DevAdminEmail}");
        }
        else
        {
            // Reset the password + club claim so the known dev credentials always work,
            // even if the GoTrue user was left over from a prior run with a different password.
            using var resp = await http.PutAsJsonAsync(
                $"{root}/auth/v1/admin/users/{existingId}",
                new
                {
                    password = DevAdminPassword,
                    email_confirm = true,
                    app_metadata = appMetadata,
                },
                ct
            );
            resp.EnsureSuccessStatusCode();
            Console.WriteLine($"  Supabase auth user updated: {DevAdminEmail} (password reset)");
        }
    }

    private static async Task<string?> FindUserIdByEmailAsync(
        HttpClient http,
        string root,
        string email,
        CancellationToken ct
    )
    {
        // GoTrue admin list is paginated; a dev instance has few users, so one large page is enough.
        using var resp = await http.GetAsync(
            $"{root}/auth/v1/admin/users?page=1&per_page=1000",
            ct
        );
        if (resp.StatusCode == HttpStatusCode.NotFound)
            return null;
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(ct);
        if (!body.TryGetProperty("users", out var users) || users.ValueKind != JsonValueKind.Array)
            return null;

        foreach (var user in users.EnumerateArray())
        {
            if (
                user.TryGetProperty("email", out var e)
                && string.Equals(e.GetString(), email, StringComparison.OrdinalIgnoreCase)
                && user.TryGetProperty("id", out var id)
            )
                return id.GetString();
        }

        return null;
    }
}
