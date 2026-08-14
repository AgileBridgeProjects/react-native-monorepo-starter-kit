using System.ComponentModel.DataAnnotations;

namespace StarterKit.MobileApi.Users.DTOs;

public sealed class ChangePasswordRequest
{
    /// <summary>The user's chosen new password. Must meet complexity requirements.</summary>
    [Required]
    public string NewPassword { get; init; } = string.Empty;
}
