using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Diagnostics.Internal;
using StarterKit.Data.Auditing;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Teams.Repositories;

namespace StarterKit.Data.Tests.Teams.Repositories;

public abstract class TeamRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly TeamRepository Sut;
    protected static readonly Faker Faker = new();
    protected readonly Guid ExistingClubId;
    protected readonly Guid ExistingSeasonId;

    protected TeamRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new TeamRepository(DbContext);

        ExistingClubId = Guid.NewGuid();
        DbContext.Clubs.Add(
            new Club
            {
                Id = ExistingClubId,
                Name = Faker.Company.CompanyName(),
                CreatedAt = DateTime.UtcNow,
            }
        );

        ExistingSeasonId = Guid.NewGuid();
        DbContext.Seasons.Add(
            new Season
            {
                Id = ExistingSeasonId,
                ClubId = ExistingClubId,
                StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
                EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
                CreatedAt = DateTime.UtcNow,
            }
        );
        DbContext.SaveChanges();
    }

    public void Dispose() => DbContext.Dispose();

    /// <summary>Seeds a Club + Season and returns the new SeasonId.</summary>
    protected Guid SeedClubWithSeason()
    {
        var clubId = Guid.NewGuid();
        DbContext.Clubs.Add(
            new Club
            {
                Id = clubId,
                Name = Faker.Company.CompanyName(),
                CreatedAt = DateTime.UtcNow,
            }
        );
        var seasonId = Guid.NewGuid();
        DbContext.Seasons.Add(
            new Season
            {
                Id = seasonId,
                ClubId = clubId,
                StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
                EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
                CreatedAt = DateTime.UtcNow,
            }
        );
        DbContext.SaveChanges();
        return seasonId;
    }

    protected async Task<Guid> SeedUserAsync()
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = Guid.NewGuid().ToString(),
            ClubId = ExistingClubId,
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = Faker.Name.FullName(),
            CreatedAt = DateTime.UtcNow,
        };
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();
        return user.Id;
    }

    protected Team BuildTeam() =>
        new()
        {
            Id = Guid.NewGuid(),
            SeasonId = ExistingSeasonId,
            Name = Faker.Commerce.Department(),
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class AddAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task AddAsync_WithValidTeam_PersistsToDatabase()
        {
            var team = BuildTeam();

            await Sut.AddAsync(team);

            var result = await DbContext.Teams.FindAsync(team.Id);
            result.Should().NotBeNull();
            result!.Id.Should().Be(team.Id);
            result.SeasonId.Should().Be(team.SeasonId);
            result.Name.Should().Be(team.Name);
        }
    }

    public sealed class FindByIdAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsTeam()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);

            var result = await Sut.FindByIdAsync(team.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(team.Id);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var result = await Sut.FindByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }
    }

    public sealed class FindByIdAsync_WithTenantContext : IDisposable
    {
        private readonly AppDbContext _tenantAContext;
        private readonly AppDbContext _unfilteredContext;
        private readonly Guid _tenantAId = Guid.NewGuid();
        private readonly Guid _tenantBId = Guid.NewGuid();
        private readonly TeamRepository Sut;

        public FindByIdAsync_WithTenantContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            _unfilteredContext = new AppDbContext(options);
            _tenantAContext = new AppDbContext(options, new StubTenantContext(_tenantAId));
            Sut = new TeamRepository(_tenantAContext);

            _unfilteredContext.Clubs.AddRange(
                new Club
                {
                    Id = _tenantAId,
                    Name = Faker.Company.CompanyName(),
                    CreatedAt = DateTime.UtcNow,
                },
                new Club
                {
                    Id = _tenantBId,
                    Name = Faker.Company.CompanyName(),
                    CreatedAt = DateTime.UtcNow,
                }
            );
            _unfilteredContext.SaveChanges();
        }

        public void Dispose()
        {
            _tenantAContext.Dispose();
            _unfilteredContext.Dispose();
        }

        [Fact]
        public async Task FindByIdAsync_WhenTeamBelongsToDifferentTenant_ReturnsNull()
        {
            var tenantBSeason = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = _tenantBId,
                StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
                EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            _unfilteredContext.Seasons.Add(tenantBSeason);
            await _unfilteredContext.SaveChangesAsync();

            var tenantBTeam = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = tenantBSeason.Id,
                Name = Faker.Commerce.Department(),
                CreatedAt = DateTime.UtcNow,
            };
            _unfilteredContext.Teams.Add(tenantBTeam);
            await _unfilteredContext.SaveChangesAsync();

            var result = await Sut.FindByIdAsync(tenantBTeam.Id);

            result.Should().BeNull();
        }

        private sealed class StubTenantContext(Guid clubId) : ITenantContext
        {
            public Guid? ClubId { get; } = clubId;
            public bool IsActive { get; } = true;
        }
    }

    public sealed class GetAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_ReturnsTeam()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);

            var result = await Sut.GetAsync(team.Id);

            result.Id.Should().Be(team.Id);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.GetAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class UpdateAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task UpdateAsync_ChangedName_PersistsChange()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);

            team.Name = Faker.Commerce.Department();
            await Sut.UpdateAsync(team);

            var result = await Sut.FindByIdAsync(team.Id);
            result!.Name.Should().Be(team.Name);
        }
    }

    public sealed class DeleteAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task DeleteAsync_WhenExists_RemovesFromDatabase()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);

            await Sut.DeleteAsync(team.Id);

            var result = await Sut.FindByIdAsync(team.Id);
            result.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_ThrowsInvalidOperationException()
        {
            var act = async () => await Sut.DeleteAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class ListAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task ListAsync_WithNoData_ReturnsEmptyResult()
        {
            var result = await Sut.ListAsync(page: 1, pageSize: 50);

            result.Items.Should().BeEmpty();
            result.TotalCount.Should().Be(0);
        }

        [Fact]
        public async Task ListAsync_ReturnsTeams_OrderedByName()
        {
            var beta = BuildTeam();
            beta.Name = "Beta";
            var alpha = BuildTeam();
            alpha.Name = "Alpha";
            await Sut.AddAsync(beta);
            await Sut.AddAsync(alpha);

            var result = await Sut.ListAsync(page: 1, pageSize: 10);

            result.TotalCount.Should().Be(2);
            result.Items.Select(x => x.Team.Name).Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task ListAsync_WithClubId_ReturnsMatchingTeams()
        {
            var otherSeasonId = SeedClubWithSeason();

            var match = BuildTeam();
            var noMatch = BuildTeam();
            noMatch.SeasonId = otherSeasonId;
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, clubId: ExistingClubId);

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(x => x.Team.Id == match.Id);
        }

        [Fact]
        public async Task ListAsync_WithSeasonId_ReturnsMatchingTeams()
        {
            var otherSeasonId = SeedClubWithSeason();

            var match = BuildTeam();
            var noMatch = BuildTeam();
            noMatch.SeasonId = otherSeasonId;
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, seasonId: ExistingSeasonId);

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(x => x.Team.Id == match.Id);
        }

        [Fact]
        public async Task ListAsync_WithFilterText_ReturnsMatchingTeams()
        {
            var match = BuildTeam();
            match.Name = "Learning Operations";
            var noMatch = BuildTeam();
            noMatch.Name = "Finance";
            await Sut.AddAsync(match);
            await Sut.AddAsync(noMatch);

            var result = await Sut.ListAsync(page: 1, pageSize: 50, filterText: "Learning");

            result.TotalCount.Should().Be(1);
            result.Items.Should().ContainSingle(x => x.Team.Name == "Learning Operations");
        }

        [Fact]
        public async Task ListAsync_Paging_ReturnsCorrectPage()
        {
            for (var i = 1; i <= 5; i++)
            {
                var team = BuildTeam();
                team.Name = $"Team {i:00}";
                await Sut.AddAsync(team);
            }

            var page1 = await Sut.ListAsync(page: 1, pageSize: 2);
            var page2 = await Sut.ListAsync(page: 2, pageSize: 2);
            var page3 = await Sut.ListAsync(page: 3, pageSize: 2);

            page1.Items.Should().HaveCount(2);
            page1.TotalCount.Should().Be(5);
            page2.Items.Should().HaveCount(2);
            page3.Items.Should().HaveCount(1);
        }
    }

    public sealed class FindByNameInSeasonAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task FindByNameInSeasonAsync_WhenMatchExists_ReturnsTeam()
        {
            var team = BuildTeam();
            team.Name = "Engineering";
            await Sut.AddAsync(team);

            var result = await Sut.FindByNameInSeasonAsync(ExistingSeasonId, "Engineering");

            result.Should().NotBeNull();
            result!.Id.Should().Be(team.Id);
        }

        [Fact]
        public async Task FindByNameInSeasonAsync_WhenNoMatch_ReturnsNull()
        {
            var result = await Sut.FindByNameInSeasonAsync(ExistingSeasonId, "NonExistent");

            result.Should().BeNull();
        }

        [Fact]
        public async Task FindByNameInSeasonAsync_WhenDifferentSeason_ReturnsNull()
        {
            var otherSeasonId = SeedClubWithSeason();

            var team = BuildTeam();
            team.SeasonId = otherSeasonId;
            team.Name = "Engineering";
            await Sut.AddAsync(team);

            var result = await Sut.FindByNameInSeasonAsync(ExistingSeasonId, "Engineering");

            result.Should().BeNull();
        }

        [Fact]
        public async Task FindByNameInSeasonAsync_WhenSoftDeleted_ReturnsNull()
        {
            var team = BuildTeam();
            team.Name = "Engineering";
            await Sut.AddAsync(team);

            // Soft-delete by bypassing the repository (direct DB manipulation)
            team.IsDeleted = true;
            await DbContext.SaveChangesAsync();
            DbContext.ChangeTracker.Clear();

            var result = await Sut.FindByNameInSeasonAsync(ExistingSeasonId, "Engineering");

            result.Should().BeNull();
        }

        [Fact]
        public async Task FindByNameInSeasonAsync_WhenExcludeIdMatches_ReturnsNull()
        {
            var team = BuildTeam();
            team.Name = "Engineering";
            await Sut.AddAsync(team);

            var result = await Sut.FindByNameInSeasonAsync(
                ExistingSeasonId,
                "Engineering",
                excludeId: team.Id
            );

            result.Should().BeNull();
        }

        [Fact]
        public async Task FindByNameInSeasonAsync_WhenExcludeIdDoesNotMatch_ReturnsTeam()
        {
            var team = BuildTeam();
            team.Name = "Engineering";
            await Sut.AddAsync(team);

            var result = await Sut.FindByNameInSeasonAsync(
                ExistingSeasonId,
                "Engineering",
                excludeId: Guid.NewGuid()
            );

            result.Should().NotBeNull();
            result!.Id.Should().Be(team.Id);
        }
    }

    public sealed class ListNamesAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task ListNamesAsync_WhenNoTeams_ReturnsEmpty()
        {
            var result = await Sut.ListNamesAsync(ExistingClubId);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ListNamesAsync_ReturnsOnlyTeamsForClub()
        {
            var otherSeasonId = SeedClubWithSeason();

            var dept = BuildTeam();
            dept.Name = "Alpha";
            await Sut.AddAsync(dept);

            var otherDept = BuildTeam();
            otherDept.SeasonId = otherSeasonId;
            otherDept.Name = "Beta";
            await Sut.AddAsync(otherDept);

            var result = await Sut.ListNamesAsync(ExistingClubId);

            result.Should().ContainSingle();
            result[0].Id.Should().Be(dept.Id);
            result[0].Name.Should().Be("Alpha");
        }

        [Fact]
        public async Task ListNamesAsync_ReturnsNamesOrderedAlphabetically()
        {
            foreach (var name in new[] { "Zeta", "Alpha", "Mango" })
            {
                var d = BuildTeam();
                d.Name = name;
                await Sut.AddAsync(d);
            }

            var result = await Sut.ListNamesAsync(ExistingClubId);

            result.Select(x => x.Name).Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task ListNamesAsync_ExcludesSoftDeletedTeams()
        {
            var dept = BuildTeam();
            dept.Name = "ToDelete";
            await Sut.AddAsync(dept);

            dept.IsDeleted = true;
            await DbContext.SaveChangesAsync();
            DbContext.ChangeTracker.Clear();

            var result = await Sut.ListNamesAsync(ExistingClubId);

            result.Should().BeEmpty();
        }
    }

    public sealed class AddUserTeamAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task AddUserTeamAsync_WithNewLink_PersistsToDatabase()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var userId = await SeedUserAsync();

            await Sut.AddUserTeamAsync(userId, team.Id);

            var exists = await Sut.UserTeamExistsAsync(userId, team.Id);
            exists.Should().BeTrue();
        }

        [Fact]
        public async Task AddUserTeamAsync_WhenLinkAlreadyExists_DoesNotThrowOrDuplicate()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, team.Id);

            await Sut.AddUserTeamAsync(userId, team.Id);

            var teamIds = await Sut.ListTeamIdsForUserAsync(userId);
            teamIds.Should().ContainSingle();
        }
    }

    public sealed class UserTeamExistsAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task UserTeamExistsAsync_WhenNoLink_ReturnsFalse()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var userId = await SeedUserAsync();

            var result = await Sut.UserTeamExistsAsync(userId, team.Id);

            result.Should().BeFalse();
        }
    }

    public sealed class ListTeamIdsForUserAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task ListTeamIdsForUserAsync_ReturnsAllLinkedTeams()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, teamA.Id);
            await Sut.AddUserTeamAsync(userId, teamB.Id);

            var result = await Sut.ListTeamIdsForUserAsync(userId);

            result.Should().BeEquivalentTo([teamA.Id, teamB.Id]);
        }

        [Fact]
        public async Task ListTeamIdsForUserAsync_WhenNoLinks_ReturnsEmpty()
        {
            var userId = await SeedUserAsync();

            var result = await Sut.ListTeamIdsForUserAsync(userId);

            result.Should().BeEmpty();
        }
    }

    public sealed class ListTeamsForUserAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task ListTeamsForUserAsync_ReturnsLinkedTeams_OrderedByName()
        {
            var teamB = BuildTeam();
            teamB.Name = "Beta";
            var teamA = BuildTeam();
            teamA.Name = "Alpha";
            await Sut.AddAsync(teamB);
            await Sut.AddAsync(teamA);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamsAsync(userId, [teamB.Id, teamA.Id]);

            var result = await Sut.ListTeamsForUserAsync(userId);

            result.Select(x => x.Name).Should().Equal("Alpha", "Beta");
        }

        [Fact]
        public async Task ListTeamsForUserAsync_WhenNoLinks_ReturnsEmpty()
        {
            var userId = await SeedUserAsync();

            var result = await Sut.ListTeamsForUserAsync(userId);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ListTeamsForUserAsync_OnlyReturnsTeamsLinkedToThisUser()
        {
            var team = BuildTeam();
            var otherTeam = BuildTeam();
            await Sut.AddAsync(team);
            await Sut.AddAsync(otherTeam);
            var userId = await SeedUserAsync();
            var otherUserId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, team.Id);
            await Sut.AddUserTeamAsync(otherUserId, otherTeam.Id);

            var result = await Sut.ListTeamsForUserAsync(userId);

            result.Should().ContainSingle(x => x.Id == team.Id);
        }
    }

    public sealed class CountTeamsInClubAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task CountTeamsInClubAsync_WhenAllTeamsBelongToClub_ReturnsFullCount()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);

            var result = await Sut.CountTeamsInClubAsync([teamA.Id, teamB.Id], ExistingClubId);

            result.Should().Be(2);
        }

        [Fact]
        public async Task CountTeamsInClubAsync_WhenATeamBelongsToAnotherClub_ExcludesIt()
        {
            var otherSeasonId = SeedClubWithSeason();
            var ownTeam = BuildTeam();
            var otherClubTeam = BuildTeam();
            otherClubTeam.SeasonId = otherSeasonId;
            await Sut.AddAsync(ownTeam);
            await Sut.AddAsync(otherClubTeam);

            var result = await Sut.CountTeamsInClubAsync(
                [ownTeam.Id, otherClubTeam.Id],
                ExistingClubId
            );

            result.Should().Be(1);
        }

        [Fact]
        public async Task CountTeamsInClubAsync_WhenTeamDoesNotExist_ExcludesIt()
        {
            var result = await Sut.CountTeamsInClubAsync([Guid.NewGuid()], ExistingClubId);

            result.Should().Be(0);
        }
    }

    public sealed class AddUserTeamsAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task AddUserTeamsAsync_WithNewLinks_PersistsAll()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();

            await Sut.AddUserTeamsAsync(userId, [teamA.Id, teamB.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEquivalentTo([teamA.Id, teamB.Id]);
        }

        [Fact]
        public async Task AddUserTeamsAsync_WhenSomeLinksAlreadyExist_SkipsThoseAndAddsRest()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, teamA.Id);

            await Sut.AddUserTeamsAsync(userId, [teamA.Id, teamB.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEquivalentTo([teamA.Id, teamB.Id]);
        }

        [Fact]
        public async Task AddUserTeamsAsync_WithEmptyList_DoesNothing()
        {
            var userId = await SeedUserAsync();

            await Sut.AddUserTeamsAsync(userId, []);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEmpty();
        }
    }

    public sealed class ReplaceUserTeamsAsync : TeamRepositoryTests
    {
        [Fact]
        public async Task ReplaceUserTeamsAsync_WhenNoExistingLinks_AddsAllGivenTeams()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();

            await Sut.ReplaceUserTeamsAsync(userId, [teamA.Id, teamB.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEquivalentTo([teamA.Id, teamB.Id]);
        }

        [Fact]
        public async Task ReplaceUserTeamsAsync_WhenTeamRemovedFromList_UnlinksIt()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamsAsync(userId, [teamA.Id, teamB.Id]);

            await Sut.ReplaceUserTeamsAsync(userId, [teamA.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEquivalentTo([teamA.Id]);
        }

        [Fact]
        public async Task ReplaceUserTeamsAsync_WithSameSet_IsIdempotent()
        {
            var teamA = BuildTeam();
            await Sut.AddAsync(teamA);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, teamA.Id);

            await Sut.ReplaceUserTeamsAsync(userId, [teamA.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().ContainSingle().Which.Should().Be(teamA.Id);
        }

        [Fact]
        public async Task ReplaceUserTeamsAsync_WithEmptyList_ClearsAllLinks()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamsAsync(userId, [teamA.Id, teamB.Id]);

            await Sut.ReplaceUserTeamsAsync(userId, []);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ReplaceUserTeamsAsync_AfterRemoval_CanReAddSameTeam()
        {
            // Regression guard for the partial-unique-index fix: soft-deleting a UserTeam link
            // must not block re-adding the same (UserId, TeamId) pair later.
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var userId = await SeedUserAsync();
            await Sut.AddUserTeamAsync(userId, team.Id);
            await Sut.ReplaceUserTeamsAsync(userId, []);

            await Sut.ReplaceUserTeamsAsync(userId, [team.Id]);

            var result = await Sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEquivalentTo([team.Id]);
        }
    }

    /// <summary>
    /// Regression coverage for the UserTeam soft-delete leak: every other test class in
    /// this file builds its <see cref="AppDbContext"/> without <see cref="AuditInterceptor"/>, so
    /// <c>DbSet.RemoveRange</c> in <c>ReplaceUserTeamsAsync</c> hard-deletes there — the exact
    /// opposite of what happens in every real environment, where the interceptor converts it to a
    /// soft delete. This class wires the interceptor in so removal actually leaves a tombstoned row,
    /// and asserts the global query filter (<c>AppDbContext.ApplySoftDeleteFilters</c>) excludes it.
    /// </summary>
    public sealed class SoftDeleteBehavior : IDisposable
    {
        private readonly AppDbContext _dbContext;
        private readonly TeamRepository _sut;

        public SoftDeleteBehavior()
        {
            var interceptor = new AuditInterceptor(TimeProvider.System, new StubAuditUserContext());
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .AddInterceptors(interceptor)
                .Options;

            _dbContext = new AppDbContext(options);
            _sut = new TeamRepository(_dbContext);
        }

        public void Dispose() => _dbContext.Dispose();

        private async Task<(Guid TeamId, Guid UserId)> SeedLinkedUserAndTeamAsync()
        {
            var club = new Club
            {
                Id = Guid.NewGuid(),
                Name = Faker.Company.CompanyName(),
                CreatedAt = DateTime.UtcNow,
            };
            _dbContext.Clubs.Add(club);
            var season = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = club.Id,
                StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
                EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            _dbContext.Seasons.Add(season);
            var team = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = season.Id,
                Name = Faker.Commerce.Department(),
                CreatedAt = DateTime.UtcNow,
            };
            _dbContext.Teams.Add(team);
            var user = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = club.Id,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
            };
            _dbContext.Users.Add(user);
            await _dbContext.SaveChangesAsync();
            return (team.Id, user.Id);
        }

        [Fact]
        public async Task RemovingATeamLink_SoftDeletesRatherThanHardDeletes()
        {
            var (teamId, userId) = await SeedLinkedUserAndTeamAsync();
            await _sut.AddUserTeamAsync(userId, teamId);

            await _sut.ReplaceUserTeamsAsync(userId, []);

            var raw = await _dbContext
                .UserTeams.IgnoreQueryFilters()
                .SingleAsync(x => x.UserId == userId && x.TeamId == teamId);
            raw.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task RemovingATeamLink_ExcludesItFromListTeamIdsForUserAsync()
        {
            var (teamId, userId) = await SeedLinkedUserAndTeamAsync();
            await _sut.AddUserTeamAsync(userId, teamId);

            await _sut.ReplaceUserTeamsAsync(userId, []);

            var result = await _sut.ListTeamIdsForUserAsync(userId);
            result.Should().BeEmpty();
        }

        [Fact]
        public async Task RemovingATeamLink_ExcludesItFromUserTeamExistsAsync()
        {
            var (teamId, userId) = await SeedLinkedUserAndTeamAsync();
            await _sut.AddUserTeamAsync(userId, teamId);

            await _sut.ReplaceUserTeamsAsync(userId, []);

            var exists = await _sut.UserTeamExistsAsync(userId, teamId);
            exists.Should().BeFalse();
        }

        [Fact]
        public async Task ReAddingARemovedTeamLink_InsertsAFreshRow_NotSkippedAsAlreadyLinked()
        {
            var (teamId, userId) = await SeedLinkedUserAndTeamAsync();
            await _sut.AddUserTeamAsync(userId, teamId);
            await _sut.ReplaceUserTeamsAsync(userId, []);

            await _sut.AddUserTeamAsync(userId, teamId);

            var result = await _sut.ListTeamIdsForUserAsync(userId);
            result.Should().ContainSingle().Which.Should().Be(teamId);

            // Both the tombstone and the fresh row exist — the partial unique index (filtered on
            // IsDeleted = false) is what makes this legal.
            var rows = await _dbContext
                .UserTeams.IgnoreQueryFilters()
                .Where(x => x.UserId == userId && x.TeamId == teamId)
                .ToListAsync();
            rows.Should().HaveCount(2);
        }

        private sealed class StubAuditUserContext : IAuditUserContext
        {
            public string? UserId => null;
            public Guid? ClubId => null;
        }
    }

    public sealed class ListUserIdsWithPermissionForTeamsAsync : TeamRepositoryTests
    {
        private const string Permission = "StarterKit.ReflectionAssignments.Assign";

        private async Task<Guid> SeedRoleWithPermissionAsync(string permission)
        {
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = Faker.Name.JobTitle() };
            DbContext.Roles.Add(role);
            DbContext.RolePermissions.Add(
                new RolePermissionEntity
                {
                    Id = Guid.NewGuid(),
                    RoleId = role.Id,
                    Permission = permission,
                }
            );
            await DbContext.SaveChangesAsync();
            return role.Id;
        }

        private async Task AssignRoleAsync(Guid userId, Guid roleId)
        {
            DbContext.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    RoleId = roleId,
                }
            );
            await DbContext.SaveChangesAsync();
        }

        [Fact]
        public async Task ReturnsAUserLinkedToTheTeamWhoHoldsThePermission()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var coachId = await SeedUserAsync();
            var roleId = await SeedRoleWithPermissionAsync(Permission);
            await AssignRoleAsync(coachId, roleId);
            await Sut.AddUserTeamAsync(coachId, team.Id);

            var result = await Sut.ListUserIdsWithPermissionForTeamsAsync([team.Id], Permission);

            result.Should().ContainSingle().Which.Should().Be(coachId);
        }

        [Fact]
        public async Task ExcludesAUserLinkedToTheTeamWithoutThePermission()
        {
            var team = BuildTeam();
            await Sut.AddAsync(team);
            var athleteId = await SeedUserAsync();
            var roleId = await SeedRoleWithPermissionAsync("StarterKit.SomeOther.Permission");
            await AssignRoleAsync(athleteId, roleId);
            await Sut.AddUserTeamAsync(athleteId, team.Id);

            var result = await Sut.ListUserIdsWithPermissionForTeamsAsync([team.Id], Permission);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesAUserWithThePermissionOnAnUnrelatedTeam()
        {
            var team = BuildTeam();
            var otherTeam = BuildTeam();
            await Sut.AddAsync(team);
            await Sut.AddAsync(otherTeam);
            var coachId = await SeedUserAsync();
            var roleId = await SeedRoleWithPermissionAsync(Permission);
            await AssignRoleAsync(coachId, roleId);
            await Sut.AddUserTeamAsync(coachId, otherTeam.Id);

            var result = await Sut.ListUserIdsWithPermissionForTeamsAsync([team.Id], Permission);

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task DeduplicatesACoachLinkedToMultipleOfTheGivenTeams()
        {
            var teamA = BuildTeam();
            var teamB = BuildTeam();
            await Sut.AddAsync(teamA);
            await Sut.AddAsync(teamB);
            var coachId = await SeedUserAsync();
            var roleId = await SeedRoleWithPermissionAsync(Permission);
            await AssignRoleAsync(coachId, roleId);
            await Sut.AddUserTeamAsync(coachId, teamA.Id);
            await Sut.AddUserTeamAsync(coachId, teamB.Id);

            var result = await Sut.ListUserIdsWithPermissionForTeamsAsync(
                [teamA.Id, teamB.Id],
                Permission
            );

            result.Should().ContainSingle().Which.Should().Be(coachId);
        }

        [Fact]
        public async Task WithNoTeamIds_ReturnsEmptyWithoutQuerying()
        {
            var result = await Sut.ListUserIdsWithPermissionForTeamsAsync([], Permission);

            result.Should().BeEmpty();
        }
    }
}
