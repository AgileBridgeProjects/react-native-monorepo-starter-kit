using System.ComponentModel.DataAnnotations;

namespace StarterKit.MobileApi.Support.Options;

public sealed class SupportOptions
{
    public const string SectionName = "Support";

    /// <summary>
    /// The email address to which help/support requests from mobile users are forwarded.
    /// Set via appsettings or Key Vault secret <c>Support--HelpEmail</c>.
    /// </summary>
    [Required]
    [EmailAddress]
    public string HelpEmail { get; init; } = string.Empty;
}
