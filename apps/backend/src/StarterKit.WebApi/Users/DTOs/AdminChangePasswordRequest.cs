using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class AdminChangePasswordRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(128)]
    public required string NewPassword { get; init; }
}
