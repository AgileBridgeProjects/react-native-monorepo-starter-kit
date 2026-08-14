using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Tests.Multitenancy;

/// <summary>
/// Verifies that EF Core global query filters prevent reads from leaking records
/// across tenant boundaries.
///
/// Each test class creates two isolated clubs (tenantA, tenantB), seeds records
/// for both, and asserts that queries scoped to tenantA only return tenantA's data.
/// </summary>
public abstract class MultitenancyIsolationTests : IDisposable
{
    protected readonly AppDbContext TenantAContext;
    protected readonly AppDbContext TenantBContext;
    protected readonly AppDbContext UnfilteredContext;
    protected static readonly Faker Faker = new();

    protected readonly Guid TenantAId;
    protected readonly Guid TenantBId;

    protected MultitenancyIsolationTests()
    {
        // All three contexts share the same in-memory database so seed data is visible
        // across all of them, but filtering is applied per context based on the injected
        // ITenantContext.
        var dbName = Guid.NewGuid().ToString();

        TenantAId = Guid.NewGuid();
        TenantBId = Guid.NewGuid();

        var tenantAContext = new StubTenantContext(TenantAId);
        var tenantBContext = new StubTenantContext(TenantBId);

        var sharedOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        TenantAContext = new AppDbContext(sharedOptions, tenantAContext);
        TenantBContext = new AppDbContext(sharedOptions, tenantBContext);
        UnfilteredContext = new AppDbContext(sharedOptions); // no tenant context — simulates migrator/background

        UnfilteredContext.Clubs.Add(
            new Club
            {
                Id = TenantAId,
                Name = "Tenant A",
                CreatedAt = DateTime.UtcNow,
            }
        );
        UnfilteredContext.Clubs.Add(
            new Club
            {
                Id = TenantBId,
                Name = "Tenant B",
                CreatedAt = DateTime.UtcNow,
            }
        );

        UnfilteredContext.SaveChanges();
    }

    public void Dispose()
    {
        TenantAContext.Dispose();
        TenantBContext.Dispose();
        UnfilteredContext.Dispose();
    }

    /// <summary>Stub implementation of ITenantContext for tests — active with a fixed ClubId.</summary>
    protected sealed class StubTenantContext(Guid clubId) : ITenantContext
    {
        public Guid? ClubId { get; } = clubId;
        public bool IsActive { get; } = true;
    }

    // -------------------------------------------------------------------------
    // UserEntity isolation
    // -------------------------------------------------------------------------

    public sealed class Users_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantAUsers()
        {
            // Arrange
            var tenantAUser = new UserEntity
            {
                Id = Guid.NewGuid(),
                ClubId = TenantAId,
                ExternalAuthId = "firebase|a",
                Email = "a@tenant-a.com",
                DisplayName = "User A",
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBUser = new UserEntity
            {
                Id = Guid.NewGuid(),
                ClubId = TenantBId,
                ExternalAuthId = "firebase|b",
                Email = "b@tenant-b.com",
                DisplayName = "User B",
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.Users.AddRange(tenantAUser, tenantBUser);
            await UnfilteredContext.SaveChangesAsync();

            // Act
            var results = await TenantAContext.Users.AsNoTracking().ToListAsync();

            // Assert
            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantAUser.Id);
            results.Should().NotContain(u => u.Id == tenantBUser.Id);
        }
    }

    // -------------------------------------------------------------------------
    // Team isolation
    // -------------------------------------------------------------------------

    public sealed class Teams_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantATeams()
        {
            var tenantASeason = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = TenantAId,
                StartDate = new DateOnly(2025, 1, 1),
                EndDate = new DateOnly(2025, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBSeason = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = TenantBId,
                StartDate = new DateOnly(2025, 1, 1),
                EndDate = new DateOnly(2025, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.Seasons.AddRange(tenantASeason, tenantBSeason);
            await UnfilteredContext.SaveChangesAsync();

            var tenantATeam = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = tenantASeason.Id,
                Name = Faker.Commerce.Department(),
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBTeam = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = tenantBSeason.Id,
                Name = Faker.Commerce.Department(),
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.Teams.AddRange(tenantATeam, tenantBTeam);
            await UnfilteredContext.SaveChangesAsync();

            var results = await TenantAContext.Teams.AsNoTracking().ToListAsync();

            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantATeam.Id);
            results.Should().NotContain(x => x.Id == tenantBTeam.Id);
        }
    }

    // -------------------------------------------------------------------------
    // Season isolation
    // -------------------------------------------------------------------------

