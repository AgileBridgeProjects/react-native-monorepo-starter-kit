using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Configuration;

/// <summary>
/// Configuration for account-setup email delivery.
/// Bind from "AccountSetup" in appsettings.
/// </summary>
public sealed class AccountSetupOptions
{
    public const string SectionName = "AccountSetup";

    /// <summary>
    /// Base URL of the web portal (e.g. https://yourapp.example.com).
    /// Used to construct the one-time setup link emailed to new portal (admin) Credentials users.
    /// </summary>
    [Required]
    public string PortalBaseUrl { get; init; } = string.Empty;

    /// <summary>
    /// Base URL of the mobile web app (e.g. https://yourapp.example.com).
    /// Used to construct the one-time setup link emailed to employee/trainee Credentials users
    /// who do not have portal access.
    /// </summary>
    [Required]
    public string MobileBaseUrl { get; init; } = string.Empty;

    /// <summary>
    /// Hours until an account-setup token expires (default: 24).
    /// </summary>
    [Range(1, 720)]
    public int TokenExpiryHours { get; init; } = 24;

    /// <summary>
    /// Hours until a password-reset token expires (default: 1).
    /// Shorter than setup tokens because reset links are self-service.
    /// </summary>
    [Range(1, 72)]
    public int PasswordResetExpiryHours { get; init; } = 1;

    /// <summary>
    /// Number of days to retain setup and password-reset tokens after creation (default: 90).
    /// Tokens older than this threshold are hard-deleted by the daily cleanup job.
    /// Documented retention rationale: tokens older than the window are either expired, used,
    /// or invalidated — no legitimate re-use is possible. Hard deletion satisfies the
    /// POPIA/GDPR data minimisation principle. The <c>UserId</c> FK is PII-adjacent but is
    /// retained only within this window to support audit and expiry processing.
    /// </summary>
    [Range(1, 3650)]
    public int TokenRetentionDays { get; init; } = 90;
}
