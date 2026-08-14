namespace StarterKit.Core.PushNotifications.Options;

/// <summary>
/// Options for delivering push via the Expo Push API (https://exp.host/--/api/v2/push/send).
/// No Firebase/APNs SDK is needed in the backend — Expo brokers FCM (Android) and APNs (iOS).
/// </summary>
public sealed class ExpoPushOptions
{
    public const string SectionName = "ExpoPush";

    /// <summary>
    /// Optional Expo access token. Only required when the Expo project has "Enhanced Security
    /// for Push Notifications" enabled; sent as a Bearer token on send requests.
    /// </summary>
    public string? AccessToken { get; set; }
}
