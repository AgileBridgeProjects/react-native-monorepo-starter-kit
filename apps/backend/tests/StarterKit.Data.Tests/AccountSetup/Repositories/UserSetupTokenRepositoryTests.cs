using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.AccountSetup.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Data.Tests.AccountSetup.Repositories;

public abstract class UserSetupTokenRepositoryTests : IDisposable
{
    protected static readonly DateTime UtcNow = new(2026, 5, 20, 12, 0, 0, DateTimeKind.Utc);

    protected readonly AppDbContext DbContext;
    protected readonly IUserSetupTokenRepository Sut;

    protected UserSetupTokenRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new UserSetupTokenRepository(DbContext, new FixedTimeProvider(UtcNow));
    }

    public void Dispose() => DbContext.Dispose();

    private sealed class FixedTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    protected async Task<UserEntity> SeedUser()
    {
        var clubId = Guid.NewGuid();
        DbContext.Clubs.Add(
            new Club
            {
                Id = clubId,
                Name = "Test Club",
                CreatedAt = UtcNow,
            }
        );
        var entity = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = Guid.NewGuid().ToString(),
            ClubId = clubId,
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = "Test User",
            CreatedAt = UtcNow,
        };
        DbContext.Users.Add(entity);
        await DbContext.SaveChangesAsync();
        return entity;
    }

    protected async Task<UserSetupTokenEntity> SeedToken(
        Guid userId,
        string tokenHash,
        DateTime expiresAt,
        bool isInvalidated = false,
        DateTime? usedAt = null,
        SetupTokenPurpose purpose = SetupTokenPurpose.AccountSetup
    )
    {
        var entity = new UserSetupTokenEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            TempPasswordHash = "bcrypt-placeholder",
            Purpose = purpose,
            ExpiresAt = expiresAt,
            IsInvalidated = isInvalidated,
            UsedAt = usedAt,
            CreatedAt = UtcNow,
        };
        DbContext.UserSetupTokens.Add(entity);
        await DbContext.SaveChangesAsync();
        return entity;
    }

    // ── GetSetupStatusBulkAsync ──────────────────────────────────────────────

    public sealed class GetSetupStatusBulkAsync : UserSetupTokenRepositoryTests
    {
        [Fact]
        public async Task ReturnsActiveStatus_WhenTokenNotExpired()
        {
            var user = await SeedUser();
            await SeedToken(user.Id, "hash-1", UtcNow.AddHours(12));

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().ContainKey(user.Id);
            result[user.Id].Should().BeTrue();
        }

        [Fact]
        public async Task ReturnsExpiredStatus_WhenTokenExpired()
        {
            var user = await SeedUser();
            await SeedToken(user.Id, "hash-2", UtcNow.AddHours(-1));

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().ContainKey(user.Id);
            result[user.Id].Should().BeFalse();
        }

        [Fact]
        public async Task ReturnsExpiredStatus_WhenTokenExpiredAndInvalidated()
        {
            // Expired-then-invalidated tokens still surface as expired (false)
            // so the admin UI can offer the resend button.
            var user = await SeedUser();
            await SeedToken(user.Id, "hash-3", UtcNow.AddHours(-1), isInvalidated: true);

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().ContainKey(user.Id);
            result[user.Id].Should().BeFalse();
        }

        [Fact]
        public async Task ExcludesUsedTokens()
        {
            var user = await SeedUser();
            await SeedToken(user.Id, "hash-used", UtcNow.AddHours(12), usedAt: UtcNow);

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().NotContainKey(user.Id);
        }

        [Fact]
        public async Task ReturnsLatestToken_WhenMultipleExist()
        {
            var user = await SeedUser();
            // Old expired token
            await SeedToken(user.Id, "old-hash", UtcNow.AddHours(-2));
            // New active token (resend)
            await SeedToken(user.Id, "new-hash", UtcNow.AddHours(23));

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().ContainKey(user.Id);
            result[user.Id].Should().BeTrue();
        }

        [Fact]
        public async Task ExcludesUser_WhenSetupCompletedAndNewActiveTokenExists()
        {
            // After a user redeems their token (sets their password), the admin should
            // NOT be able to trigger PendingSetup status by resending the invite link.
            var user = await SeedUser();
            // The token they already used to complete setup
            await SeedToken(user.Id, "used-hash", UtcNow.AddHours(12), usedAt: UtcNow.AddHours(-1));
            // A new active token the admin accidentally resent afterwards
            await SeedToken(user.Id, "resent-hash", UtcNow.AddHours(23));

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            // Completed users must always resolve to SetupStatus.None (not in dict).
            result.Should().NotContainKey(user.Id);
        }

        [Fact]
        public async Task ExcludesActiveInvalidatedToken_WhenReplacedByNewResend()
        {
            // When the admin resends, the old token is invalidated and a new token is created.
            // The old invalidated-but-not-yet-expired token must be ignored; only the new one counts.
            var user = await SeedUser();
            // Old token: invalidated by the resend but still within expiry window
            await SeedToken(
                user.Id,
                "old-active-invalidated",
                UtcNow.AddHours(12),
                isInvalidated: true
            );
            // New active token from the resend
            await SeedToken(user.Id, "new-active", UtcNow.AddHours(23));

            var result = await Sut.GetSetupStatusBulkAsync([user.Id], CancellationToken.None);

            result.Should().ContainKey(user.Id);
            result[user.Id].Should().BeTrue();
        }
    }

    // ── FindExpiredUnprocessedAsync ───────────────────────────────────────────

    public sealed class FindExpiredUnprocessedAsync : UserSetupTokenRepositoryTests
    {
        [Fact]
        public async Task ReturnsExpiredTokens_ThatAreNotUsedOrInvalidated()
        {
            var user = await SeedUser();
            var expired = await SeedToken(user.Id, "expired-1", UtcNow.AddHours(-1));

            var result = await Sut.FindExpiredUnprocessedAsync(CancellationToken.None);

            result.Should().ContainSingle(t => t.Id == expired.Id);
            result[0].User.Should().NotBeNull();
        }

        [Fact]
        public async Task ExcludesUsedTokens()
        {
            var user = await SeedUser();
            await SeedToken(
                user.Id,
                "expired-used",
                UtcNow.AddHours(-1),
                usedAt: UtcNow.AddHours(-0.5)
            );

            var result = await Sut.FindExpiredUnprocessedAsync(CancellationToken.None);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesInvalidatedTokens()
        {
            var user = await SeedUser();
            await SeedToken(user.Id, "expired-inv", UtcNow.AddHours(-1), isInvalidated: true);

            var result = await Sut.FindExpiredUnprocessedAsync(CancellationToken.None);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesTokensNotYetExpired()
        {
            var user = await SeedUser();
            await SeedToken(user.Id, "still-active", UtcNow.AddHours(1));

            var result = await Sut.FindExpiredUnprocessedAsync(CancellationToken.None);

            result.Should().BeEmpty();
        }
    }

    // ── InvalidateAllForUserAsync ────────────────────────────────────────────
    // NOTE: ExecuteUpdateAsync is not supported by EF Core's in-memory provider.
    // TODO: Add a SQL Server integration test covering InvalidateAllForUserAsync
    // once the integration test infrastructure is in place.

    // ── DeleteOlderThanAsync ─────────────────────────────────────────────────

    public sealed class DeleteOlderThanAsync : UserSetupTokenRepositoryTests
    {
        private async Task<UserSetupTokenEntity> SeedTokenCreatedAt(
            Guid userId,
            DateTime createdAt,
            DateTime expiresAt,
            bool isInvalidated = false,
            DateTime? usedAt = null
        )
        {
            var entity = new UserSetupTokenEntity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TokenHash = Guid.NewGuid().ToString("N"),
                TempPasswordHash = "bcrypt-placeholder",
                Purpose = SetupTokenPurpose.AccountSetup,
                CreatedAt = createdAt,
                ExpiresAt = expiresAt,
                IsInvalidated = isInvalidated,
                UsedAt = usedAt,
            };
            DbContext.UserSetupTokens.Add(entity);
            await DbContext.SaveChangesAsync();
            DbContext.ChangeTracker.Clear();
            return entity;
        }

        [Fact]
        public async Task DeletesOldExpiredToken()
        {
            var user = await SeedUser();
            var utcNow = UtcNow;
            var cutoff = utcNow.AddDays(-90);
            var token = await SeedTokenCreatedAt(user.Id, cutoff.AddDays(-1), utcNow.AddHours(-1));

            var deleted = await Sut.DeleteOlderThanAsync(cutoff, CancellationToken.None);

            deleted.Should().BeGreaterThanOrEqualTo(1);
            (await DbContext.UserSetupTokens.AnyAsync(t => t.Id == token.Id)).Should().BeFalse();
        }

        [Fact]
        public async Task DeletesOldUsedToken()
        {
            var user = await SeedUser();
            var utcNow = UtcNow;
            var cutoff = utcNow.AddDays(-90);
            // Used long ago, not yet expired — still deleted because UsedAt IS NOT NULL.
            var token = await SeedTokenCreatedAt(
                user.Id,
                cutoff.AddDays(-1),
                utcNow.AddHours(12),
                usedAt: cutoff.AddDays(-5)
            );

            var deleted = await Sut.DeleteOlderThanAsync(cutoff, CancellationToken.None);

            deleted.Should().BeGreaterThanOrEqualTo(1);
            (await DbContext.UserSetupTokens.AnyAsync(t => t.Id == token.Id)).Should().BeFalse();
        }

        [Fact]
        public async Task DeletesOldInvalidatedToken()
        {
            var user = await SeedUser();
            var utcNow = UtcNow;
            var cutoff = utcNow.AddDays(-90);
            var token = await SeedTokenCreatedAt(
                user.Id,
                cutoff.AddDays(-1),
                utcNow.AddHours(12),
                isInvalidated: true
            );

            var deleted = await Sut.DeleteOlderThanAsync(cutoff, CancellationToken.None);

            deleted.Should().BeGreaterThanOrEqualTo(1);
            (await DbContext.UserSetupTokens.AnyAsync(t => t.Id == token.Id)).Should().BeFalse();
        }

        [Fact]
        public async Task PreservesOldActiveToken_WhenNotExpiredUsedOrInvalidated()
        {
            // An old token still within its validity window must never be deleted.
            var user = await SeedUser();
            var utcNow = UtcNow;
            var cutoff = utcNow.AddDays(-90);
            var token = await SeedTokenCreatedAt(user.Id, cutoff.AddDays(-1), utcNow.AddHours(12));

            await Sut.DeleteOlderThanAsync(cutoff, CancellationToken.None);

            (await DbContext.UserSetupTokens.AnyAsync(t => t.Id == token.Id)).Should().BeTrue();
        }

        [Fact]
        public async Task PreservesRecentToken_WhenCreatedAfterCutoff()
        {
            // A recently created token that is already expired must still be preserved
            // because it is within the retention window (CreatedAt >= cutoff).
            var user = await SeedUser();
            var utcNow = UtcNow;
            var cutoff = utcNow.AddDays(-90);
            var token = await SeedTokenCreatedAt(user.Id, cutoff.AddDays(1), utcNow.AddHours(-1));

            await Sut.DeleteOlderThanAsync(cutoff, CancellationToken.None);

            (await DbContext.UserSetupTokens.AnyAsync(t => t.Id == token.Id)).Should().BeTrue();
        }

        [Fact]
        public async Task ReturnsZero_WhenNoTokensMatchPredicate()
        {
            var count = await Sut.DeleteOlderThanAsync(UtcNow.AddDays(-90), CancellationToken.None);

            count.Should().Be(0);
        }
    }
}
