using StarterKit.Data.Auditing;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Data.Persistence.Entities;

/// <summary>
/// Self-referencing many-to-many link between a Parent (<see cref="GuardianId"/>) and an
/// Athlete (<see cref="DependentId"/>). Both sides are <see cref="UserEntity"/> rows —
/// there is no separate free-text guardian name/email; the guardian's own user record carries those.
///
/// Linking/unlinking a guardian is a business event, so this entity is fully auditable — not
/// excluded — like any other domain entity (see docs/standards/backend/auditing.md).
/// </summary>
public class UserGuardianEntity : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public Guid GuardianId { get; set; }
    public Guid DependentId { get; set; }

    /// <summary>
    /// How the guardian relates to this dependent, chosen by the parent during onboarding
    ///. Null until they complete that step — admins create the link without it.
    /// </summary>
    public GuardianRelationship? Relationship { get; set; }

    public UserEntity Guardian { get; set; } = null!;
    public UserEntity Dependent { get; set; } = null!;

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
