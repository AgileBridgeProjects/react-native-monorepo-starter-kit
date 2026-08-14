using Bogus;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Reports.Repositories;

namespace StarterKit.Data.Tests.Reports.Repositories;

public abstract class ReportSnapshotRepositoryTests : IDisposable
{
    protected readonly AppDbContext DbContext;
    protected readonly ReportSnapshotRepository Sut;
    protected static readonly Faker Faker = new();

    protected ReportSnapshotRepositoryTests()
    {
        var interceptor = new AuditInterceptor(TimeProvider.System, new StubAuditUserContext());

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .AddInterceptors(interceptor)
            .Options;

        DbContext = new AppDbContext(options);
        Sut = new ReportSnapshotRepository(DbContext);
    }

    public void Dispose() => DbContext.Dispose();

    protected static DailyClubSnapshot BuildClubSnapshot(
        Guid? clubId = null,
        DateOnly? date = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            ClubId = clubId ?? Guid.NewGuid(),
            Date = date ?? DateOnly.FromDateTime(DateTime.UtcNow),
            TotalActivePlayers = Faker.Random.Int(0, 200),
            TotalSessions = Faker.Random.Int(0, 500),
            TotalCorrectAnswers = Faker.Random.Int(0, 1000),
            TotalAnswers = Faker.Random.Int(1, 1000),
            AverageAccuracy = Faker.Random.Decimal(0, 100),
            TotalCompletions = Faker.Random.Int(0, 200),
            CreatedAt = DateTime.UtcNow,
        };

    protected static DailyTeamSnapshot BuildTeamSnapshot(
        Guid? teamId = null,
        Guid? clubId = null,
        DateOnly? date = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            TeamId = teamId ?? Guid.NewGuid(),
            ClubId = clubId ?? Guid.NewGuid(),
            Date = date ?? DateOnly.FromDateTime(DateTime.UtcNow),
            TotalActivePlayers = Faker.Random.Int(0, 50),
            TotalSessions = Faker.Random.Int(0, 200),
            CorrectAnswers = Faker.Random.Int(0, 500),
            TotalAnswers = Faker.Random.Int(1, 500),
            AverageAccuracy = Faker.Random.Decimal(0, 100),
            CompletionRate = Faker.Random.Decimal(0, 100),
            CreatedAt = DateTime.UtcNow,
        };

    public sealed class GetClubSnapshotsAsync : ReportSnapshotRepositoryTests
    {
        [Fact]
        public async Task GetClubSnapshotsAsync_WhenSnapshotsExistInRange_ReturnsMatchingSnapshots()
        {
            var clubId = Guid.NewGuid();
            var from = new DateOnly(2025, 1, 1);
            var to = new DateOnly(2025, 1, 7);
            var inRange = BuildClubSnapshot(clubId, new DateOnly(2025, 1, 3));
            var outOfRange = BuildClubSnapshot(clubId, new DateOnly(2025, 2, 1));
            await Sut.UpsertClubSnapshotAsync(inRange);
            await Sut.UpsertClubSnapshotAsync(outOfRange);

            var result = await Sut.GetClubSnapshotsAsync(from, to);

            result.Should().HaveCount(1);
            result[0].Date.Should().Be(new DateOnly(2025, 1, 3));
        }

        [Fact]
        public async Task GetClubSnapshotsAsync_WhenNoSnapshotsInRange_ReturnsEmpty()
        {
            var result = await Sut.GetClubSnapshotsAsync(
                new DateOnly(2025, 1, 1),
                new DateOnly(2025, 1, 7)
            );

            result.Should().BeEmpty();
        }
    }

    public sealed class UpsertClubSnapshotAsync : ReportSnapshotRepositoryTests
    {
        [Fact]
        public async Task UpsertClubSnapshotAsync_WhenNoExistingRecord_InsertsNewSnapshot()
        {
            var snapshot = BuildClubSnapshot();

            await Sut.UpsertClubSnapshotAsync(snapshot);

            var stored = await DbContext.DailyClubSnapshots.FindAsync(snapshot.Id);
            stored.Should().NotBeNull();
            stored!.TotalSessions.Should().Be(snapshot.TotalSessions);
        }

        [Fact]
        public async Task UpsertClubSnapshotAsync_WhenRecordExistsForSameKey_UpdatesMetrics()
        {
            var clubId = Guid.NewGuid();
            var date = new DateOnly(2025, 3, 15);
            var original = BuildClubSnapshot(clubId, date);
            await Sut.UpsertClubSnapshotAsync(original);

            var updated = BuildClubSnapshot(clubId, date);
            updated.TotalSessions = 999;
            await Sut.UpsertClubSnapshotAsync(updated);

            var snapshots = await Sut.GetClubSnapshotsAsync(date, date);
            snapshots.Should().HaveCount(1);
            snapshots[0].TotalSessions.Should().Be(999);
        }
    }

    public sealed class GetTeamSnapshotsAsync : ReportSnapshotRepositoryTests
    {
        [Fact]
        public async Task GetTeamSnapshotsAsync_WhenSnapshotsExistInRange_ReturnsMatchingSnapshots()
        {
            var from = new DateOnly(2025, 6, 1);
            var to = new DateOnly(2025, 6, 30);
            var inRange = BuildTeamSnapshot(date: new DateOnly(2025, 6, 10));
            var outOfRange = BuildTeamSnapshot(date: new DateOnly(2025, 7, 1));
            await Sut.UpsertTeamSnapshotAsync(inRange);
            await Sut.UpsertTeamSnapshotAsync(outOfRange);

            var result = await Sut.GetTeamSnapshotsAsync(from, to);

            result.Should().HaveCount(1);
            result[0].TeamId.Should().Be(inRange.TeamId);
        }
    }

    public sealed class UpsertTeamSnapshotAsync : ReportSnapshotRepositoryTests
    {
        [Fact]
        public async Task UpsertTeamSnapshotAsync_WhenNoExistingRecord_InsertsNewSnapshot()
        {
            var snapshot = BuildTeamSnapshot();

            await Sut.UpsertTeamSnapshotAsync(snapshot);

            var stored = await DbContext.DailyTeamSnapshots.FindAsync(snapshot.Id);
            stored.Should().NotBeNull();
            stored!.TotalSessions.Should().Be(snapshot.TotalSessions);
        }

        [Fact]
        public async Task UpsertTeamSnapshotAsync_WhenRecordExistsForSameKey_UpdatesMetrics()
        {
            var teamId = Guid.NewGuid();
            var clubId = Guid.NewGuid();
            var date = new DateOnly(2025, 7, 4);
            var original = BuildTeamSnapshot(teamId, clubId, date);
            await Sut.UpsertTeamSnapshotAsync(original);

            var updated = BuildTeamSnapshot(teamId, clubId, date);
            updated.TotalActivePlayers = 33;
            await Sut.UpsertTeamSnapshotAsync(updated);

            var snapshots = await Sut.GetTeamSnapshotsAsync(date, date);
            snapshots.Should().HaveCount(1);
            snapshots[0].TotalActivePlayers.Should().Be(33);
        }
    }

    private sealed class StubAuditUserContext : IAuditUserContext
    {
        public string? UserId => null;
        public Guid? ClubId => null;
    }
}
