using System.Text.RegularExpressions;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Auth.Services;

/// <summary>
/// Provisions users in GoTrue via the Admin API. Replaces the Firebase provisioning service.
/// Accounts are created email/phone-confirmed; password setup is driven by the account-setup
/// link flow (or supplied directly for CustomAuthentication).
/// </summary>
internal sealed partial class SupabaseUserProvisioningService(GoTrueAdminClient admin)
    : IAuthUserProvisioningService
{
    public Task<string> CreateUserByEmailAsync(
        string email,
        string displayName,
        AuthenticationMethod authMethod,
        CancellationToken cancellationToken = default
    )
    {
        // For Google/Microsoft365 the federated identity is established on first OAuth sign-in;
        // GoTrue links it to this email-confirmed record when the external provider is enabled.
        // (Configuring those providers in GoTrue is a follow-up — see docs/standards/supabase.md.)
        return admin.CreateUserAsync(
            new CreateUserRequest
            {
                Email = email,
                EmailConfirm = true,
                UserMetadata = new Dictionary<string, object> { ["display_name"] = displayName },
            },
            cancellationToken
        );
    }

    public Task<string> CreateUserByPhoneAsync(
        string phoneNumber,
        string displayName,
        CancellationToken cancellationToken = default
    ) =>
        admin.CreateUserAsync(
            new CreateUserRequest
            {
                Phone = phoneNumber,
                PhoneConfirm = true,
                UserMetadata = new Dictionary<string, object> { ["display_name"] = displayName },
            },
            cancellationToken
        );

    public Task<string> CreateUserByUsernameAsync(
        string username,
        string password,
        string displayName,
        CancellationToken cancellationToken = default
    )
    {
        var isEmail = EmailRegex().IsMatch(username);
        if (string.IsNullOrWhiteSpace(username) || (!isEmail && !UsernameRegex().IsMatch(username)))
            throw new ArgumentException(
                "Username must be a plain username (letters, digits, dots, underscores, hyphens) or a valid email address.",
                nameof(username)
            );

        // GoTrue requires an email. For plain usernames we construct a deterministic synthetic
        // email so the client can reconstruct it for password sign-in (same domain the frontend uses).
        var syntheticEmail = isEmail
            ? username
            : $"{username}{AuthConstants.CustomAuthEmailDomain}";

        return admin.CreateUserAsync(
            new CreateUserRequest
            {
                Email = syntheticEmail,
                Password = password,
                EmailConfirm = true,
                UserMetadata = new Dictionary<string, object> { ["display_name"] = displayName },
            },
            cancellationToken
        );
    }

    public Task DeleteUserAsync(string authUserId, CancellationToken cancellationToken = default) =>
        admin.DeleteUserAsync(authUserId, cancellationToken);

    public Task UpdatePasswordAsync(
        string authUserId,
        string newPassword,
        CancellationToken cancellationToken = default
    ) =>
        admin.UpdateUserAsync(
            authUserId,
            new UpdateUserRequest { Password = newPassword },
            cancellationToken
        );

    [GeneratedRegex(@"^[a-zA-Z0-9._\-]+$")]
    private static partial Regex UsernameRegex();

    /// <summary>Matches a valid email address (local@domain.tld).</summary>
    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailRegex();
}
