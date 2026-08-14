using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Roles.DTOs;

/// <summary>
/// Shared properties for creating and updating a role.
/// </summary>
public abstract class RoleRequestBase
{
    [Required]
    [MaxLength(64)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsElevated { get; set; }

    public bool IsPortalRole { get; set; }

    /// <summary>
    /// The club this role belongs to. Null creates a system-wide role.
    /// </summary>
    public Guid? ClubId { get; set; }
}
