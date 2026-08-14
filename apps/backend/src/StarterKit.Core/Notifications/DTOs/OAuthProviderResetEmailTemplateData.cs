namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// Template data used to render the OAuth provider reset notification email.
/// Property names must match the <c>{{Placeholder}}</c> tokens in the embedded HTML template
/// (e.g. <c>{{DisplayName}}</c>, <c>{{ProviderName}}</c>).
/// Sent when an OAuth-authenticated user requests a StarterKit password reset —
/// they must reset their password through their identity provider instead.
/// </summary>
public sealed record OAuthProviderResetEmailTemplateData(string DisplayName, string ProviderName);
