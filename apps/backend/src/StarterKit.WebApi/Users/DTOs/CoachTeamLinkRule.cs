using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

/// <summary>
/// Shared request-validation rule: a Coach must be linked to at least one Team. Mirrors
/// <see cref="ParentLinkRule"/> — a Coach with no linked teams has nothing to show on the coach
/// onboarding flow's linked-teams step.
///
/// Applied by <see cref="AdminCreateUserRequest"/> and <see cref="UpdateUserRequest"/> — the
/// interactive single-user portal paths. Bulk CSV upload deliberately does not use these DTOs, so
/// this rule does not apply there (same exemption <see cref="ParentLinkRule"/> documents).
/// </summary>
internal static class CoachTeamLinkRule
{
    private const string CoachRoleName = "Coach";

    internal static bool IsCoach(string? roleName) =>
        string.Equals(roleName, CoachRoleName, StringComparison.OrdinalIgnoreCase);

    internal static ValidationResult MissingLinkedTeam(string memberName) =>
        new("A coach must be linked to at least one team.", [memberName]);
}
