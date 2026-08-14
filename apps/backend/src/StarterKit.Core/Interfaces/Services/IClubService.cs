using StarterKit.Core.Clubs.DTOs;
using StarterKit.Core.Common;
using StarterKit.Core.Resources;
using StarterKit.Data.Clubs.Models;

namespace StarterKit.Core.Interfaces.Services;

public interface IClubService
{
    Task<PagedResult<ClubListItem>> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    );

    Task<Club> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Club?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task<Club> CreateAsync(
        CreateClubCommand command,
        CancellationToken cancellationToken = default
    );

    Task<Club> UpdateAsync(
        UpdateClubCommand command,
        CancellationToken cancellationToken = default
    );

    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Uploads a club logo to blob storage and returns the stored blob path.
    /// </summary>
    Task<string> UploadLogoAsync(UploadedFile file, CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves a stored logo blob path to a fresh time-limited SAS URL.
    /// </summary>
    Task<string?> ResolveLogoSasUrlAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    );

    /// <summary>Returns true when the club exists (not soft-deleted). Used by the claims
    /// transformer to validate that a <c>club_id</c> JWT claim is still valid after a
    /// database reset.</summary>
    Task<bool> ExistsAsync(Guid clubId, CancellationToken cancellationToken = default);
}
