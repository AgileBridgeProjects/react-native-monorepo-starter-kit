using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.AccountSetup.Interfaces.Repositories;

public interface IUserSetupTokenRepository
{
    /// <summary>Persists a new setup token record.</summary>
    Task AddAsync(UserSetupTokenEntity token, CancellationToken cancellationToken);

    /// <summary>
    /// Finds an active token by its SHA-256 hash without filtering on expiry or state.
    /// Used for the validate endpoint to return appropriate error messages.
    /// </summary>
    Task<UserSetupTokenEntity?> FindByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Invalidates all outstanding (unused, non-invalidated) tokens for a user
    /// that match the specified purpose. Called before issuing a resent token.
    /// </summary>
    Task InvalidateAllForUserAsync(
        Guid userId,
        SetupTokenPurpose purpose,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns whether each user has an active (non-expired) setup token.
    /// Key = UserId. Only Credentials users who have never logged in will have records.
    /// True = token is still valid (PendingSetup); false = token has expired (SetupExpired).
    /// </summary>
    Task<Dictionary<Guid, bool>> GetSetupStatusBulkAsync(
        IEnumerable<Guid> userIds,
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Returns tokens that have expired without being used or invalidated.
    /// Used by the background expiry service to emit audit log events (AC 7d).
    /// </summary>
    Task<List<UserSetupTokenEntity>> FindExpiredUnprocessedAsync(
        CancellationToken cancellationToken
    );

    /// <summary>
    /// Hard-deletes tokens whose <c>CreatedAt</c> is older than <paramref name="cutoff"/>,
    /// excluding any token that is currently active (not expired, not used, not invalidated).
    /// Used by the daily cleanup job to enforce data-retention policy (POPIA/GDPR).
    /// </summary>
    /// <returns>Number of rows deleted.</returns>
    Task<int> DeleteOlderThanAsync(DateTime cutoff, CancellationToken cancellationToken);

    Task SaveChangesAsync(CancellationToken cancellationToken);
}
