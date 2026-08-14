using StarterKit.Core.Enums;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

public class User
{
    public Guid Id { get; set; }
    public string ExternalAuthId { get; set; } = string.Empty;
    public Guid ClubId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }

    /// <summary>Username for CustomAuthentication users. Null for all other auth methods.</summary>
    public string? Username { get; set; }
    public AuthenticationMethod AuthMethod { get; set; } = AuthenticationMethod.Credentials;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Date of birth. Primarily used for Athlete users.</summary>
    public DateOnly? DateOfBirth { get; set; }

    /// <summary>Optional volleyball playing position, for Athlete users.</summary>
    public PlayingPosition? Position { get; set; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    public int? JerseyNumber { get; set; }

    /// <summary>Resolved SAS URL for the athlete's full-body onboarding photo.</summary>
    public string? FullBodyPhotoUrl { get; set; }

    /// <summary>Resolved SAS URL for the athlete's face onboarding photo.</summary>
    public string? FacePhotoUrl { get; set; }

    /// <summary>Timestamp when the athlete completed the mobile onboarding wizard.</summary>
    public DateTime? OnboardingCompletedAt { get; set; }

    /// <summary>
    /// Team membership via <c>UserTeam</c> — the sole source of truth for which team(s)
    /// a user belongs to. Populated on both list and single-user fetches.
    /// </summary>
    public List<Guid> TeamIds { get; set; } = new();

    /// <summary>
    /// Linked Athlete(s) for a Parent user, via <c>UserGuardian</c>. Populated by the
    /// service layer on single-user fetches only; not populated on list queries.
    /// </summary>
    public List<Guid> DependentUserIds { get; set; } = new();

    public List<string> Roles { get; set; } = new();
    public int GamesPlayed { get; set; }
    public int GamesPassed { get; set; }
    public int TotalSessions { get; set; }
    public int TotalAssignedGames { get; set; }

    /// <summary>
    /// True when any of the user's roles has IsPortalRole set — the user may access the admin portal.
    /// </summary>
    public bool HasPortalAccess { get; set; }

    /// <summary>
    /// Name of the user's role that requires mobile onboarding (e.g. "Athlete"), or null if none
    /// of the user's roles do. Each such role has its own onboarding wizard flow in the mobile
    /// app, so the client routes on the role name rather than a plain bool — the app must know
    /// *which* flow to send the user through, not just whether one applies.
    /// </summary>
    public string? OnboardingRole { get; set; }

    /// <summary>
    /// True when this user's identity (ExternalAuthId) is shared across more than one club.
    /// Elevated roles cannot be assigned to shared users.
    /// </summary>
    public bool IsSharedAcrossClubs { get; set; }

    /// <summary>
    /// Account-setup state for Credentials users who have not yet activated.
    /// Populated by the service layer; not persisted on this entity.
    /// </summary>
    public SetupStatus SetupStatus { get; set; } = SetupStatus.None;
}
