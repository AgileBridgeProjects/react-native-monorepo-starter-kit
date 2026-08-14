using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Core.Interfaces.Services;

/// <summary>
/// Sends account setup emails to newly provisioned Credentials users.
/// The implementation is environment-specific:
/// - dev / test: logs the setup link via Serilog (no real email sent).
/// - production: delivers via Resend.
/// </summary>
public interface ISetupEmailService
{
    /// <summary>
    /// Sends (or logs) the one-time account setup link to the user.
    /// </summary>
    /// <param name="email">Recipient email address.</param>
    /// <param name="displayName">User's display name for personalisation.</param>
    /// <param name="setupLink">Full HTTPS URL including the plaintext setup token.</param>
    /// <param name="tokenExpiryHours">Token lifetime in hours (for display in the email body).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task SendSetupLinkAsync(
        string email,
        string displayName,
        string setupLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Sends (or logs) the self-service password reset link to the user.
    /// </summary>
    /// <param name="email">Recipient email address.</param>
    /// <param name="displayName">User's display name for personalisation.</param>
    /// <param name="resetLink">Full HTTPS URL including the plaintext setup token.</param>
    /// <param name="tokenExpiryHours">Token lifetime in hours (for display in the email body).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task SendPasswordResetLinkAsync(
        string email,
        string displayName,
        string resetLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Notifies an OAuth-authenticated user (Google, Microsoft) that they must reset
    /// their password through their identity provider, not through StarterKit.
    /// </summary>
    Task SendOAuthProviderResetNotificationAsync(
        string email,
        string displayName,
        AuthenticationMethod provider,
        CancellationToken cancellationToken
    );
}
