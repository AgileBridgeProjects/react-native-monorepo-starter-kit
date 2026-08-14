using StarterKit.Core.Enums;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class UserResponse
{
    public Guid Id { get; init; }
    public Guid ClubId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }

    /// <summary>Username for CustomAuthentication users. Null for all other auth methods.</summary>
    public string? Username { get; init; }
    public AuthenticationMethod AuthMethod { get; init; } = AuthenticationMethod.Credentials;
    public string DisplayName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? LastLoginAt { get; init; }

    /// <summary>Date of birth. Primarily used for Athlete users.</summary>
    public DateOnly? DateOfBirth { get; init; }

    /// <summary>Optional volleyball playing position. Athlete users.</summary>
    public PlayingPosition? Position { get; init; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Team membership via <c>UserTeam</c> — the sole source of truth for which
    /// team(s) a user belongs to. Populated on both list and single-user fetches.
    /// </summary>
    public IReadOnlyList<Guid> TeamIds { get; init; } = [];

    /// <summary>
    /// Linked Athlete(s) for a Parent user, via <c>UserGuardian</c>. Only populated on
    /// single-user fetches (edit drawer), not list rows.
    /// </summary>
    public IReadOnlyList<Guid> DependentUserIds { get; init; } = [];

    public IReadOnlyList<string> Roles { get; init; } = [];

    /// <summary>
    /// True when this user's identity is shared across more than one club.
    /// The role field is restricted to non-admin roles for such users.
    /// </summary>
    public bool IsSharedAcrossClubs { get; init; }

    /// <summary>
    /// Account-setup state. Only relevant for Credentials users who have not yet logged in.
    /// </summary>
    public SetupStatus SetupStatus { get; init; } = SetupStatus.None;

    /// <summary>
    /// The setup link for the user. Only populated when creating a Credentials user
    /// or when resending a setup link.
    /// </summary>
    public string? SetupLink { get; set; }
}
