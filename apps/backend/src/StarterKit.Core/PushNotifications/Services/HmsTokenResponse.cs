using System.Text.Json.Serialization;

namespace StarterKit.Core.PushNotifications.Services;

internal sealed class HmsTokenResponse
{
    [JsonPropertyName("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [JsonPropertyName("expires_in")]
    public int ExpiresIn { get; set; }
}
