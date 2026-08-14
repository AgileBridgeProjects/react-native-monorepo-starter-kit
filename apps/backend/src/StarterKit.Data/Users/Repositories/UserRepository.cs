using Microsoft.EntityFrameworkCore;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Interfaces.Repositories;
using StarterKit.Data.Users.Models;

namespace StarterKit.Data.Users.Repositories;

internal sealed class UserRepository(AppDbContext db, TimeProvider clock) : IUserRepository
{
    public async Task<(IReadOnlyList<UserEntity> Items, int TotalCount)> ListAsync(
        UserFilter filter,
        CancellationToken cancellationToken
    )
    {
        var now = clock.Now();
        var q = db
            .Users.AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .AsQueryable()
            .WhereIf(filter.ClubId.HasValue, u => u.ClubId == filter.ClubId!.Value)
            .WhereIf(
                filter.TeamId.HasValue,
                u => u.UserTeams.Any(ut => ut.TeamId == filter.TeamId!.Value)
            )
            .WhereIf(
                filter.TeamIds is { Count: > 0 },
                u => u.UserTeams.Any(ut => filter.TeamIds!.Contains(ut.TeamId))
            )
            .WhereIf(
                !string.IsNullOrWhiteSpace(filter.FilterText),
                u =>
                    u.Email.Contains(filter.FilterText!)
                    || u.DisplayName.Contains(filter.FilterText!)
            )
            .WhereIf(filter.AuthMethod.HasValue, u => u.AuthMethod == filter.AuthMethod!.Value)
            .WhereIf(filter.IsActive.HasValue, u => u.IsActive == filter.IsActive!.Value)
            .WhereIf(
                !string.IsNullOrWhiteSpace(filter.RoleName),
                u => u.UserRoles.Any(ur => ur.Role.Name == filter.RoleName!)
            )
            .WhereIf(
                filter.HasPendingSetup == true,
                u =>
                    db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                        && !t.IsInvalidated
                        && t.ExpiresAt > now
                    )
            )
            .WhereIf(
                filter.HasExpiredSetup == true,
                u =>
                    db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                    )
                    && !db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                        && !t.IsInvalidated
                        && t.ExpiresAt > now
                    )
            );

        var totalCount = await q.CountAsync(cancellationToken);

        var items = await ApplyUserSorting(q, filter.SortBy, filter.SortDescending)
            .ApplyPaging(filter.Page, filter.PageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount);
    }

    public async Task<IReadOnlyList<UserEntity>> ListForExportAsync(
        UserFilter filter,
        CancellationToken cancellationToken
    )
    {
        var now = clock.Now();
        var q = db
            .Users.AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .AsQueryable()
            .WhereIf(filter.ClubId.HasValue, u => u.ClubId == filter.ClubId!.Value)
            .WhereIf(
                filter.TeamId.HasValue,
                u => u.UserTeams.Any(ut => ut.TeamId == filter.TeamId!.Value)
            )
            .WhereIf(
                filter.TeamIds is { Count: > 0 },
                u => u.UserTeams.Any(ut => filter.TeamIds!.Contains(ut.TeamId))
            )
            .WhereIf(
                !string.IsNullOrWhiteSpace(filter.FilterText),
                u =>
                    u.Email.Contains(filter.FilterText!)
                    || u.DisplayName.Contains(filter.FilterText!)
            )
            .WhereIf(filter.AuthMethod.HasValue, u => u.AuthMethod == filter.AuthMethod!.Value)
            .WhereIf(filter.IsActive.HasValue, u => u.IsActive == filter.IsActive!.Value)
            .WhereIf(
                !string.IsNullOrWhiteSpace(filter.RoleName),
                u => u.UserRoles.Any(ur => ur.Role.Name == filter.RoleName!)
            )
            .WhereIf(
                filter.HasPendingSetup == true,
                u =>
                    db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                        && !t.IsInvalidated
                        && t.ExpiresAt > now
                    )
            )
            .WhereIf(
                filter.HasExpiredSetup == true,
                u =>
                    db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                    )
                    && !db.UserSetupTokens.Any(t =>
                        t.UserId == u.Id
                        && t.Purpose == SetupTokenPurpose.AccountSetup
                        && t.UsedAt == null
                        && !t.IsInvalidated
                        && t.ExpiresAt > now
                    )
            );

        return await ApplyUserSorting(q, filter.SortBy, filter.SortDescending)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Applies sorting to a user query. Handles "role" and "team" as special cases
    /// (navigation-property sorts) before delegating to the generic reflection-based helper.
    /// </summary>
    private static IOrderedQueryable<UserEntity> ApplyUserSorting(
        IQueryable<UserEntity> query,
        string? sortBy,
        bool sortDescending
    )
    {
        // Every branch ends with a .ThenBy(Id) tiebreaker — without one, rows sharing a sort
        // value can swap pages between requests (non-deterministic paging).
        if (string.Equals(sortBy, "role", StringComparison.OrdinalIgnoreCase))
        {
            return (
                sortDescending
                    ? query.OrderByDescending(u =>
                        u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault()
                    )
                    : query.OrderBy(u => u.UserRoles.Select(ur => ur.Role.Name).FirstOrDefault())
            ).ThenBy(u => u.Id);
        }

        if (string.Equals(sortBy, "team", StringComparison.OrdinalIgnoreCase))
        {
            return (
                sortDescending
                    ? query.OrderByDescending(u =>
                        u.UserTeams.OrderBy(ut => ut.Team.Name)
                            .Select(ut => ut.Team.Name)
                            .FirstOrDefault()
                    )
                    : query.OrderBy(u =>
                        u.UserTeams.OrderBy(ut => ut.Team.Name)
                            .Select(ut => ut.Team.Name)
                            .FirstOrDefault()
                    )
            ).ThenBy(u => u.Id);
        }

        return query
            .ApplySorting(sortBy, sortDescending, defaultSort: "DisplayName")
            .ThenBy(u => u.Id);
    }

    public Task<UserEntity?> FindByIdAsync(Guid id, CancellationToken cancellationToken) =>
        db
            .Users.AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted, cancellationToken);

    public Task<UserEntity?> FindByIdWithRolesAsync(Guid id, CancellationToken cancellationToken) =>
        db
            .Users.Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<UserEntity?> FindByIdWithRolesAcrossTenantsAsync(
        Guid id,
        CancellationToken cancellationToken
    ) =>
        // Multi-org link: the target user lives in a different tenant from the calling admin,
        // so the tenant filter must be bypassed. Tracking is enabled because callers may
        // mutate the entity (e.g. linking creates a sibling record) and persist via SaveChanges.
        // Keep soft-delete enforcement so deleted users cannot be re-linked.
        db
            .Users.IgnoreQueryFilters()
            .Where(u => !u.IsDeleted)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public Task<UserEntity?> FindByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken
    ) =>
        db
            .Users.IgnoreQueryFilters()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(
                u => u.ExternalAuthId == externalAuthId && !u.IsDeleted,
                cancellationToken
            );

    // Cross-tenant lookup: the org-switch flow needs to find a user's record in a *different*
    // club than the one carried on their token. IgnoreQueryFilters() bypasses ALL global
    // query filters — both the multitenancy filter AND the soft-delete filter. The explicit
    // !u.IsDeleted predicate restores the soft-delete contract that the filter would otherwise
    // enforce, so deleted users are never returned even without the filter.
    public Task<UserEntity?> FindByExternalAuthIdAndClubAsync(
        string externalAuthId,
        Guid clubId,
        CancellationToken cancellationToken
    ) =>
        db
            .Users.IgnoreQueryFilters()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(
                u => u.ExternalAuthId == externalAuthId && u.ClubId == clubId && !u.IsDeleted,
                cancellationToken
            );

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken) =>
        db.Users.AnyAsync(u => u.Id == id, cancellationToken);

    public async Task<UserEntity> CreateAsync(
        UserEntity entity,
        CancellationToken cancellationToken
    )
    {
        await db.Users.AddAsync(entity, cancellationToken);
        return entity;
    }

    public async Task UpdateLastLoginAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Use ExecuteUpdateAsync to bypass EF Core change tracking and rowversion checks.
        // LastLoginAt is a best-effort field; tracking it through the change tracker
        // leaves a Modified entity in the shared DbContext scope that causes
        // DbUpdateConcurrencyException on subsequent SaveChangesAsync calls (e.g. from
        // QuestionRepository) if a concurrent request updated the User row in between.
        await db
            .Users.Where(u => u.Id == userId && !u.IsDeleted)
            .ExecuteUpdateAsync(
                s => s.SetProperty(u => u.LastLoginAt, clock.Now()),
                cancellationToken
            );
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);

    public async Task SetActiveAsync(
        Guid userId,
        bool isActive,
        CancellationToken cancellationToken
    )
    {
        var entity =
            await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new EntityNotFoundException(nameof(UserEntity), userId);

        entity.IsActive = isActive;
    }

    public Task<UserEntity?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        db
            .Users.IgnoreQueryFilters()
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

    public Task<UserEntity?> FindByPhoneAsync(
        string phoneNumber,
        CancellationToken cancellationToken
    ) =>
        // Cross-tenant lookup so admin-create can detect a phone collision in any club
        // and offer the multi-org link flow (mirrors FindByEmailAsync above).
        db
            .Users.IgnoreQueryFilters()
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.UserTeams.Where(ut => !ut.IsDeleted))
            .FirstOrDefaultAsync(
                u => u.PhoneNumber == phoneNumber && !u.IsDeleted,
                cancellationToken
            );

    public Task<UserEntity?> FindByUsernameAsync(
        string username,
        CancellationToken cancellationToken
    ) =>
        db
            .Users.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Username == username && !u.IsDeleted, cancellationToken);

    public Task<int> CountActiveByClubAsync(Guid clubId, CancellationToken cancellationToken) =>
        db.Users.CountAsync(u => u.ClubId == clubId && u.IsActive, cancellationToken);

    public async Task UpdateExternalAuthIdAsync(
        Guid userId,
        string externalAuthId,
        CancellationToken cancellationToken
    )
    {
        var entity =
            await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new EntityNotFoundException(nameof(UserEntity), userId);

        entity.ExternalAuthId = externalAuthId;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken)
    {
        var entity =
            await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new EntityNotFoundException(nameof(UserEntity), userId);

        // AuditInterceptor converts Remove() into a soft delete (IsDeleted + DeletedAt).
        db.Users.Remove(entity);
    }

    public async Task<bool> IsSharedAcrossClubsAsync(
        Guid userId,
        CancellationToken cancellationToken
    )
    {
        var externalAuthId = await db
            .Users.IgnoreQueryFilters()
            .Where(u => u.Id == userId && !u.IsDeleted)
            .Select(u => u.ExternalAuthId)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrEmpty(externalAuthId))
            return false;

        return await db
            .Users.IgnoreQueryFilters()
            .AnyAsync(
                u => u.ExternalAuthId == externalAuthId && u.Id != userId && !u.IsDeleted,
                cancellationToken
            );
    }

    public async Task<IReadOnlySet<string>> GetSharedExternalAuthIdsAsync(
        IEnumerable<string> externalAuthIds,
        CancellationToken cancellationToken
    )
    {
        var authIdList = externalAuthIds.Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();

        if (authIdList.Count == 0)
            return new HashSet<string>();

        // Group by ExternalAuthId and return those that appear in more than one club
        var shared = await db
            .Users.IgnoreQueryFilters()
            .Where(u => authIdList.Contains(u.ExternalAuthId) && !u.IsDeleted)
            .GroupBy(u => u.ExternalAuthId)
            .Where(g => g.Select(u => u.ClubId).Distinct().Count() > 1)
            .Select(g => g.Key)
            .ToListAsync(cancellationToken);

        return shared.ToHashSet();
    }

    public async Task<IReadOnlyList<Guid>> ListActiveUserIdsByTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u => u.UserTeams.Any(ut => ut.TeamId == teamId) && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UserEntity>> ListAthletesByTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u =>
                u.IsActive
                && u.UserTeams.Any(ut => ut.TeamId == teamId)
                && u.UserRoles.Any(ur => ur.Role.Name == "Athlete")
            )
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<AthleteTeamMembership>> ListAthletesByTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await db
            .UserTeams.AsNoTracking()
            .Where(ut =>
                teamIds.Contains(ut.TeamId)
                && ut.User.IsActive
                && ut.User.UserRoles.Any(ur => ur.Role.Name == "Athlete")
            )
            // Stable order for the Assign Survey screen's multi-team roster: by team, then
            // name within it, so athletes don't reshuffle between refetches and teams don't
            // interleave arbitrarily.
            .OrderBy(ut => ut.Team.Name)
            .ThenBy(ut => ut.User.DisplayName)
            .Select(ut => new AthleteTeamMembership
            {
                Athlete = ut.User,
                TeamId = ut.TeamId,
                TeamName = ut.Team.Name,
            })
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> ListActiveUserIdsByTeamsAsync(
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u => u.UserTeams.Any(ut => teamIds.Contains(ut.TeamId)) && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

    public async Task UpdateAvatarUrlAsync(
        Guid userId,
        string? avatarUrl,
        CancellationToken cancellationToken
    )
    {
        await db
            .Users.Where(u => u.Id == userId && !u.IsDeleted)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.AvatarUrl, avatarUrl), cancellationToken);
    }

    public async Task UpdateDisplayNameAsync(
        Guid userId,
        string displayName,
        CancellationToken cancellationToken
    )
    {
        await db
            .Users.Where(u => u.Id == userId && !u.IsDeleted)
            .ExecuteUpdateAsync(
                s => s.SetProperty(u => u.DisplayName, displayName),
                cancellationToken
            );
    }

    public async Task UpdateAthleteOnboardingProfileAsync(
        Guid userId,
        PlayingPosition? position,
        int? jerseyNumber,
        string? fullBodyPhotoUrl,
        bool removeFullBodyPhoto,
        string? facePhotoUrl,
        bool removeFacePhoto,
        bool completeOnboarding,
        CancellationToken cancellationToken
    )
    {
        var now = clock.Now();

        await db
            .Users.Where(u => u.Id == userId && !u.IsDeleted)
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(u => u.Position, u => position ?? u.Position)
                        .SetProperty(u => u.JerseyNumber, u => jerseyNumber ?? u.JerseyNumber)
                        .SetProperty(
                            u => u.FullBodyPhotoUrl,
                            u =>
                                removeFullBodyPhoto
                                    ? null
                                    : (fullBodyPhotoUrl ?? u.FullBodyPhotoUrl)
                        )
                        .SetProperty(
                            u => u.FacePhotoUrl,
                            u => removeFacePhoto ? null : (facePhotoUrl ?? u.FacePhotoUrl)
                        )
                        .SetProperty(
                            u => u.OnboardingCompletedAt,
                            u =>
                                completeOnboarding && u.OnboardingCompletedAt == null
                                    ? now
                                    : u.OnboardingCompletedAt
                        ),
                cancellationToken
            );
    }

    public async Task<IReadOnlyList<string>> ListActiveEmailsByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await ApplyClubOrTeamFilter(
                db.Users.AsNoTracking().Where(u => u.IsActive),
                clubIds,
                teamIds
            )
            .Where(u => u.Email != null && u.Email != "")
            .Select(u => u.Email)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> ListActivePhonesByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await ApplyClubOrTeamFilter(
                db.Users.AsNoTracking().Where(u => u.IsActive),
                clubIds,
                teamIds
            )
            .Where(u => u.PhoneNumber != null && u.PhoneNumber != "")
            .Select(u => u.PhoneNumber!)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<string>> ListActiveUsernamesByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await ApplyClubOrTeamFilter(
                db.Users.AsNoTracking().Where(u => u.IsActive),
                clubIds,
                teamIds
            )
            .Where(u => u.Username != null && u.Username != "")
            .Select(u => u.Username!)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> ListActiveUserIdsByClubOrTeamAsync(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        CancellationToken cancellationToken
    ) =>
        await ApplyClubOrTeamFilter(
                db.Users.AsNoTracking().Where(u => u.IsActive),
                clubIds,
                teamIds
            )
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

    private static IQueryable<UserEntity> ApplyClubOrTeamFilter(
        IQueryable<UserEntity> query,
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds
    )
    {
        // When both lists are non-empty we OR them so a user matching either group is included.
        // Otherwise WhereIf applies whichever filter is non-empty (or none — caller guards that case).
        if (clubIds.Count > 0 && teamIds.Count > 0)
        {
            return query.Where(u =>
                clubIds.Contains(u.ClubId) || u.UserTeams.Any(ut => teamIds.Contains(ut.TeamId))
            );
        }

        return query
            .WhereIf(clubIds.Count > 0, u => clubIds.Contains(u.ClubId))
            .WhereIf(teamIds.Count > 0, u => u.UserTeams.Any(ut => teamIds.Contains(ut.TeamId)));
    }

    // Cross-tenant lookup: returns every user record sharing this Firebase UID across all
    // clubs (the multi-org selection screen reads this). IgnoreQueryFilters() bypasses
    // ALL global query filters — both the multitenancy filter AND the soft-delete filter.
    // The explicit !u.IsDeleted + u.IsActive predicates restore those contracts so that
    // deleted and deactivated records are still excluded from the results.
    public async Task<IReadOnlyList<UserEntity>> FindAllByExternalAuthIdAsync(
        string externalAuthId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.ExternalAuthId == externalAuthId && !u.IsDeleted && u.IsActive)
            .Include(u => u.Club)
            .ToListAsync(cancellationToken);

    public async Task<int> CountUsersInClubWithRoleAsync(
        IReadOnlyList<Guid> userIds,
        Guid clubId,
        string roleName,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.Where(u =>
                userIds.Contains(u.Id)
                && u.ClubId == clubId
                && u.UserRoles.Any(ur => ur.Role.Name == roleName)
            )
            .CountAsync(cancellationToken);

    public async Task<IReadOnlyList<UserSummary>> ListUsersInClubWithRoleAsync(
        Guid clubId,
        string roleName,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u =>
                u.ClubId == clubId && u.IsActive && u.UserRoles.Any(ur => ur.Role.Name == roleName)
            )
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserSummary(u.Id, u.DisplayName, u.AvatarUrl))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UserSummary>> ListUsersInTeamsWithRoleAsync(
        IReadOnlyList<Guid> teamIds,
        string roleName,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u =>
                u.IsActive
                && u.UserRoles.Any(ur => ur.Role.Name == roleName)
                && u.UserTeams.Any(ut => teamIds.Contains(ut.TeamId))
            )
            .OrderBy(u => u.DisplayName)
            .Select(u => new UserSummary(u.Id, u.DisplayName, u.AvatarUrl))
            .ToListAsync(cancellationToken);

    public async Task AddGuardianLinkAsync(
        Guid guardianId,
        Guid dependentId,
        CancellationToken cancellationToken
    )
    {
        var exists = await GuardianLinkExistsAsync(guardianId, dependentId, cancellationToken);
        if (exists)
            return;

        await db.UserGuardians.AddAsync(
            new UserGuardianEntity
            {
                Id = Guid.NewGuid(),
                GuardianId = guardianId,
                DependentId = dependentId,
            },
            cancellationToken
        );
        await db.SaveChangesAsync(cancellationToken);
    }

    public Task<bool> GuardianLinkExistsAsync(
        Guid guardianId,
        Guid dependentId,
        CancellationToken cancellationToken
    ) =>
        db.UserGuardians.AnyAsync(
            x => x.GuardianId == guardianId && x.DependentId == dependentId,
            cancellationToken
        );

    public async Task<IReadOnlyList<Guid>> ListDependentIdsForGuardianAsync(
        Guid guardianId,
        CancellationToken cancellationToken
    ) =>
        await db
            .UserGuardians.Where(x => x.GuardianId == guardianId)
            .Select(x => x.DependentId)
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<UserGuardianEntity>> ListGuardianLinksWithDependentsAsync(
        Guid guardianId,
        CancellationToken cancellationToken
    ) =>
        await db
            .UserGuardians.AsNoTracking()
            .Include(x => x.Dependent)
                .ThenInclude(x => x.UserTeams)
                    .ThenInclude(ut => ut.Team)
            .Where(x => x.GuardianId == guardianId)
            .OrderBy(x => x.Dependent.DisplayName)
            .ToListAsync(cancellationToken);

    public async Task<int> SetGuardianRelationshipsAsync(
        Guid guardianId,
        IReadOnlyDictionary<Guid, GuardianRelationship> relationshipsByDependentId,
        CancellationToken cancellationToken
    )
    {
        if (!relationshipsByDependentId.Any())
            return 0;

        var dependentIds = relationshipsByDependentId.Keys.ToList();
        var links = await db
            .UserGuardians.Where(x =>
                x.GuardianId == guardianId && dependentIds.Contains(x.DependentId)
            )
            .ToListAsync(cancellationToken);

        foreach (var link in links)
            link.Relationship = relationshipsByDependentId[link.DependentId];

        await db.SaveChangesAsync(cancellationToken);
        return links.Count;
    }

    public async Task<IReadOnlyList<Guid>> ListGuardianIdsForDependentsAsync(
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    ) =>
        await db
            .UserGuardians.Where(x => dependentIds.Contains(x.DependentId) && x.Guardian.IsActive)
            .Select(x => x.GuardianId)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Guid>> ListActiveMemberIdsForTeamAsync(
        Guid teamId,
        CancellationToken cancellationToken
    ) =>
        await db
            .Users.AsNoTracking()
            .Where(u => u.IsActive && u.UserTeams.Any(ut => ut.TeamId == teamId))
            .Select(u => u.Id)
            .Distinct()
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<(Guid UserId, DateTime LastActiveAt)>> ListLastActiveAtAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken cancellationToken
    ) =>
        (
            await db
                .Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.LastActiveAt })
                .ToListAsync(cancellationToken)
        )
            .Select(x => (x.Id, x.LastActiveAt))
            .ToList();

    public async Task AddGuardianLinksAsync(
        Guid guardianId,
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    )
    {
        if (dependentIds.Count == 0)
            return;

        var existing = await db
            .UserGuardians.Where(x =>
                x.GuardianId == guardianId && dependentIds.Contains(x.DependentId)
            )
            .Select(x => x.DependentId)
            .ToListAsync(cancellationToken);
        var existingSet = existing.ToHashSet();

        var toAdd = dependentIds
            .Distinct()
            .Where(dependentId => !existingSet.Contains(dependentId))
            .Select(dependentId => new UserGuardianEntity
            {
                Id = Guid.NewGuid(),
                GuardianId = guardianId,
                DependentId = dependentId,
            })
            .ToList();

        if (toAdd.Count == 0)
            return;

        await db.UserGuardians.AddRangeAsync(toAdd, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task BulkAddGuardianLinksAsync(
        IReadOnlyList<(Guid GuardianId, Guid AthleteUserId)> links,
        CancellationToken cancellationToken
    )
    {
        if (links.Count == 0)
            return;

        var guardianIds = links.Select(l => l.GuardianId).Distinct().ToList();
        var athleteIds = links.Select(l => l.AthleteUserId).Distinct().ToList();

        var existing = await db
            .UserGuardians.Where(x =>
                guardianIds.Contains(x.GuardianId) && athleteIds.Contains(x.DependentId)
            )
            .Select(x => new { x.GuardianId, x.DependentId })
            .ToListAsync(cancellationToken);
        var existingSet = existing.Select(e => (e.GuardianId, e.DependentId)).ToHashSet();

        var toAdd = links
            .Distinct()
            .Where(l => !existingSet.Contains((l.GuardianId, l.AthleteUserId)))
            .Select(l => new UserGuardianEntity
            {
                Id = Guid.NewGuid(),
                GuardianId = l.GuardianId,
                DependentId = l.AthleteUserId,
            })
            .ToList();

        if (toAdd.Count == 0)
            return;

        await db.UserGuardians.AddRangeAsync(toAdd, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task ReplaceGuardianLinksAsync(
        Guid guardianId,
        IReadOnlyList<Guid> dependentIds,
        CancellationToken cancellationToken
    )
    {
        var distinctDependentIds = dependentIds.Distinct().ToHashSet();

        var existingLinks = await db
            .UserGuardians.Where(x => x.GuardianId == guardianId)
            .ToListAsync(cancellationToken);

        var toRemove = existingLinks
            .Where(x => !distinctDependentIds.Contains(x.DependentId))
            .ToList();
        if (toRemove.Count > 0)
            db.UserGuardians.RemoveRange(toRemove);

        var existingDependentIds = existingLinks.Select(x => x.DependentId).ToHashSet();
        var toAdd = distinctDependentIds
            .Where(dependentId => !existingDependentIds.Contains(dependentId))
            .Select(dependentId => new UserGuardianEntity
            {
                Id = Guid.NewGuid(),
                GuardianId = guardianId,
                DependentId = dependentId,
            })
            .ToList();
        if (toAdd.Count > 0)
            await db.UserGuardians.AddRangeAsync(toAdd, cancellationToken);

        if (toRemove.Count > 0 || toAdd.Count > 0)
            await db.SaveChangesAsync(cancellationToken);
    }
}
