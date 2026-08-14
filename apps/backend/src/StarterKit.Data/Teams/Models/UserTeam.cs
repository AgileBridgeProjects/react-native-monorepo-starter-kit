using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Teams.Models;

/// <summary>
/// Many-to-many join between <see cref="UserEntity"/> and <see cref="Team"/>.
/// Distinct from the single nullable <see cref="UserEntity.TeamId"/> FK — a Coach or Athlete
/// can belong to more than one team (e.g. across seasons).
///
/// Linking/unlinking a team assignment is a business event, so this entity is fully
/// auditable — not excluded — like any other domain entity (see docs/standards/backend/auditing.md).
/// </summary>
public class UserTeam : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid TeamId { get; set; }

    public UserEntity User { get; set; } = null!;
    public Team Team { get; set; } = null!;

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
