using Microsoft.EntityFrameworkCore;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.AccountSetup.Repositories;

internal sealed class UserSetupTokenRepository(AppDbContext db, TimeProvider clock)
    : IUserSetupTokenRepository
{
    public async Task AddAsync(UserSetupTokenEntity token, CancellationToken cancellationToken)
    {
        await db.UserSetupTokens.AddAsync(token, cancellationToken);
    }

    public Task<UserSetupTokenEntity?> FindByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken
    ) =>
        db
            .UserSetupTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

    public async Task InvalidateAllForUserAsync(
        Guid userId,
        SetupTokenPurpose purpose,
        CancellationToken cancellationToken
    )
    {
        await db
            .UserSetupTokens.Where(t =>
                t.UserId == userId && t.Purpose == purpose && t.UsedAt == null && !t.IsInvalidated
            )
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.IsInvalidated, true), cancellationToken);
    }

    public async Task<Dictionary<Guid, bool>> GetSetupStatusBulkAsync(
        IEnumerable<Guid> userIds,
        CancellationToken cancellationToken
    )
    {
        var ids = userIds.ToList();
        var now = clock.Now();

        // Users who have already redeemed a setup token have completed account setup.
        // Exclude them so they always resolve to SetupStatus.None regardless of any
        // tokens the admin may have issued afterwards (e.g. an accidental resend).
        var completedIds = await db
            .UserSetupTokens.Where(t =>
                ids.Contains(t.UserId)
                && t.UsedAt != null
                && t.Purpose == SetupTokenPurpose.AccountSetup
            )
            .Select(t => t.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var pendingIds = ids.Except(completedIds).ToList();
        if (pendingIds.Count == 0)
            return [];

        // For each remaining user, grab the most recent token that is either:
        //   a) still active and not invalidated (genuinely pending), or
        //   b) expired and invalidated (background expiry job ran — still surfaces as SetupExpired
        //      so the admin UI knows to resend).
        // Tokens that are invalidated but NOT yet expired are excluded — they were
        // superseded by a newer resend token which is captured by clause (a).
        var tokens = await db
            .UserSetupTokens.Where(t =>
                pendingIds.Contains(t.UserId)
                && t.UsedAt == null
                && t.Purpose == SetupTokenPurpose.AccountSetup
                && (!t.IsInvalidated || t.ExpiresAt <= now)
            )
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, ExpiresAt = g.Max(t => t.ExpiresAt) })
            .ToListAsync(cancellationToken);

        // true = token still valid (PendingSetup); false = expired (SetupExpired).
        return tokens.ToDictionary(t => t.UserId, t => t.ExpiresAt > now);
    }

    public async Task<List<UserSetupTokenEntity>> FindExpiredUnprocessedAsync(
        CancellationToken cancellationToken
    )
    {
        var now = clock.Now();

        return await db
            .UserSetupTokens.Include(t => t.User)
            .Where(t => t.ExpiresAt <= now && t.UsedAt == null && !t.IsInvalidated)
            .ToListAsync(cancellationToken);
    }

    public Task<int> DeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken)
    {
        var now = clock.Now();
        var tokens = db.UserSetupTokens.Where(t =>
            t.CreatedAt < cutoff && (t.ExpiresAt <= now || t.UsedAt != null || t.IsInvalidated)
        );

        if (db.Database.IsRelational())
            return tokens.ExecuteDeleteAsync(cancellationToken);

        return DeleteTrackedAsync(tokens, cancellationToken);
    }

    private async Task<int> DeleteTrackedAsync(
        IQueryable<UserSetupTokenEntity> tokens,
        CancellationToken cancellationToken
    )
    {
        var matchingTokens = await tokens.ToListAsync(cancellationToken);
        db.UserSetupTokens.RemoveRange(matchingTokens);
        await db.SaveChangesAsync(cancellationToken);
        return matchingTokens.Count;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        db.SaveChangesAsync(cancellationToken);
}
