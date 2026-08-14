using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Notifications.Options;

/// <summary>
/// Provider-agnostic email settings. The config section name and env vars stay neutral
/// (<c>Email</c> / <c>Email__*</c> / <c>Email--*</c>) so switching the underlying provider
/// never requires renaming configuration. The concrete sender (e.g. <c>ResendEmailSender</c>)
/// is the only place the provider is named.
/// </summary>
public sealed class EmailOptions
{
    public const string SectionName = "Email";

    /// <summary>When false, the NoOpSetupEmailService is used instead (dev/test).</summary>
    public bool Enabled { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string ApiKey { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string FromEmail { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string FromName { get; init; }
}
