namespace StarterKit.Core.Notifications.DTOs;

/// <summary>
/// Template data used to render the account setup and password reset email templates.
/// Property names must match the <c>{{Placeholder}}</c> tokens in the embedded HTML template
/// (e.g. <c>{{DisplayName}}</c>, <c>{{Link}}</c>, <c>{{TokenExpiryHours}}</c>).
/// </summary>
public sealed record SetupEmailTemplateData(string DisplayName, string Link, int TokenExpiryHours);