    public sealed class Seasons_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantASeasons()
        {
            var tenantASeason = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = TenantAId,
                StartDate = new DateOnly(2025, 1, 1),
                EndDate = new DateOnly(2025, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBSeason = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = TenantBId,
                StartDate = new DateOnly(2025, 1, 1),
                EndDate = new DateOnly(2025, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.Seasons.AddRange(tenantASeason, tenantBSeason);
            await UnfilteredContext.SaveChangesAsync();

            var results = await TenantAContext.Seasons.AsNoTracking().ToListAsync();

            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantASeason.Id);
            results.Should().NotContain(x => x.Id == tenantBSeason.Id);
        }
    }

    // -------------------------------------------------------------------------
    // DailyClubSnapshot isolation
    // -------------------------------------------------------------------------

    public sealed class DailyClubSnapshots_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantARecords()
        {
            // Arrange
            var tenantASnapshot = new DailyClubSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = TenantAId,
                Date = new DateOnly(2025, 1, 1),
                TotalActivePlayers = 10,
                TotalSessions = 20,
                TotalCorrectAnswers = 15,
                TotalAnswers = 20,
                AverageAccuracy = 75m,
                TotalCompletions = 5,
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBSnapshot = new DailyClubSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = TenantBId,
                Date = new DateOnly(2025, 1, 1),
                TotalActivePlayers = 5,
                TotalSessions = 10,
                TotalCorrectAnswers = 8,
                TotalAnswers = 10,
                AverageAccuracy = 80m,
                TotalCompletions = 3,
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.DailyClubSnapshots.AddRange(tenantASnapshot, tenantBSnapshot);
            await UnfilteredContext.SaveChangesAsync();

            // Act
            var results = await TenantAContext.DailyClubSnapshots.AsNoTracking().ToListAsync();

            // Assert
            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantASnapshot.Id);
            results.Should().NotContain(r => r.Id == tenantBSnapshot.Id);
        }
    }

    // -------------------------------------------------------------------------
    // DailyTeamSnapshot isolation
    // -------------------------------------------------------------------------

    public sealed class DailyTeamSnapshots_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantARecords()
        {
            // Arrange
            var tenantASnapshot = new DailyTeamSnapshot
            {
                Id = Guid.NewGuid(),
                TeamId = Guid.NewGuid(),
                ClubId = TenantAId,
                Date = new DateOnly(2025, 4, 1),
                TotalActivePlayers = 8,
                TotalSessions = 15,
                CorrectAnswers = 12,
                TotalAnswers = 15,
                AverageAccuracy = 80m,
                CompletionRate = 70m,
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBSnapshot = new DailyTeamSnapshot
            {
                Id = Guid.NewGuid(),
                TeamId = Guid.NewGuid(),
                ClubId = TenantBId,
                Date = new DateOnly(2025, 4, 1),
                TotalActivePlayers = 4,
                TotalSessions = 8,
                CorrectAnswers = 6,
                TotalAnswers = 8,
                AverageAccuracy = 75m,
                CompletionRate = 60m,
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.DailyTeamSnapshots.AddRange(tenantASnapshot, tenantBSnapshot);
            await UnfilteredContext.SaveChangesAsync();

            // Act
            var results = await TenantAContext.DailyTeamSnapshots.AsNoTracking().ToListAsync();

            // Assert
            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantASnapshot.Id);
            results.Should().NotContain(r => r.Id == tenantBSnapshot.Id);
        }
    }

    // -------------------------------------------------------------------------
    // UserReportingExclusion isolation
    // -------------------------------------------------------------------------

    public sealed class UserReportingExclusions_AreIsolatedByTenant : MultitenancyIsolationTests
    {
        [Fact]
        public async Task Query_WhenTenantAContextUsed_ReturnsOnlyTenantARecords()
        {
            // Arrange
            var tenantAExclusion = new UserReportingExclusion
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                ClubId = TenantAId,
                Reason = "Test exclusion A",
                CreatedAt = DateTime.UtcNow,
            };
            var tenantBExclusion = new UserReportingExclusion
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
                ClubId = TenantBId,
                Reason = "Test exclusion B",
                CreatedAt = DateTime.UtcNow,
            };
            UnfilteredContext.UserReportingExclusions.AddRange(tenantAExclusion, tenantBExclusion);
            await UnfilteredContext.SaveChangesAsync();

            // Act
            var results = await TenantAContext.UserReportingExclusions.AsNoTracking().ToListAsync();

            // Assert
            results.Should().HaveCount(1);
            results[0].Id.Should().Be(tenantAExclusion.Id);
            results.Should().NotContain(r => r.Id == tenantBExclusion.Id);
        }
    }
}
