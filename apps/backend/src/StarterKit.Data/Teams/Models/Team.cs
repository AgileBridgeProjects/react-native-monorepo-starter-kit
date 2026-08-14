using StarterKit.Data.Auditing;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Enums;

namespace StarterKit.Data.Teams.Models;

public class Team : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid SeasonId { get; set; }
    public Season Season { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    /// <summary>Age group this team competes in. Optional.</summary>
    public AgeGroup? AgeGroup { get; set; }

    /// <summary>
    /// URL to the team logo stored in blob storage. Upload via POST /api/clubs/images
    /// (the shared image upload) to obtain this URL before creating or updating.
    /// </summary>
    public string? LogoUrl { get; set; }

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
