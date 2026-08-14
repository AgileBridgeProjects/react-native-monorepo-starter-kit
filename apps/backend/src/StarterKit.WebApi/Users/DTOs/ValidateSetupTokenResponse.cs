using StarterKit.Data.AccountSetup.Enums;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class ValidateSetupTokenResponse
{
    /// <summary>The user's email address, for pre-filling the setup form.</summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>Discriminates account-setup from password-reset so the frontend shows context-appropriate copy.</summary>
    public SetupTokenPurpose Purpose { get; init; } = SetupTokenPurpose.AccountSetup;
}
