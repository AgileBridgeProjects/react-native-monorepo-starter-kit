using Riok.Mapperly.Abstractions;
using StarterKit.Core.Models;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Core.Auth.Mappers;

[Mapper]
public static partial class UserMapper
{
    [MapProperty(nameof(UserEntity.UserRoles), nameof(User.Roles))]
    [MapProperty(
        nameof(UserEntity.UserRoles),
        nameof(User.HasPortalAccess),
        Use = nameof(MapToHasPortalAccess)
    )]
    [MapProperty(
        nameof(UserEntity.UserRoles),
        nameof(User.OnboardingRole),
        Use = nameof(MapToOnboardingRole)
    )]
    [MapProperty(nameof(UserEntity.UserTeams), nameof(User.TeamIds), Use = nameof(MapToTeamIds))]
    [MapperIgnoreTarget(nameof(User.IsSharedAcrossClubs))]
    public static partial User ToModel(this UserEntity entity);

    private static List<string> MapToListOfString(
        ICollection<UserRoleAssignmentEntity> userRoles
    ) => userRoles.Select(ur => ur.Role.Name).ToList();

    private static bool MapToHasPortalAccess(ICollection<UserRoleAssignmentEntity> userRoles) =>
        userRoles.Any(ur => ur.Role.IsPortalRole);

    /// <summary>
    /// Name of the user's role that requires mobile onboarding (e.g. "Athlete"), or null if none
    /// of the user's roles do. Each onboarding-requiring role maps to its own wizard flow in the
    /// mobile app, so the role name — not just a bool — is what the client needs to know which
    /// flow to route into (the identity split built the Athlete flow; Coach/Parent/Director are separate,
    /// not-yet-built flows keyed the same way).
    /// </summary>
    private static string? MapToOnboardingRole(ICollection<UserRoleAssignmentEntity> userRoles) =>
        userRoles.FirstOrDefault(ur => ur.Role.RequiresOnboarding)?.Role.Name;

    /// <summary>
    /// Team membership — read from the eagerly-loaded <c>UserTeams</c> navigation, the
    /// same way <see cref="User.Roles"/> is read from <c>UserRoles</c>. Repository methods that
    /// project a full user therefore include both; one that includes neither yields empty lists.
    ///
    /// Ordered by join date so "the user's first team" (the auth <c>internal_team_id</c> claim, the
    /// mobile stats-import team, the single-team columns in the admin grid) is stable across
    /// requests rather than whatever order the database happened to return.
    /// </summary>
    private static List<Guid> MapToTeamIds(ICollection<UserTeam> userTeams) =>
        userTeams.OrderBy(ut => ut.CreatedAt).ThenBy(ut => ut.Id).Select(ut => ut.TeamId).ToList();

    public static Role ToModel(this RoleEntity entity) =>
        new()
        {
            Id = entity.Id,
            Name = entity.Name,
            Description = entity.Description,
            IsActive = entity.IsActive,
            IsElevated = entity.IsElevated,
            IsPortalRole = entity.IsPortalRole,
            IsSystem = entity.IsSystem,
            IsDefault = entity.IsDefault,
            RequiresOnboarding = entity.RequiresOnboarding,
            ClubId = entity.ClubId,
            Permissions = [.. entity.RolePermissions.Select(rp => rp.Permission)],
        };
}
