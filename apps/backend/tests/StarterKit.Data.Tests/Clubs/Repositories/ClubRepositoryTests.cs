using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Clubs.Repositories;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Tests.Clubs.Repositories;

public abstract class ClubRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly ClubRepository Sut;
    protected static readonly Faker Faker = new();

    protected ClubRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new ClubRepository(DbContext);
    }

    public void Dispose() => DbContext.Dispose();

    protected Club BuildClub() =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = Faker.Company.CompanyName(),
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class AddAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task AddAsync_WithValidClub_PersistsToDatabase()
        {
            var club = BuildClub();

            await Sut.AddAsync(club);

            var result = await DbContext.Clubs.FindAsync(club.Id);
            result.Should().NotBeNull();
            result!.Id.Should().Be(club.Id);
            result.Name.Should().Be(club.Name);
        }
    }

    public sealed class FindByIdAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsClub()
        {
            var club = BuildClub();
            await Sut.AddAsync(club);

            var result = await Sut.FindByIdAsync(club.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(club.Id);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var result = await Sut.FindByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }

    public sealed class GetAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_ReturnsClub()
        {
            var club = BuildClub();
            await Sut.AddAsync(club);

            var result = await Sut.GetAsync(club.Id);

            result.Id.Should().Be(club.Id);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.GetAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class UpdateAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task UpdateAsync_ChangedName_PersistsChange()
        {
            var club = BuildClub();
            await Sut.AddAsync(club);

            var updatedName = Faker.Company.CompanyName();
            club.Name = updatedName;
            await Sut.UpdateAsync(club);

            var result = await Sut.FindByIdAsync(club.Id);
            result!.Name.Should().Be(updatedName);
        }
    }

    public sealed class DeleteAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task DeleteAsync_WhenExists_RemovesFromDatabase()
        {
            var club = BuildClub();
            await Sut.AddAsync(club);

            await Sut.DeleteAsync(club.Id);

            var result = await Sut.FindByIdAsync(club.Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.DeleteAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class FindByNameAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task FindByNameAsync_WhenExists_ReturnsClub()
        {
            var club = BuildClub();
            await Sut.AddAsync(club);

            var result = await Sut.FindByNameAsync(club.Name);

            result.Should().NotBeNull();
            result!.Id.Should().Be(club.Id);
            result.Name.Should().Be(club.Name);
        }

        [Fact]
        public async Task FindByNameAsync_WhenNotFound_ReturnsNull()
        {
            var result = await Sut.FindByNameAsync(Faker.Company.CompanyName());

            result.Should().BeNull();
        }
    }

    public sealed class ListAsync : ClubRepositoryTests
    {
        [Fact]
        public async Task ListAsync_WithNoData_ReturnsEmptyResult()
        {
            var result = await Sut.ListAsync(page: 1, pageSize: 50);

            result.Items.Should().BeEmpty();
            result.TotalCount.Should().Be(0);
        }

        [Fact]
        public async Task ListAsync_ReturnsAllClubs_OrderedByName()
        {
            var beta = BuildClub();
            beta.Name = "Beta Co";
            var alpha = BuildClub();
            alpha.Name = "Alpha Co";
            await Sut.AddAsync(beta);
            await Sut.AddAsync(alpha);

            var result = await Sut.ListAsync(page: 1, pageSize: 10);

            result.TotalCount.Should().Be(2);
            result.Items.Select(c => c.Club.Name).Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task ListAsync_WithFilterText_ReturnsMatchingClubs()
        {
            var match = BuildClub();
            match.Name = "Acme Corporation";
            var noMatch = BuildClub();
            noMatch.Name = "Beta Industries";
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "Acme");

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(c => c.Club.Name == "Acme Corporation");
        }

        [Fact]
        public async Task ListAsync_FilterText_PartialName_ReturnsMatching()
        {
            var club = BuildClub();
            club.Name = "Acme Corporation";
            await Sut.AddAsync(club);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "Corporation");

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(c => c.Club.Name == "Acme Corporation");
        }

        [Fact]
        public async Task ListAsync_WithFilterText_NoMatch_ReturnsEmpty()
        {
            var club = BuildClub();
            club.Name = "Acme Corporation";
            await Sut.AddAsync(club);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "xyz_no_match");

            result.TotalCount.Should().Be(0);
            result.Items.Should().BeEmpty();
        }

        [Fact]
        public async Task ListAsync_FilterText_MatchesStreetAddress()
        {
            var match = BuildClub();
            match.Name = "Unrelated Name";
            match.StreetAddress = "500 Rocky Mountain Way";
            var noMatch = BuildClub();
            noMatch.Name = "Other Club";
            noMatch.StreetAddress = "1 Beach Rd";
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "Rocky Mountain");

            result.TotalCount.Should().Be(1);
            result
                .Items.Should()
                .ContainSingle(c => c.Club.StreetAddress == "500 Rocky Mountain Way");
        }

        [Fact]
        public async Task ListAsync_FilterText_MatchesCity()
        {
            var match = BuildClub();
            match.Name = "Unrelated Name";
            match.City = "Denver";
            var noMatch = BuildClub();
            noMatch.Name = "Other Club";
            noMatch.City = "Miami";
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "Denver");

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(c => c.Club.City == "Denver");
        }

        [Fact]
        public async Task ListAsync_Paging_ReturnsCorrectPage()
        {
            for (var i = 1; i <= 5; i++)
            {
                var c = BuildClub();
                c.Name = $"Club {i:00}";
                await Sut.AddAsync(c);
            }

            var page1 = await Sut.ListAsync(page: 1, pageSize: 2);
            var page2 = await Sut.ListAsync(page: 2, pageSize: 2);
            var page3 = await Sut.ListAsync(page: 3, pageSize: 2);

            page1.Items.Should().HaveCount(2);
            page1.TotalCount.Should().Be(5);
            page2.Items.Should().HaveCount(2);
            page3.Items.Should().HaveCount(1);
        }

        [Fact]
        public async Task ListAsync_ReturnsCorrectPageCount()
        {
            for (var i = 0; i < 3; i++)
                await Sut.AddAsync(BuildClub());

            var (items, totalCount) = await Sut.ListAsync(page: 1, pageSize: 2);

            items.Should().HaveCount(2);
            totalCount.Should().Be(3);
        }

        [Fact]
        public async Task ListAsync_SortByName_Ascending_ReturnsSortedResults()
        {
            var b = BuildClub();
            b.Name = "Z Co";
            var a = BuildClub();
            a.Name = "A Co";
            await Sut.AddAsync(b);
            await Sut.AddAsync(a);

            var result = await Sut.ListAsync(
                page: 1,
                pageSize: 10,
                sortBy: "name",
                sortDescending: false
            );

            result.Items.Select(c => c.Club.Name).Should().BeInAscendingOrder();
        }
    }
}
