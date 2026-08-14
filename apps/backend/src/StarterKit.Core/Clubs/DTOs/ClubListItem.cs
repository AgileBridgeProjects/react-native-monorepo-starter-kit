using StarterKit.Data.Clubs.Models;

namespace StarterKit.Core.Clubs.DTOs;

/// <summary>
/// Wraps a <see cref="Club"/> with pre-computed summary counts for display in list views.
/// </summary>
public sealed class ClubListItem
{
    public required Club Club { get; init; }

    /// <summary>Number of active (IsActive = true, IsDeleted = false) users in this club.</summary>
    public int ActiveUserCount { get; init; }

    /// <summary>Number of non-deleted teams in this club.</summary>
    public int TeamCount { get; init; }
}
