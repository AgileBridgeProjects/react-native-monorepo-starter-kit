using StarterKit.Core.Common;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Core.Teams.Interfaces.Services;

public interface ITeamService
{
    Task<PagedResult<TeamListItem>> ListAsync(
        TeamListQuery query,
        CancellationToken cancellationToken = default
    );

    Task<Team> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Team?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Team> CreateAsync(
        Guid seasonId,
        string name,
        string? description = null,
        AgeGroup? ageGroup = null,
        string? logoUrl = null,
        CancellationToken cancellationToken = default
    );

    Task<Team> UpdateAsync(
        Guid id,
        string name,
        string? description = null,
        AgeGroup? ageGroup = null,
        string? logoUrl = null,
        CancellationToken cancellationToken = default
    );

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves a stored team-logo blob path to a short-lived, browser-renderable URL.
    /// Returns null when the input is null/empty.
    /// </summary>
    Task<string?> ResolveLogoSasUrlAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    );
}
