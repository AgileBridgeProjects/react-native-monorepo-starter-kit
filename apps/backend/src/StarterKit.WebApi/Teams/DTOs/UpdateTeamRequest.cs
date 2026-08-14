using System.ComponentModel.DataAnnotations;
using StarterKit.Data.Teams.Enums;

namespace StarterKit.WebApi.Teams.DTOs;

public sealed class UpdateTeamRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; init; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; init; }

    public AgeGroup? AgeGroup { get; init; }

    /// <summary>URL to the team logo. Obtain by calling POST /api/clubs/images first.</summary>
    [MaxLength(2048)]
    public string? LogoUrl { get; init; }
}
