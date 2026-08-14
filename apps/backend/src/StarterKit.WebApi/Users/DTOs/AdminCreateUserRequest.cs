using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Users;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class AdminCreateUserRequest : IValidatableObject
{
    public Guid ClubId { get; init; }

    /// <summary>Role name to assign (e.g. "Employee", "ClubAdmin").</summary>
    public string RoleName { get; init; } = string.Empty;

    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;

    /// <summary>Authentication method used by the club. Determines whether Firebase provisioning occurs.</summary>
    public AuthenticationMethod AuthMethod { get; init; }

    /// <summary>Required when AuthMethod is Credentials. Must be provided if PhoneNumber is not.</summary>
    public string? Email { get; init; }

    /// <summary>Required when AuthMethod is PhoneOtp.</summary>
    public string? PhoneNumber { get; init; }

    /// <summary>Required when AuthMethod is CustomAuthentication.</summary>
    public string? Username { get; init; }

    /// <summary>Password supplied by the admin for CustomAuthentication users.</summary>
    public string? Password { get; init; }

    /// <summary>Date of birth. Required when RoleName is "Athlete".</summary>
    public DateOnly? DateOfBirth { get; init; }

    /// <summary>Optional volleyball playing position. Athlete users.</summary>
    public PlayingPosition? Position { get; init; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    [Range(JerseyNumberConstraints.Min, JerseyNumberConstraints.Max)]
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Teams to link this user to via the many-to-many <c>UserTeam</c> join — the sole source of
    /// truth for team membership.
    /// </summary>
    public IReadOnlyList<Guid>? TeamIds { get; init; }

    /// <summary>
    /// Athlete user IDs to link as dependents of this user via <c>UserGuardian</c>.
    /// Only meaningful when RoleName is "Parent".
    /// </summary>
    public IReadOnlyList<Guid>? DependentUserIds { get; init; }

    /// <summary>
    /// Email of this Athlete's Parent/Guardian, resolved to a <c>UserGuardian</c> link on create.
    /// Must match an existing "Parent" user in the same club. Only meaningful when RoleName is "Athlete".
    /// </summary>
    [MaxLength(254)]
    public string? ParentGuardianEmail { get; init; }

    /// <summary>
    /// Enforces <see cref="ParentLinkRule"/> — a new Parent needs at least one linked Athlete
    /// — and <see cref="CoachTeamLinkRule"/> — a new Coach needs at least one linked
    /// Team.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ParentLinkRule.IsParent(RoleName) && DependentUserIds is not { Count: > 0 })
            yield return ParentLinkRule.MissingLinkedAthlete(nameof(DependentUserIds));

        if (CoachTeamLinkRule.IsCoach(RoleName) && TeamIds is not { Count: > 0 })
            yield return CoachTeamLinkRule.MissingLinkedTeam(nameof(TeamIds));
    }
}
