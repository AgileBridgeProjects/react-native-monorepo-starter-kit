using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class UpdateUserStatusRequest
{
    /// <summary>When <c>true</c> the user is active; <c>false</c> suspends the account.</summary>
    [Required]
    public required bool? IsActive { get; init; }
}
