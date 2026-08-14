using FluentAssertions;
using Moq;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Services;
using StarterKit.Data.Reports;
using StarterKit.Data.Reports.Interfaces.Repositories;
using StarterKit.Data.Reports.Models;

namespace StarterKit.Core.Tests.Reports;

public abstract class ReportServiceTests
{
    private static readonly Guid ClubId = Guid.NewGuid();

    private readonly Mock<IReportSnapshotRepository> _snapshotRepo = new();
    private readonly Mock<IUserReportingExclusionRepository> _exclusionRepo = new();
    private readonly Mock<IUserLeaveRecordRepository> _leaveRepo = new();
    private readonly Mock<ICurrentSession> _currentSession = new();
    private readonly Mock<TimeProvider> _clock = new();

    // Fixed "now" well after the test date ranges so no trend bucket is ever the
    // in-progress trailing one (TrendPeriodHelper would drop it).
    private static readonly DateTimeOffset Now = new(2026, 7, 1, 10, 0, 0, TimeSpan.Zero);

    protected ReportServiceTests()
    {
        _currentSession.Setup(s => s.ClubId).Returns(ClubId);
        _clock.Setup(c => c.GetUtcNow()).Returns(Now);
    }

    protected ReportService BuildSut() =>
        new(
            _snapshotRepo.Object,
            _exclusionRepo.Object,
            _leaveRepo.Object,
            _currentSession.Object,
            _clock.Object
        );

    protected Mock<IReportSnapshotRepository> SnapshotRepo => _snapshotRepo;

    private static readonly DateOnly From = new(2026, 6, 1);
    private static readonly DateOnly To = new(2026, 6, 8);

    public sealed class GetTeamsAsync : ReportServiceTests
    {
        [Fact]
        public async Task FlagsAnomaly_WhenParticipationRateMoreThan15pctBelowAverage()
        {
            // Club average participation = (80 + 40 + 20) / 3 = 46.67%
            // Engineering: 80% — not anomalous (80 > 46.67 - 15 = 31.67)
            // Sales:       40% — not anomalous (40 > 31.67)
            // Support:     20% — anomalous     (20 < 31.67)
            var rows = new List<TeamReportRow>
            {
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Engineering",
                    TotalUsers = 10,
                    ActiveUsers = 8,
                    TotalSessions = 50,
                    CorrectAnswers = 40,
                    TotalAnswers = 50,
                },
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Sales",
                    TotalUsers = 10,
                    ActiveUsers = 4,
                    TotalSessions = 20,
                    CorrectAnswers = 15,
                    TotalAnswers = 20,
                },
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Support",
                    TotalUsers = 10,
                    ActiveUsers = 2,
                    TotalSessions = 10,
                    CorrectAnswers = 8,
                    TotalAnswers = 10,
                },
            };

            SnapshotRepo
                .Setup(r =>
                    r.GetTeamsReportAsync(
                        It.IsAny<TeamReportQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((rows, rows.Count, 46.67m, 46.67m));

            var result = await BuildSut().GetTeamsAsync(From, To, 1, 50);

            var engineering = result.Teams.Items.Single(d => d.TeamName == "Engineering");
            var sales = result.Teams.Items.Single(d => d.TeamName == "Sales");
            var support = result.Teams.Items.Single(d => d.TeamName == "Support");

            engineering.IsAnomaly.Should().BeFalse();
            sales.IsAnomaly.Should().BeFalse();
            support.IsAnomaly.Should().BeTrue();
        }

        [Fact]
        public async Task ZeroActivityTeam_HasZeroRateAndNoAnomaly_WhenAllDeptsAreInactive()
        {
            var rows = new List<TeamReportRow>
            {
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Engineering",
                    TotalUsers = 5,
                    ActiveUsers = 0,
                    TotalSessions = 0,
                    CorrectAnswers = 0,
                    TotalAnswers = 0,
                },
            };

            SnapshotRepo
                .Setup(r =>
                    r.GetTeamsReportAsync(
                        It.IsAny<TeamReportQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((rows, rows.Count, 0m, 0m));

            var result = await BuildSut().GetTeamsAsync(From, To, 1, 50);

            result.Teams.Items.Should().HaveCount(1);
            var dept = result.Teams.Items[0];
            dept.ParticipationRate.Should().Be(0m);
            dept.AverageAccuracy.Should().Be(0m);
            // Club average is 0%; dept is also 0%; 0 is NOT < (0 - 15) = -15
            dept.IsAnomaly.Should().BeFalse();
        }

        [Fact]
        public async Task ZeroUsersTeam_HasZeroParticipationRate()
        {
            var rows = new List<TeamReportRow>
            {
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Empty",
                    TotalUsers = 0,
                    ActiveUsers = 0,
                    TotalSessions = 0,
                    CorrectAnswers = 0,
                    TotalAnswers = 0,
                },
            };

            SnapshotRepo
                .Setup(r =>
                    r.GetTeamsReportAsync(
                        It.IsAny<TeamReportQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((rows, rows.Count, 0m, 0m));

            var result = await BuildSut().GetTeamsAsync(From, To, 1, 50);

            result.Teams.Items[0].ParticipationRate.Should().Be(0m);
        }

        [Fact]
        public async Task BothAverageParticipationRates_ArePopulated()
        {
            // Weighted: (8+4)/(10+10)*100 = 60%; Unweighted: (80+40)/2 = 60% (equal here)
            // Use imbalanced depts to distinguish: Dept A 10 users 9 active = 90%, Dept B 90 users 9 active = 10%
            // Weighted: 18/100*100 = 18%; Unweighted: (90+10)/2 = 50%
            var rows = new List<TeamReportRow>
            {
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Small",
                    TotalUsers = 10,
                    ActiveUsers = 9,
                },
                new()
                {
                    TeamId = Guid.NewGuid(),
                    TeamName = "Large",
                    TotalUsers = 90,
                    ActiveUsers = 9,
                },
            };

            SnapshotRepo
                .Setup(r =>
                    r.GetTeamsReportAsync(
                        It.IsAny<TeamReportQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((rows, rows.Count, 18m, 50m));

            var result = await BuildSut().GetTeamsAsync(From, To, 1, 50);

            result.WeightedAverageParticipationRate.Should().Be(18m);
            result.UnweightedAverageParticipationRate.Should().Be(50m);
        }
    }
}
