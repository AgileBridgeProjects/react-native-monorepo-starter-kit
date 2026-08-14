using System.ComponentModel.DataAnnotations;

namespace StarterKit.MobileApi.Users.DTOs;

public sealed class RequestPasswordResetRequest
{
    /// <summary>The user's email address for password reset.</summary>
    [Required]
    public string Email { get; init; } = string.Empty;
}
