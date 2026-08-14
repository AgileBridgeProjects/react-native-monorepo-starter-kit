using Microsoft.EntityFrameworkCore;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.Data.DeviceTokens.Models;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.DeviceTokens.Repositories;

internal sealed class DeviceTokenRepository(AppDbContext db, TimeProvider clock)
    : IDeviceTokenRepository
{
    public async Task UpsertAsync(
        Guid userId,
        PushPlatform platform,
        string token,
        CancellationToken ct = default
    )
    {
        var now = clock.Now();

        // Check if the exact token already exists
        var existing = await db.DeviceTokens.FirstOrDefaultAsync(
            d => d.UserId == userId && d.Platform == platform && d.Token == token,
            ct
        );

        if (existing is not null)
        {
            existing.UpdatedAt = now;
        }
        else
        {
            // Remove stale tokens for (UserId, Platform) with a different token — device re-registered
            var staleTokens = await db
                .DeviceTokens.Where(d =>
                    d.UserId == userId && d.Platform == platform && d.Token != token
                )
                .ToListAsync(ct);

            db.DeviceTokens.RemoveRange(staleTokens);

            db.DeviceTokens.Add(
                new DeviceToken
                {
                    UserId = userId,
                    Platform = platform,
                    Token = token,
                    CreatedAt = now,
                    UpdatedAt = now,
                }
            );
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<DeviceToken>> GetByUserIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken ct = default
    )
    {
        return await db
            .DeviceTokens.AsNoTracking()
            .Where(d => userIds.Contains(d.UserId))
            .ToListAsync(ct);
    }
}
