namespace StarterKit.Core.Notifications;

/// <summary>
/// Logical template key constants that map to embedded HTML templates under
/// <c>Notifications/Templates/{Key}.html</c>, rendered by <see cref="Services.EmailTemplateRenderer"/>.
/// </summary>
public static class EmailTemplateKeys
{
    public const string AccountSetup = "AccountSetupEmail";
    public const string PasswordReset = "PasswordResetEmail";
    public const string OAuthProviderReset = "OAuthProviderResetEmail";
}
