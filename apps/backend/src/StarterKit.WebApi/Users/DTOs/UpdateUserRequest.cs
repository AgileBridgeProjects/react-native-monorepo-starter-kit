using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Users;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class UpdateUserRequest : IValidatableObject
{
    /// <summary>Role name to assign (e.g. "Employee", "ClubAdmin").</summary>
    public string RoleName { get; init; } = string.Empty;

    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;

    /// <summary>Email address. Nullable for phone-only Credentials users.</summary>
    public string? Email { get; init; }

    /// <summary>Phone number. Nullable for email-only or SSO users.</summary>
    public string? PhoneNumber { get; init; }

    /// <summary>
    /// When provided and different from the user's current auth method, triggers Firebase
    /// re-provisioning: revokes the old session, deletes the old Firebase user, and creates a
    /// new one under the new method. The user will be signed out immediately.
    /// </summary>
    public AuthenticationMethod? NewAuthMethod { get; init; }

    /// <summary>Required when <see cref="NewAuthMethod"/> is <c>CustomAuthentication</c>.</summary>
    public string? Username { get; init; }

    /// <summary>Required when <see cref="NewAuthMethod"/> is <c>CustomAuthentication</c>.</summary>
    public string? Password { get; init; }

    /// <summary>Date of birth. Required when RoleName is "Athlete".</summary>
    public DateOnly? DateOfBirth { get; init; }

    /// <summary>Optional volleyball playing position. Athlete users.</summary>
    public PlayingPosition? Position { get; init; }

    /// <summary>Optional jersey number. Athlete users.</summary>
    [Range(JerseyNumberConstraints.Min, JerseyNumberConstraints.Max)]
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Replaces the exact set of teams this user is linked to via the many-to-many
    /// <c>UserTeam</c> join. Null leaves the current set unchanged; an empty list clears all teams.
    /// </summary>
    public IReadOnlyList<Guid>? TeamIds { get; init; }

    /// <summary>
    /// Replaces the exact set of dependent Athlete user IDs linked to this user via
    /// <c>UserGuardian</c>. Null leaves the current set unchanged; an empty list clears all
    /// links. Only meaningful when RoleName is "Parent".
    /// </summary>
    public IReadOnlyList<Guid>? DependentUserIds { get; init; }

    /// <summary>
    /// Email of this Athlete's Parent/Guardian, resolved to a new <c>UserGuardian</c> link.
    /// Must match an existing "Parent" user in the same club. Only meaningful when RoleName is
    /// "Athlete".
    /// </summary>
    [MaxLength(254)]
    public string? ParentGuardianEmail { get; init; }

    /// <summary>
    /// Enforces <see cref="ParentLinkRule"/> on edit: a Parent's links may be replaced but never
    /// cleared. Enforces <see cref="CoachTeamLinkRule"/> the same way: a Coach's teams
    /// may be replaced but never cleared. Null still means "leave unchanged" for both,
    /// so only an explicitly empty list is rejected.
    /// </summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (ParentLinkRule.IsParent(RoleName) && DependentUserIds is { Count: 0 })
            yield return ParentLinkRule.MissingLinkedAthlete(nameof(DependentUserIds));

        if (CoachTeamLinkRule.IsCoach(RoleName) && TeamIds is { Count: 0 })
            yield return CoachTeamLinkRule.MissingLinkedTeam(nameof(TeamIds));
    }
}
