using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class AssignRoleRequest
{
    [Required]
    public string Role { get; init; } = string.Empty;
}
