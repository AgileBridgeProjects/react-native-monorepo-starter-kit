using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Moq;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Common;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Reports;

public abstract class TeamReportControllerTests : ReportControllerTests
{
    protected TeamReportControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    private static readonly DateOnly From = new(2026, 6, 1);
    private static readonly DateOnly To = new(2026, 6, 8);
    private static readonly Guid DeptId = Guid.NewGuid();

    private static TeamsReportDto MakeTeamsResult() =>
        new()
        {
            Teams = new PagedResult<TeamReportItemDto>
            {
                Items =
                [
                    new TeamReportItemDto
                    {
                        TeamId = DeptId,
                        TeamName = "Engineering",
                        TotalUsers = 20,
                        ActiveUsers = 15,
                        ParticipationRate = 75m,
                        TotalSessions = 120,
                        AverageAccuracy = 82.5m,
                        IsAnomaly = false,
                    },
                ],
                TotalCount = 1,
                Page = 1,
                PageSize = 50,
            },
            WeightedAverageParticipationRate = 75m,
            UnweightedAverageParticipationRate = 75m,
        };

    private static List<TeamTrendDto> MakeDeptTrends() =>
        [
            new TeamTrendDto
            {
                TeamId = DeptId,
                TeamName = "Engineering",
                Points = [new TrendPointDto(From, 75m)],
            },
        ];

    // ── GET /api/reports/teams ─────────────────────────────────────────

    public sealed class GetTeams_Returns200 : TeamReportControllerTests
    {
        public GetTeams_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithTeams()
        {
            var mock = new Mock<IReportService>();
            mock.Setup(s =>
                    s.GetTeamsAsync(
                        From,
                        To,
                        It.IsAny<int>(),
                        It.IsAny<int>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(MakeTeamsResult());

            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/teams?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<TeamsReportDto>(JsonOptions);
            body!.Teams.Items.Should().HaveCount(1);
            body.Teams.Items[0].TeamName.Should().Be("Engineering");
            body.Teams.Items[0].ParticipationRate.Should().Be(75m);
            body.Teams.Items[0].IsAnomaly.Should().BeFalse();
            body.Teams.TotalCount.Should().Be(1);
            body.WeightedAverageParticipationRate.Should().Be(75m);
            body.UnweightedAverageParticipationRate.Should().Be(75m);
        }
    }

    public sealed class GetTeams_Returns400_WhenFromAfterTo : TeamReportControllerTests
    {
        public GetTeams_Returns400_WhenFromAfterTo(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenFromAfterTo()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/teams?from={To:yyyy-MM-dd}&to={From:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class GetTeams_Returns400_WhenRangeExceeds365Days : TeamReportControllerTests
    {
        public GetTeams_Returns400_WhenRangeExceeds365Days(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenRangeExceeds365Days()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);

            var from = new DateOnly(2025, 1, 1);
            var to = from.AddDays(366);

            var response = await client.GetAsync(
                $"/api/reports/teams?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class GetTeams_Returns401_WhenUnauthenticated : TeamReportControllerTests
    {
        public GetTeams_Returns401_WhenUnauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_ForAnonymousRequest()
        {
            var response = await Factory
                .CreateClient()
                .GetAsync($"/api/reports/teams?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class GetTeams_Returns403_WhenMissingPermission : TeamReportControllerTests
    {
        public GetTeams_Returns403_WhenMissingPermission(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserLacksReportsViewPermission()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Users.View
            );

            var response = await client.GetAsync(
                $"/api/reports/teams?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ── GET /api/reports/teams/trends ──────────────────────────────────

    public sealed class GetTeamTrends_Returns200 : TeamReportControllerTests
    {
        public GetTeamTrends_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithTrendPoints()
        {
            var mock = new Mock<IReportService>();
            mock.Setup(s =>
                    s.GetTeamTrendsAsync(From, To, Granularity.Daily, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(MakeDeptTrends());

            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/teams/trends?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}&granularity=Daily"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<List<TeamTrendDto>>(JsonOptions);
            body.Should().HaveCount(1);
            body![0].TeamName.Should().Be("Engineering");
            body[0].Points.Should().HaveCount(1);
            body[0].Points[0].Value.Should().Be(75m);
        }
    }

    public sealed class GetTeamTrends_Returns400_WhenFromAfterTo : TeamReportControllerTests
    {
        public GetTeamTrends_Returns400_WhenFromAfterTo(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenFromAfterTo()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/teams/trends?from={To:yyyy-MM-dd}&to={From:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class GetTeamTrends_Returns400_WhenRangeExceeds365Days : TeamReportControllerTests
    {
        public GetTeamTrends_Returns400_WhenRangeExceeds365Days(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenRangeExceeds365Days()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);

            var from = new DateOnly(2025, 1, 1);
            var to = from.AddDays(366);

            var response = await client.GetAsync(
                $"/api/reports/teams/trends?from={from:yyyy-MM-dd}&to={to:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class GetTeamTrends_Returns401_WhenUnauthenticated : TeamReportControllerTests
    {
        public GetTeamTrends_Returns401_WhenUnauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_ForAnonymousRequest()
        {
            var response = await Factory
                .CreateClient()
                .GetAsync($"/api/reports/teams/trends?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class GetTeamTrends_Returns403_WhenMissingPermission : TeamReportControllerTests
    {
        public GetTeamTrends_Returns403_WhenMissingPermission(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserLacksReportsViewPermission()
        {
            var mock = new Mock<IReportService>();
            var client = CreateClient(mock);
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Users.View
            );

            var response = await client.GetAsync(
                $"/api/reports/teams/trends?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}
