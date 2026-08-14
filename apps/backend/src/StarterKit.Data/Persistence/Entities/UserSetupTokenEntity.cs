using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Auditing;

namespace StarterKit.Data.Persistence.Entities;

/// <summary>
/// One-time account-setup token issued to a Credentials user on admin provisioning.
/// Stores the SHA-256 hash of the plaintext token (never the plaintext itself)
/// and a BCrypt hash of the auto-generated temporary password (for reuse prevention).
/// </summary>
[ExcludeFromAuditLog]
public class UserSetupTokenEntity
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    /// <summary>
    /// SHA-256 hash (hex-encoded) of the plaintext setup token sent in the email link.
    /// Used for lookup; the plaintext token is never persisted.
    /// </summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt hash of the auto-generated temporary password.
    /// Used only to detect and reject password reuse on setup completion.
    /// The plaintext temporary password is discarded after hashing.
    /// </summary>
    public string TempPasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Discriminates between account-setup and password-reset tokens.
    /// Defaults to <see cref="SetupTokenPurpose.AccountSetup"/> for backwards compatibility.
    /// </summary>
    public SetupTokenPurpose Purpose { get; set; } = SetupTokenPurpose.AccountSetup;

    /// <summary>Token becomes invalid after this UTC timestamp (24-hour window).</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Set to UTC now when the user successfully completes setup. Null = not used.</summary>
    public DateTime? UsedAt { get; set; }

    /// <summary>
    /// True when this token was superseded by a resend operation.
    /// Invalidated tokens cannot be used even if they have not expired.
    /// </summary>
    public bool IsInvalidated { get; set; }

    public DateTime CreatedAt { get; set; }

    public UserEntity User { get; set; } = null!;
}
