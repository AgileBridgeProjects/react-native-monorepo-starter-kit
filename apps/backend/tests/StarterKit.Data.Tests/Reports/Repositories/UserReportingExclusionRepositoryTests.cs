using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Reports.Repositories;

namespace StarterKit.Data.Tests.Reports.Repositories;

public abstract class UserReportingExclusionRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly UserReportingExclusionRepository Sut;
    protected static readonly Faker Faker = new();

    protected UserReportingExclusionRepositoryTests()
    {
        var interceptor = new AuditInterceptor(TimeProvider.System, new StubAuditUserContext());

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new UserReportingExclusionRepository(DbContext);
    }

    public void Dispose() => DbContext.Dispose();

    protected static UserReportingExclusion BuildExclusion(
        Guid? userId = null,
        Guid? clubId = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId ?? Guid.NewGuid(),
            ClubId = clubId ?? Guid.NewGuid(),
            Reason = Faker.Lorem.Sentence(),
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class AddAsync : UserReportingExclusionRepositoryTests
    {
        [Fact]
        public async Task AddAsync_WithValidExclusion_PersistsToDatabase()
        {
            var exclusion = BuildExclusion();

            await Sut.AddAsync(exclusion);

            var stored = await DbContext.UserReportingExclusions.FindAsync(exclusion.Id);
            stored.Should().NotBeNull();
            stored!.UserId.Should().Be(exclusion.UserId);
            stored.Reason.Should().Be(exclusion.Reason);
        }

        [Fact]
        public async Task AddAsync_WhenSoftDeletedRowExistsForSameKey_ResurrectsRow()
        {
            // Arrange — add then delete to produce a soft-deleted row
            var userId = Guid.NewGuid();
            var clubId = Guid.NewGuid();
            var original = BuildExclusion(userId, clubId);
            await Sut.AddAsync(original);
            await Sut.DeleteByUserIdAsync(userId);

            // Act — re-add for the same (UserId, ClubId)
            var reExclusion = BuildExclusion(userId, clubId);
            reExclusion.Reason = "re-excluded";
            await Sut.AddAsync(reExclusion);

            // Assert — single active row with the new reason; no unique constraint violation
            var isExcluded = await Sut.IsExcludedAsync(userId);
            isExcluded.Should().BeTrue();

            var active = await Sut.FindByUserIdAsync(userId);
            active.Should().NotBeNull();
            active!.Reason.Should().Be("re-excluded");

            var allRows = await DbContext
                .UserReportingExclusions.IgnoreQueryFilters()
                .Where(x => x.UserId == userId)
                .ToListAsync();
            allRows.Should().HaveCount(1);
        }
    }

    public sealed class FindByUserIdAsync : UserReportingExclusionRepositoryTests
    {
        [Fact]
        public async Task FindByUserIdAsync_WhenExclusionExists_ReturnsExclusion()
        {
            var exclusion = BuildExclusion();
            await Sut.AddAsync(exclusion);

            var result = await Sut.FindByUserIdAsync(exclusion.UserId);

            result.Should().NotBeNull();
            result!.UserId.Should().Be(exclusion.UserId);
        }

        [Fact]
        public async Task FindByUserIdAsync_WhenNotExcluded_ReturnsNull()
        {
            var result = await Sut.FindByUserIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }

    public sealed class IsExcludedAsync : UserReportingExclusionRepositoryTests
    {
        [Fact]
        public async Task IsExcludedAsync_WhenExclusionExists_ReturnsTrue()
        {
            var exclusion = BuildExclusion();
            await Sut.AddAsync(exclusion);

            var result = await Sut.IsExcludedAsync(exclusion.UserId);

            result.Should().BeTrue();
        }

        [Fact]
        public async Task IsExcludedAsync_WhenNotExcluded_ReturnsFalse()
        {
            var result = await Sut.IsExcludedAsync(Guid.NewGuid());

            result.Should().BeFalse();
        }
    }

    public sealed class GetAllAsync : UserReportingExclusionRepositoryTests
    {
        [Fact]
        public async Task GetAllAsync_WhenExclusionsExist_ReturnsAllExclusions()
        {
            var e1 = BuildExclusion();
            var e2 = BuildExclusion();
            await Sut.AddAsync(e1);
            await Sut.AddAsync(e2);

            var result = await Sut.GetAllAsync();

            result.Should().HaveCount(2);
        }

        [Fact]
        public async Task GetAllAsync_WhenNoExclusions_ReturnsEmpty()
        {
            var result = await Sut.GetAllAsync();

            result.Should().BeEmpty();
        }
    }

    public sealed class DeleteByUserIdAsync : UserReportingExclusionRepositoryTests
    {
        [Fact]
        public async Task DeleteByUserIdAsync_WhenExclusionExists_SoftDeletesRow()
        {
            var exclusion = BuildExclusion();
            await Sut.AddAsync(exclusion);

            await Sut.DeleteByUserIdAsync(exclusion.UserId);

            // Normal query: soft-delete filter hides the row
            var filteredResult = await DbContext.UserReportingExclusions.FirstOrDefaultAsync(x =>
                x.UserId == exclusion.UserId
            );
            filteredResult.Should().BeNull();

            // Bypassing filter: row still exists, marked as deleted
            var deletedResult = await DbContext
                .UserReportingExclusions.IgnoreQueryFilters()
                .FirstOrDefaultAsync(x => x.UserId == exclusion.UserId);
            deletedResult.Should().NotBeNull();
            deletedResult!.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteByUserIdAsync_WhenNotFound_ThrowsEntityNotFoundException()
        {
            var act = async () => await Sut.DeleteByUserIdAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    private sealed class StubAuditUserContext : IAuditUserContext
    {
        public string? UserId => null;
        public Guid? ClubId => null;
    }
}
