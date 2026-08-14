using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

/// <summary>
/// Shared request-validation rule: a Parent must be linked to at least one Athlete.
/// Their mobile onboarding ends on a "set your relationship to each linked athlete" step, which is
/// meaningless with no links.
///
/// Applied by <see cref="AdminCreateUserRequest"/> and <see cref="UpdateUserRequest"/> — the
/// interactive single-user portal paths. Bulk CSV upload deliberately does not use these DTOs:
/// there, Parent↔Athlete links are resolved after the batch from each athlete row's
/// <c>ParentGuardianEmail</c>, so a Parent row legitimately has no dependents at creation time.
/// </summary>
internal static class ParentLinkRule
{
    private const string ParentRoleName = "Parent";

    internal static bool IsParent(string? roleName) =>
        string.Equals(roleName, ParentRoleName, StringComparison.OrdinalIgnoreCase);

    internal static ValidationResult MissingLinkedAthlete(string memberName) =>
        new("A parent must be linked to at least one athlete.", [memberName]);
}
