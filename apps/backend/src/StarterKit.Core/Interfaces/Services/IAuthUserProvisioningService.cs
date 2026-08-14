using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Core.Interfaces.Services;

/// <summary>
/// Provisions users in the external auth provider (self-hosted Supabase / GoTrue) for
/// admin-created accounts. Provider-neutral: the implementation lives in <c>StarterKit.Auth</c>
/// and calls the GoTrue Admin API with the service-role key.
/// </summary>
public interface IAuthUserProvisioningService
{
    /// <summary>Creates an auth user with an email identity and returns the user id (UUID).
    /// The account is created email-confirmed; the caller drives password setup via the
    /// account-setup link flow.</summary>
    Task<string> CreateUserByEmailAsync(
        string email,
        string displayName,
        AuthenticationMethod authMethod,
        CancellationToken cancellationToken = default
    );

    /// <summary>Creates an auth user with a phone identity and returns the user id (UUID).</summary>
    Task<string> CreateUserByPhoneAsync(
        string phoneNumber,
        string displayName,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates an auth user for CustomAuthentication using a synthetic email derived from the
    /// username, with the supplied password. Returns the user id (UUID).
    /// </summary>
    Task<string> CreateUserByUsernameAsync(
        string username,
        string password,
        string displayName,
        CancellationToken cancellationToken = default
    );

    /// <summary>Deletes an auth user by id. Used for compensating rollback when DB save fails.</summary>
    Task DeleteUserAsync(string authUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets a new password on an existing auth user.
    /// Called on account-setup completion when the user chooses their own password.
    /// </summary>
    Task UpdatePasswordAsync(
        string authUserId,
        string newPassword,
        CancellationToken cancellationToken = default
    );
}
