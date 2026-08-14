using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

/// <summary>Command model for admin-initiated user profile updates.</summary>
public sealed record UpdateUserCommand(
    Guid UserId,
    string RoleName,
    string FirstName,
    string LastName,
    string? Email,
    string? PhoneNumber,
    /// <summary>When set and different from the user's current method, triggers Firebase re-provisioning.</summary>
    AuthenticationMethod? NewAuthMethod = null,
    /// <summary>Required when <see cref="NewAuthMethod"/> is <c>CustomAuthentication</c>.</summary>
    string? Username = null,
    /// <summary>Required when <see cref="NewAuthMethod"/> is <c>CustomAuthentication</c>.</summary>
    string? Password = null,
    /// <summary>Athlete-only.</summary>
    DateOnly? DateOfBirth = null,
    /// <summary>Athlete-only.</summary>
    PlayingPosition? Position = null,
    /// <summary>Athlete-only.</summary>
    int? JerseyNumber = null,
    /// <summary>
    /// Athlete/Coach many-to-many Team Assignment — replaces the exact set of teams
    ///. Null means "leave unchanged"; an empty list clears all teams.
    /// </summary>
    IReadOnlyList<Guid>? TeamIds = null,
    /// <summary>
    /// Parent-only "Linked Athlete(s)" — replaces the exact set of dependents (the identity split edit-mode
    /// parity). Null means "leave unchanged"; an empty list clears all links.
    /// </summary>
    IReadOnlyList<Guid>? DependentUserIds = null,
    /// <summary>Athlete-only — resolves a new Parent/Guardian link by email.</summary>
    string? ParentGuardianEmail = null
);
