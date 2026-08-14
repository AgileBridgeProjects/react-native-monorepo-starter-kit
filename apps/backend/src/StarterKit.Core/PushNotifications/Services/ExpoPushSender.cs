using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Core.PushNotifications.Options;
using StarterKit.Data.DeviceTokens.Enums;

namespace StarterKit.Core.PushNotifications.Services;

/// <summary>
/// Delivers push notifications through the Expo Push API. Handles both iOS and Android Expo
/// push tokens (<c>ExponentPushToken[...]</c>); Huawei devices are served by <see cref="HmsPushSender"/>.
/// Replaces the Firebase FCM sender — the backend no longer depends on the Firebase SDK.
/// </summary>
internal sealed class ExpoPushSender : IPushSender
{
    private const string ExpoPushEndpoint = "https://exp.host/--/api/v2/push/send";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ExpoPushOptions _options;
    private readonly ILogger<ExpoPushSender> _logger;

    // Registered for iOS; PushNotificationsService falls back to this sender for Android too,
    // so a single Expo sender covers both platforms.
    public PushPlatform Platform => PushPlatform.iOS;

    public ExpoPushSender(
        IHttpClientFactory httpClientFactory,
        IOptions<ExpoPushOptions> options,
        ILogger<ExpoPushSender> logger
    )
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(
        string deviceToken,
        PushPayload payload,
        CancellationToken ct = default
    )
    {
        var client = _httpClientFactory.CreateClient("ExpoPush");

        using var request = new HttpRequestMessage(HttpMethod.Post, ExpoPushEndpoint)
        {
            Content = JsonContent.Create(
                new[]
                {
                    new ExpoPushMessage
                    {
                        To = deviceToken,
                        Title = payload.Title,
                        Body = payload.Body,
                        Data = BuildData(payload),
                    },
                }
            ),
        };

        if (!string.IsNullOrWhiteSpace(_options.AccessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Bearer",
                _options.AccessToken
            );

        try
        {
            using var response = await client.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Expo push HTTP {Status} for token {Token}: {Body}",
                    (int)response.StatusCode,
                    Mask(deviceToken),
                    Truncate(body)
                );
                return;
            }

            // Expo returns 200 with a per-message ticket; a "status":"error" means the token is
            // invalid/unregistered (e.g. DeviceNotRegistered) — log so the sweep can prune it.
            if (body.Contains("\"status\":\"error\"", StringComparison.OrdinalIgnoreCase))
                _logger.LogWarning(
                    "Expo push returned an error ticket for token {Token}: {Body}",
                    Mask(deviceToken),
                    Truncate(body)
                );
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(
                ex,
                "Expo push delivery failed for token {Token}",
                Mask(deviceToken)
            );
        }
    }

    /// <summary>
    /// The push data payload: routing metadata only (notification type and the id of its
    /// subject), never media — see the identity split AC 9.8. Null when there is nothing to route on, so
    /// the "data" key is omitted rather than sent empty.
    /// </summary>
    private static Dictionary<string, string>? BuildData(PushPayload payload)
    {
        var data = new Dictionary<string, string>();
        if (payload.NotificationType is not null)
            data["notificationType"] = payload.NotificationType;
        if (payload.EntityId is not null)
            data["entityId"] = payload.EntityId;
        return data.Count > 0 ? data : null;
    }

    private static string Truncate(string s) => s.Length > 300 ? s[..300] : s;

    private static string Mask(string token) =>
        token.Length > 8 ? $"{token[..4]}…{token[^4..]}" : "****";

    private sealed class ExpoPushMessage
    {
        [System.Text.Json.Serialization.JsonPropertyName("to")]
        public required string To { get; init; }

        [System.Text.Json.Serialization.JsonPropertyName("title")]
        public required string Title { get; init; }

        [System.Text.Json.Serialization.JsonPropertyName("body")]
        public required string Body { get; init; }

        [System.Text.Json.Serialization.JsonPropertyName("data")]
        public Dictionary<string, string>? Data { get; init; }
    }
}
