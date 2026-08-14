using FluentAssertions;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StarterKit.Core.Reports.Services;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Core.Tests.Reports.Services;

/// <summary>
/// Retroactive-exclusion invariants for the snapshot refresh: excluded and on-leave players
/// must never be counted, and stale rows written before an exclusion existed must self-heal.
/// </summary>
public sealed class ReportSnapshotRefreshJobTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<IReportSnapshotRepository> _snapshotRepo = new();
    private readonly Mock<TimeProvider> _clock = new();

    private static readonly DateTimeOffset Now = new(2026, 6, 9, 10, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = DateOnly.FromDateTime(Now.UtcDateTime);
    private static readonly Guid ClubA = Guid.NewGuid();

    private readonly ReportSnapshotRefreshJob Sut;

    public ReportSnapshotRefreshJobTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _db = new AppDbContext(options);
        _clock.Setup(c => c.GetUtcNow()).Returns(Now);

        Sut = new ReportSnapshotRefreshJob(
            _db,
            _snapshotRepo.Object,
            _clock.Object,
            NullLogger<ReportSnapshotRefreshJob>.Instance
        );
    }

    public void Dispose() => _db.Dispose();

    private void AddClub(Guid clubId) => _db.Clubs.Add(new Club { Id = clubId });

    private UserEntity AddUser(Guid clubId, DateTime? lastLoginAt)
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            IsActive = true,
            LastLoginAt = lastLoginAt,
            DisplayName = "Player",
        };
        _db.Users.Add(user);
        return user;
    }

    private void AddExclusion(Guid userId, Guid clubId) =>
        _db.UserReportingExclusions.Add(
            new UserReportingExclusion
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ClubId = clubId,
            }
        );

    private void AddLeave(Guid userId, Guid clubId, DateOnly start, DateOnly end) =>
        _db.UserLeaveRecords.Add(
            new UserLeaveRecord
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ClubId = clubId,
                StartDate = start,
                EndDate = end,
            }
        );

    private void AddUserTeam(Guid userId, Guid teamId) =>
        _db.UserTeams.Add(
            new UserTeam
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                TeamId = teamId,
            }
        );

    private async Task SaveAndRunAsync()
    {
        await _db.SaveChangesAsync();
        await Sut.ExecuteAsync(JobCancellationToken.Null);
    }

    // ── Club snapshots ───────────────────────────────────────────────────────

    [Fact]
    public async Task Club_ExcludedPlayer_DroppedFromAssignedAndActiveCounts()
    {
        AddClub(ClubA);
        AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        var excluded = AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        AddExclusion(excluded.Id, ClubA);

        DailyClubSnapshot? captured = null;
        _snapshotRepo
            .Setup(r =>
                r.UpsertClubSnapshotAsync(
                    It.IsAny<DailyClubSnapshot>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<DailyClubSnapshot, CancellationToken>((s, _) => captured = s)
            .Returns(Task.CompletedTask);

        await SaveAndRunAsync();

        captured.Should().NotBeNull();
        // Only the non-excluded player counts toward assigned + active.
        captured!.TotalAssignedPlayers.Should().Be(1);
        captured.TotalActivePlayers.Should().Be(1);
    }

    [Fact]
    public async Task Club_OnLeavePlayerCoveringToday_DroppedFromCounts()
    {
        AddClub(ClubA);
        AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        var onLeave = AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        AddLeave(onLeave.Id, ClubA, Today.AddDays(-1), Today.AddDays(1));

        DailyClubSnapshot? captured = null;
        _snapshotRepo
            .Setup(r =>
                r.UpsertClubSnapshotAsync(
                    It.IsAny<DailyClubSnapshot>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<DailyClubSnapshot, CancellationToken>((s, _) => captured = s)
            .Returns(Task.CompletedTask);

        await SaveAndRunAsync();

        captured.Should().NotBeNull();
        captured!.TotalAssignedPlayers.Should().Be(1);
        captured.TotalActivePlayers.Should().Be(1);
    }

    [Fact]
    public async Task Club_LeaveEndedBeforeToday_PlayerStillCounted()
    {
        AddClub(ClubA);
        var user = AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        AddLeave(user.Id, ClubA, Today.AddDays(-5), Today.AddDays(-1));

        DailyClubSnapshot? captured = null;
        _snapshotRepo
            .Setup(r =>
                r.UpsertClubSnapshotAsync(
                    It.IsAny<DailyClubSnapshot>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<DailyClubSnapshot, CancellationToken>((s, _) => captured = s)
            .Returns(Task.CompletedTask);

        await SaveAndRunAsync();

        captured.Should().NotBeNull();
        captured!.TotalAssignedPlayers.Should().Be(1);
        captured.TotalActivePlayers.Should().Be(1);
    }

    // ── Team snapshots — retroactive-exclusion self-healing ─────────────────

    [Fact]
    public async Task Team_AllMembersNowExcluded_StaleSnapshotRowIsSoftDeleted()
    {
        // A snapshot row for today was written before the player's exclusion existed. On
        // re-refresh the team no longer has any eligible member, so the stale row must be
        // soft-deleted rather than left frozen at its pre-exclusion count.
        AddClub(ClubA);
        var teamId = Guid.NewGuid();
        var user = AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        AddUserTeam(user.Id, teamId);
        AddExclusion(user.Id, ClubA);
        _db.DailyTeamSnapshots.Add(
            new DailyTeamSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = ClubA,
                TeamId = teamId,
                Date = Today,
                TotalActivePlayers = 1,
            }
        );

        await SaveAndRunAsync();

        var row = await _db
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .SingleAsync(s => s.TeamId == teamId && s.Date == Today);
        row.IsDeleted.Should().BeTrue();
        _snapshotRepo.Verify(
            r =>
                r.UpsertTeamSnapshotAsync(
                    It.IsAny<DailyTeamSnapshot>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Team_EligibleMember_UpsertsSnapshotAndKeepsExistingRow()
    {
        AddClub(ClubA);
        var teamId = Guid.NewGuid();
        var user = AddUser(ClubA, lastLoginAt: DateTime.UtcNow);
        AddUserTeam(user.Id, teamId);
        _db.DailyTeamSnapshots.Add(
            new DailyTeamSnapshot
            {
                Id = Guid.NewGuid(),
                ClubId = ClubA,
                TeamId = teamId,
                Date = Today,
                TotalActivePlayers = 1,
            }
        );

        DailyTeamSnapshot? captured = null;
        _snapshotRepo
            .Setup(r =>
                r.UpsertTeamSnapshotAsync(
                    It.IsAny<DailyTeamSnapshot>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<DailyTeamSnapshot, CancellationToken>((s, _) => captured = s)
            .Returns(Task.CompletedTask);

        await SaveAndRunAsync();

        var row = await _db
            .DailyTeamSnapshots.IgnoreQueryFilters()
            .SingleAsync(s => s.TeamId == teamId && s.Date == Today);
        row.IsDeleted.Should().BeFalse();
        captured.Should().NotBeNull();
        captured!.TeamId.Should().Be(teamId);
        captured.TotalActivePlayers.Should().Be(1);
    }
}
