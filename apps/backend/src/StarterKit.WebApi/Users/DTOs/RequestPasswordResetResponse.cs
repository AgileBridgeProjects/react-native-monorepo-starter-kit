namespace StarterKit.WebApi.Users.DTOs;

/// <summary>
/// Returned by the password-reset/request endpoint in development only.
/// Contains the raw reset link so developers can test the full flow without a live email provider.
/// TODO: Remove once Resend is configured and the dev fallback is no longer needed.
/// </summary>
public sealed class RequestPasswordResetResponse
{
    /// <summary>The full reset URL to open in a browser. Only populated in development.</summary>
    public string ResetLink { get; init; } = string.Empty;
}
