using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Data.Clubs.Enums;

namespace StarterKit.Auth.Services;

/// <summary>
/// Delivers account setup and password reset emails via the shared <see cref="IEmailSender"/>.
/// Provider-agnostic: retry and logging are handled by the sender, and subjects are set
/// explicitly here (the current provider has no dashboard-configured template subject).
/// Template variables: DisplayName, Link, TokenExpiryHours (setup/reset); DisplayName, ProviderName (OAuth reset).
/// </summary>
internal sealed class SetupEmailService(IEmailSender emailSender) : ISetupEmailService
{
    public Task SendSetupLinkAsync(
        string email,
        string displayName,
        string setupLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    ) =>
        emailSender.SendAsync(
            new EmailPayload(
                Subject: "Set up your StarterKit account",
                TemplateKey: EmailTemplateKeys.AccountSetup,
                TemplateData: new SetupEmailTemplateData(displayName, setupLink, tokenExpiryHours)
            ),
            email,
            cancellationToken
        );

    public Task SendPasswordResetLinkAsync(
        string email,
        string displayName,
        string resetLink,
        int tokenExpiryHours,
        CancellationToken cancellationToken
    ) =>
        emailSender.SendAsync(
            new EmailPayload(
                Subject: "Reset your StarterKit password",
                TemplateKey: EmailTemplateKeys.PasswordReset,
                TemplateData: new SetupEmailTemplateData(displayName, resetLink, tokenExpiryHours)
            ),
            email,
            cancellationToken
        );

    public Task SendOAuthProviderResetNotificationAsync(
        string email,
        string displayName,
        AuthenticationMethod provider,
        CancellationToken cancellationToken
    )
    {
        var providerName = provider == AuthenticationMethod.Microsoft365 ? "Microsoft" : "Google";
        return emailSender.SendAsync(
            new EmailPayload(
                Subject: "Your StarterKit password reset request",
                TemplateKey: EmailTemplateKeys.OAuthProviderReset,
                TemplateData: new OAuthProviderResetEmailTemplateData(displayName, providerName)
            ),
            email,
            cancellationToken
        );
    }
}
