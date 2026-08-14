using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence;
using StarterKit.Data.Resources.Enums;
using StarterKit.Data.Resources.Models;
using StarterKit.Data.Resources.Repositories;

namespace StarterKit.Data.Tests.Resources.Repositories;

public abstract class ResourceRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly ResourceRepository Sut;
    protected static readonly Faker Faker = new();

    protected ResourceRepositoryTests()
    {
        var interceptor = new AuditInterceptor(TimeProvider.System, new StubAuditUserContext());

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new ResourceRepository(DbContext);
    }

    public void Dispose() => DbContext.Dispose();

    protected Resource BuildResource() =>
        new()
        {
            Id = Guid.NewGuid(),
            Title = Faker.Lorem.Sentence(3),
            SourceType = Faker.PickRandom<ResourceSourceType>(),
            StorageUrl = Faker.Internet.Url(),
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class AddAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task AddAsync_WithValidResource_PersistsToDatabase()
        {
            var resource = BuildResource();

            await Sut.AddAsync(resource);

            var result = await DbContext.Resources.FindAsync(resource.Id);
            result.Should().NotBeNull();
            result!.Id.Should().Be(resource.Id);
            result.Title.Should().Be(resource.Title);
            result.SourceType.Should().Be(resource.SourceType);
            result.StorageUrl.Should().Be(resource.StorageUrl);
        }
    }

    public sealed class FindByIdAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsResource()
        {
            var resource = BuildResource();
            await Sut.AddAsync(resource);

            var result = await Sut.FindByIdAsync(resource.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(resource.Id);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var result = await Sut.FindByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }

    public sealed class GetAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_ReturnsResource()
        {
            var resource = BuildResource();
            await Sut.AddAsync(resource);

            var result = await Sut.GetAsync(resource.Id);

            result.Id.Should().Be(resource.Id);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.GetAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class UpdateAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task UpdateAsync_WithChangedFields_PersistsChanges()
        {
            var resource = BuildResource();
            await Sut.AddAsync(resource);

            var newTitle = Faker.Lorem.Sentence(3);
            resource.Title = newTitle;
            resource.SourceType = ResourceSourceType.Text;
            resource.StorageUrl = Faker.Internet.Url();

            await Sut.UpdateAsync(resource);

            var updated = await DbContext.Resources.FindAsync(resource.Id);
            updated!.Title.Should().Be(newTitle);
            updated.SourceType.Should().Be(ResourceSourceType.Text);
        }
    }

    public sealed class DeleteAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task DeleteAsync_WhenExists_SoftDeletesRow()
        {
            var resource = BuildResource();
            await Sut.AddAsync(resource);

            await Sut.DeleteAsync(resource.Id);

            // Normal query: soft-delete filter hides the row
            var filteredResult = await DbContext.Resources.FirstOrDefaultAsync(r =>
                r.Id == resource.Id
            );
            filteredResult.Should().BeNull();

            // Bypassing filter: row still exists, marked as deleted
            var deletedResult = await DbContext
                .Resources.IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.Id == resource.Id);
            deletedResult.Should().NotBeNull();
            deletedResult!.IsDeleted.Should().BeTrue();
            deletedResult.DeletedAt.Should().NotBeNull();
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.DeleteAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class ListAsync : ResourceRepositoryTests
    {
        [Fact]
        public async Task ListAsync_WithNoFilter_ReturnsAllResources()
        {
            var r1 = BuildResource();
            var r2 = BuildResource();
            await Sut.AddAsync(r1);
            await Sut.AddAsync(r2);

            var (items, totalCount) = await Sut.ListAsync(1, 10);

            totalCount.Should().Be(2);
            items.Should().HaveCount(2);
        }

        [Fact]
        public async Task ListAsync_WithFilterText_ReturnsMatchingResources()
        {
            var resource = BuildResource();
            resource.Title = "UniqueSearchTitle";
            await Sut.AddAsync(resource);
            await Sut.AddAsync(BuildResource());

            var (items, totalCount) = await Sut.ListAsync(1, 10, filterText: "UniqueSearch");

            totalCount.Should().Be(1);
            items.Should().ContainSingle(r => r.Id == resource.Id);
        }

        [Fact]
        public async Task ListAsync_WithPaging_ReturnsCorrectPage()
        {
            for (var i = 0; i < 5; i++)
                await Sut.AddAsync(BuildResource());

            var (items, totalCount) = await Sut.ListAsync(page: 2, pageSize: 2);

            totalCount.Should().Be(5);
            items.Should().HaveCount(2);
        }
    }

    private sealed class StubAuditUserContext : IAuditUserContext
    {
        public string? UserId => null;
        public Guid? ClubId => null;
    }
}
