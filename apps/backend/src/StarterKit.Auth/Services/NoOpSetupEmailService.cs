using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Auth.Services;

// Real email delivery is implemented. This class remains as the dev/test fallback.
// Set Email:Enabled = true in environment config with Key Vault secrets to switch to real delivery.

/// <summary>
/// Setup email service used when email delivery is disabled (local dev, integration tests).
/// Silently suppresses email dispatch — the setup link is returned to the caller via HTTP response.
/// </summary>
internal sealed class NoOpSetupEmailService : ISetupEmailService
{
    public Task SendSetupLinkAsync(
        string email,
        string displayName,
        string setupLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    ) => Task.CompletedTask;

    public Task SendPasswordResetLinkAsync(
        string email,
        string displayName,
        string resetLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    ) => Task.CompletedTask;

    public Task SendOAuthProviderResetNotificationAsync(
        string email,
        string displayName,
        AuthenticationMethod provider,
        CancellationToken cancellationToken
    ) => Task.CompletedTask;
}
