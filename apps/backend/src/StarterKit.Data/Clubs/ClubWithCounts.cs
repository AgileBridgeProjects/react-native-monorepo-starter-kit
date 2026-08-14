using StarterKit.Data.Clubs.Models;

namespace StarterKit.Data.Clubs;

/// <summary>
/// Lightweight projection returned by <see cref="Interfaces.Repositories.IClubRepository.ListAsync"/>.
/// Bundles pre-computed counts so callers avoid N+1 queries.
/// </summary>
public sealed class ClubWithCounts
{
    public required Club Club { get; init; }

    /// <summary>Active (IsActive = true, IsDeleted = false) users in this club.</summary>
    public int ActiveUserCount { get; init; }

    /// <summary>Non-deleted teams in this club.</summary>
    public int TeamCount { get; init; }
}
