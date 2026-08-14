using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Models;

namespace StarterKit.Data.DeviceTokens.Interfaces.Repositories;

public interface IDeviceTokenRepository
{
    /// <summary>
    /// Upserts a device token for (UserId, Platform, Token).
    /// If the exact token already exists, updates UpdatedAt only.
    /// Removes stale tokens for the same (UserId, Platform) with a different token value.
    /// </summary>
    Task UpsertAsync(
        Guid userId,
        PushPlatform platform,
        string token,
        CancellationToken ct = default
    );

    /// <summary>Returns all device tokens grouped by platform for a set of user IDs.</summary>
    Task<IReadOnlyList<DeviceToken>> GetByUserIdsAsync(
        IReadOnlyList<Guid> userIds,
        CancellationToken ct = default
    );
}
