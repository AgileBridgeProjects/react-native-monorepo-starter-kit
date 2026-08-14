using StarterKit.Data.Auditing;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Data.Persistence.Entities;

/// <summary>
/// Auth system user record. Excluded from the AuditLog interceptor to avoid bootstrap
/// ordering issues with the auth pipeline.
/// </summary>
[ExcludeFromAuditLog]
public class UserEntity : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }
    public string ExternalAuthId { get; set; } = string.Empty;
    public Guid ClubId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }

    /// <summary>Username for CustomAuthentication users (no email or phone). Null for all other auth methods.</summary>
    public string? Username { get; set; }
    public AuthenticationMethod AuthMethod { get; set; } = AuthenticationMethod.Credentials;
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Blob-stored path for the user's profile avatar image (e.g. <c>user-avatars/{id}</c>).
    /// Resolve to a SAS URL at read time via <c>IBlobStorageService.ResolveStoredPathAsync</c>.
    /// </summary>
    public string? AvatarUrl { get; set; }

    /// <summary>
    /// Operational toggle — false means the account is suspended/disabled but not deleted.
    /// This is distinct from <see cref="ISoftDeletable.IsDeleted"/>.
    /// </summary>
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Updated on every authenticated request via UpdateLastActiveMiddleware.
    /// Used by the push notification sweep job to suppress pushes for active users.
    /// </summary>
    public DateTime LastActiveAt { get; set; } = DateTime.UtcNow;

    /// <summary>Date of birth. Primarily used for Athlete users.</summary>
    public DateOnly? DateOfBirth { get; set; }

    /// <summary>Optional volleyball playing position, for Athlete users.</summary>
    public PlayingPosition? Position { get; set; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    public int? JerseyNumber { get; set; }

    /// <summary>
    /// Blob-stored path for the athlete's full-body onboarding photo. Distinct from
    /// <see cref="AvatarUrl"/>. Resolve to a SAS URL at read time.
    /// </summary>
    public string? FullBodyPhotoUrl { get; set; }

    /// <summary>
    /// Blob-stored path for the athlete's face onboarding photo. Distinct from
    /// <see cref="AvatarUrl"/>. Resolve to a SAS URL at read time.
    /// </summary>
    public string? FacePhotoUrl { get; set; }

    /// <summary>Timestamp when the athlete completed the mobile onboarding wizard.</summary>
    public DateTime? OnboardingCompletedAt { get; set; }

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }

    public Club Club { get; set; } = null!;
    public ICollection<UserRoleAssignmentEntity> UserRoles { get; set; } =
        new List<UserRoleAssignmentEntity>();

    /// <summary>Many-to-many team memberships — the sole source of truth for user-team membership.</summary>
    public ICollection<UserTeam> UserTeams { get; set; } = new List<UserTeam>();

    /// <summary>Guardian links where this user is the guardian (parent) side.</summary>
    public ICollection<UserGuardianEntity> Dependents { get; set; } =
        new List<UserGuardianEntity>();

    /// <summary>Guardian links where this user is the dependent (athlete) side.</summary>
    public ICollection<UserGuardianEntity> Guardians { get; set; } = new List<UserGuardianEntity>();
}
