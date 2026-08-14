using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Core.PushNotifications.Options;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.Extensions;

namespace StarterKit.Core.PushNotifications.Services;

/// <summary>
/// Sends push notifications to Huawei HMS using the Push Kit REST API.
/// Reference: https://developer.huawei.com/consumer/en/doc/development/HMSCore-References/https-send-api-0000001050986197
/// </summary>
internal sealed class HmsPushSender(
    IHttpClientFactory httpClientFactory,
    IOptions<HmsPushOptions> options,
    TimeProvider clock,
    ILogger<HmsPushSender> logger
) : IPushSender
{
    private const string TokenUrl = "https://oauth-login.cloud.huawei.com/oauth2/v3/token";
    private const string PushUrl = "https://push-api.cloud.huawei.com/v1/{0}/messages:send";

    private readonly HmsPushOptions _options = options.Value;
    private string? _cachedAccessToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

    public PushPlatform Platform => PushPlatform.HuaweiHMS;

    public async Task SendAsync(
        string deviceToken,
        PushPayload payload,
        CancellationToken ct = default
    )
    {
        if (string.IsNullOrWhiteSpace(_options.AppId))
        {
            logger.LogDebug(
                "HMS not configured — skipping push for token {Token}",
                Mask(deviceToken)
            );
            return;
        }

        var accessToken = await GetAccessTokenAsync(ct);
        var url = string.Format(PushUrl, _options.AppId);

        var body = new
        {
            message = new
            {
                token = new[] { deviceToken },
                notification = new { title = payload.Title, body = payload.Body },
                data = payload.NotificationType is not null
                    ? JsonSerializer.Serialize(new { notificationType = payload.NotificationType })
                    : null,
            },
        };

        var client = httpClientFactory.CreateClient("HmsPush");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            accessToken
        );

        try
        {
            var response = await client.PostAsJsonAsync(url, body, ct);
            response.EnsureSuccessStatusCode();
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "HMS Push delivery failed for token {Token}", Mask(deviceToken));
        }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken ct)
    {
        if (_cachedAccessToken is not null && clock.Now() < _tokenExpiry)
            return _cachedAccessToken;

        var client = httpClientFactory.CreateClient("HmsPush");
        using var content = new FormUrlEncodedContent(
            new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("client_id", _options.AppId ?? string.Empty),
                new KeyValuePair<string, string>(
                    "client_secret",
                    _options.AppSecret ?? string.Empty
                ),
            }
        );

        var response = await client.PostAsync(TokenUrl, content, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<HmsTokenResponse>(
            cancellationToken: ct
        );
        _cachedAccessToken = result!.AccessToken;
        _tokenExpiry = clock.Now().AddSeconds(result.ExpiresIn - 60);
        return _cachedAccessToken;
    }

    private static string Mask(string token) =>
        token.Length > 8 ? $"{token[..4]}…{token[^4..]}" : "****";
}
