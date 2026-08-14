namespace StarterKit.Core.Enums;

/// <summary>
/// Describes the account-setup state for a Credentials user who has not yet logged in.
/// </summary>
public enum SetupStatus
{
    /// <summary>Not applicable — user has already activated their account, or is not a Credentials user.</summary>
    None,

    /// <summary>A valid (non-expired, non-used) setup token is outstanding.</summary>
    PendingSetup,

    /// <summary>The setup link expired or was invalidated before the user completed setup.</summary>
    SetupExpired,
}
