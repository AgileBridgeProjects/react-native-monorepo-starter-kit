using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory.Diagnostics.Internal;
using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Reports.Repositories;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Data.Tests.Reports.Repositories;

public abstract class UserLeaveRecordRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly UserLeaveRecordRepository Sut;

    protected UserLeaveRecordRepositoryTests()
    {
        var interceptor = new AuditInterceptor(TimeProvider.System, new StubAuditUserContext());

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .AddInterceptors(interceptor)
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new UserLeaveRecordRepository(DbContext);
    }

    public void Dispose() => DbContext.Dispose();

    protected Guid SeedUser(Guid clubId, string name = "Player", Guid? teamId = null)
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            DisplayName = name,
            Email = $"{Guid.NewGuid():N}@example.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        DbContext.Users.Add(user);
        if (teamId is { } id)
            DbContext.UserTeams.Add(
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    TeamId = id,
                }
            );
        DbContext.SaveChanges();
        return user.Id;
    }

    protected Guid SeedTeam(Guid clubId, string name = "Sales")
    {
        var season = new Season
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
            EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
        };
        DbContext.Seasons.Add(season);

        var dept = new Team
        {
            Id = Guid.NewGuid(),
            SeasonId = season.Id,
            Name = name,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = "test",
        };
        DbContext.Teams.Add(dept);
        DbContext.SaveChanges();
        return dept.Id;
    }

    protected async Task<Guid> AddLeaveAsync(
        Guid userId,
        Guid clubId,
        DateOnly start,
        DateOnly end,
        string? reason = null
    )
    {
        var record = new UserLeaveRecord
        {
            UserId = userId,
            ClubId = clubId,
            StartDate = start,
            EndDate = end,
            Reason = reason,
        };
        await Sut.AddAsync(record);
        return record.Id;
    }

    private sealed class StubAuditUserContext : IAuditUserContext
    {
        public string? UserId => null;
        public Guid? ClubId => null;
    }

    public sealed class GetAllWithDisplayNamesAsync : UserLeaveRecordRepositoryTests
    {
        [Fact]
        public async Task ReturnsRecordsWithPlayerAndTeamNames()
        {
            var clubId = Guid.NewGuid();
            var deptId = SeedTeam(clubId, "Service");
            var userId = SeedUser(clubId, "Jane Leave", deptId);
            await AddLeaveAsync(
                userId,
                clubId,
                new DateOnly(2026, 6, 1),
                new DateOnly(2026, 6, 5),
                "Annual leave"
            );

            var rows = await Sut.GetAllWithDisplayNamesAsync(clubId);

            rows.Should().ContainSingle();
            rows[0].DisplayName.Should().Be("Jane Leave");
            rows[0].TeamName.Should().Be("Service");
            rows[0].Reason.Should().Be("Annual leave");
        }

        [Fact]
        public async Task ScopesToTheClub()
        {
            var clubA = Guid.NewGuid();
            var clubB = Guid.NewGuid();
            var userA = SeedUser(clubA, "Club A Player");
            var userB = SeedUser(clubB, "Club B Player");
            await AddLeaveAsync(userA, clubA, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 5));
            await AddLeaveAsync(userB, clubB, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 5));

            var rows = await Sut.GetAllWithDisplayNamesAsync(clubA);

            rows.Should().ContainSingle();
            rows[0].DisplayName.Should().Be("Club A Player");
        }
    }

    public sealed class DeleteByIdAsync : UserLeaveRecordRepositoryTests
    {
        [Fact]
        public async Task SoftDeletesTheRecord()
        {
            var clubId = Guid.NewGuid();
            var userId = SeedUser(clubId);
            var id = await AddLeaveAsync(
                userId,
                clubId,
                new DateOnly(2026, 6, 1),
                new DateOnly(2026, 6, 5)
            );

            await Sut.DeleteByIdAsync(id, clubId);

            var rows = await Sut.GetAllWithDisplayNamesAsync(clubId);
            rows.Should().BeEmpty();
        }

        [Fact]
        public async Task ThrowsWhenRecordBelongsToAnotherClub()
        {
            var clubId = Guid.NewGuid();
            var userId = SeedUser(clubId);
            var id = await AddLeaveAsync(
                userId,
                clubId,
                new DateOnly(2026, 6, 1),
                new DateOnly(2026, 6, 5)
            );

            var act = async () => await Sut.DeleteByIdAsync(id, Guid.NewGuid());

            await act.Should().ThrowAsync<Exception>();
        }
    }

    public sealed class GetUserIdsOnLeaveForDateAsync : UserLeaveRecordRepositoryTests
    {
        [Fact]
        public async Task ReturnsUsersWhoseLeaveCoversTheDate()
        {
            var clubId = Guid.NewGuid();
            var onLeave = SeedUser(clubId, "On Leave");
            var notOnLeave = SeedUser(clubId, "Working");
            await AddLeaveAsync(
                onLeave,
                clubId,
                new DateOnly(2026, 6, 1),
                new DateOnly(2026, 6, 10)
            );
            await AddLeaveAsync(
                notOnLeave,
                clubId,
                new DateOnly(2026, 6, 20),
                new DateOnly(2026, 6, 25)
            );

            var ids = await Sut.GetUserIdsOnLeaveForDateAsync(new DateOnly(2026, 6, 5));

            ids.Should().ContainSingle().Which.Should().Be(onLeave);
        }

        [Fact]
        public async Task IsInclusiveOfTheBoundaryDates()
        {
            var clubId = Guid.NewGuid();
            var userId = SeedUser(clubId);
            await AddLeaveAsync(userId, clubId, new DateOnly(2026, 6, 1), new DateOnly(2026, 6, 5));

            (await Sut.GetUserIdsOnLeaveForDateAsync(new DateOnly(2026, 6, 1)))
                .Should()
                .Contain(userId);
            (await Sut.GetUserIdsOnLeaveForDateAsync(new DateOnly(2026, 6, 5)))
                .Should()
                .Contain(userId);
            (await Sut.GetUserIdsOnLeaveForDateAsync(new DateOnly(2026, 6, 6))).Should().BeEmpty();
        }
    }
}
