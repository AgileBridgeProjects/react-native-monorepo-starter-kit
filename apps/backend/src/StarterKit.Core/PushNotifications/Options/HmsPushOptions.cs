namespace StarterKit.Core.PushNotifications.Options;

public sealed class HmsPushOptions
{
    public const string SectionName = "Hms";

    public string? AppId { get; set; }
    public string? AppSecret { get; set; }
}
