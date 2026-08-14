using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class CompleteSetupRequest
{
    /// <summary>The plaintext setup token from the email link query parameter.</summary>
    [Required]
    public string Token { get; init; } = string.Empty;

    /// <summary>The user's chosen new password. Must meet complexity requirements.</summary>
    [Required]
    public string NewPassword { get; init; } = string.Empty;
}
