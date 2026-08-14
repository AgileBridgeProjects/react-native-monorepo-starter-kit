namespace StarterKit.Data.AccountSetup.Enums;

/// <summary>
/// Discriminates the purpose of a <see cref="StarterKit.Data.Persistence.Entities.UserSetupTokenEntity"/>.
/// </summary>
public enum SetupTokenPurpose
{
    /// <summary>First-time account activation issued by an admin.</summary>
    AccountSetup = 0,

    /// <summary>Self-service password reset requested by the user.</summary>
    PasswordReset = 1,
}
