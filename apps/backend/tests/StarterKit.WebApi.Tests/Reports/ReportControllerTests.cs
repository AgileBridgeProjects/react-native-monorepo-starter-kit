using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Hangfire;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Common;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Reports;

public abstract class ReportControllerTests : WebApiIntegrationTestBase
{
    protected ReportControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(
        Mock<IReportService> reportServiceMock,
        Mock<IBackgroundJobClient>? backgroundJobsMock = null
    ) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IReportService>(_ => reportServiceMock.Object);
            if (backgroundJobsMock is not null)
                services.AddSingleton<IBackgroundJobClient>(_ => backgroundJobsMock.Object);
        });

    private static readonly DateOnly From = new(2026, 6, 1);
    private static readonly DateOnly To = new(2026, 6, 8);

    private static SummaryReportDto MakeSummary() =>
        new()
        {
            DateFrom = From,
            DateTo = To,
            TotalActivePlayers = 100,
            TotalActivePlayersDelta = 5,
            TotalSessions = 200,
            TotalSessionsDelta = 20,
            AverageAccuracy = 75.5m,
            AverageAccuracyDelta = 2.1m,
            TotalCompletions = 150,
            TotalCompletionsDelta = 10,
        };

    private static TrendReportDto MakeTrend() =>
        new()
        {
            ParticipationTrend = [new TrendPointDto(From, 30)],
            AchievementTrend = [new TrendPointDto(From, 72.5m)],
        };

    // ── GET /api/reports/summary ──────────────────────────────────────────────

    public sealed class GetSummary_Returns200 : ReportControllerTests
    {
        public GetSummary_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithSummaryBody()
        {
            var mock = new Mock<IReportService>();
            mock.Setup(s => s.GetSummaryAsync(From, To, It.IsAny<CancellationToken>()))
                .ReturnsAsync(MakeSummary());

            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/summary?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<SummaryReportDto>(JsonOptions);
            body!.TotalSessions.Should().Be(200);
            body.AverageAccuracy.Should().Be(75.5m);
        }
    }

    public sealed class GetSummary_Returns401_WhenUnauthenticated : ReportControllerTests
    {
        public GetSummary_Returns401_WhenUnauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_ForAnonymousRequest()
        {
            var response = await Factory
                .CreateClient()
                .GetAsync($"/api/reports/summary?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/reports/summary/trends ──────────────────────────────────────

    public sealed class GetTrends_Returns200 : ReportControllerTests
    {
        public GetTrends_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithTrendBody()
        {
            var mock = new Mock<IReportService>();
            mock.Setup(s =>
                    s.GetTrendsAsync(From, To, Granularity.Daily, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(MakeTrend());

            var client = CreateClient(mock);

            var response = await client.GetAsync(
                $"/api/reports/summary/trends?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            mock.Verify(
                s =>
                    s.GetTrendsAsync(
                        It.IsAny<DateOnly>(),
                        It.IsAny<DateOnly>(),
                        Granularity.Daily,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── POST /api/reports/refresh ─────────────────────────────────────────────

    public sealed class PostRefresh_Returns202 : ReportControllerTests
    {
        public PostRefresh_Returns202(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns202_AndEnqueuesJob()
        {
            var reportMock = new Mock<IReportService>();
            var jobsMock = new Mock<IBackgroundJobClient>();

            var client = CreateClient(reportMock, jobsMock);

            var response = await client.PostAsync("/api/reports/refresh", null);

            response.StatusCode.Should().Be(HttpStatusCode.Accepted);
            jobsMock.Verify(
                j =>
                    j.Create(
                        It.Is<Hangfire.Common.Job>(job =>
                            job.Type == typeof(IReportSnapshotRefreshService)
                        ),
                        It.IsAny<Hangfire.States.IState>()
                    ),
                Times.Once
            );
        }
    }

    public sealed class PostRefresh_Returns403_WhenMissingManagePermission : ReportControllerTests
    {
        public PostRefresh_Returns403_WhenMissingManagePermission(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserHasViewButNotManage()
        {
            var client = CreateClient(new Mock<IReportService>());
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Reports.View
            );

            var response = await client.PostAsync("/api/reports/refresh", null);

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ── GET /api/reports/players/exclusions ───────────────────────────────────

    public sealed class GetExclusions_Returns200 : ReportControllerTests
    {
        public GetExclusions_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200WithList()
        {
            var item = new ExclusionDto
            {
                UserId = Guid.NewGuid(),
                Reason = "Test data",
                CreatedAt = DateTime.UtcNow,
            };

            var mock = new Mock<IReportService>();
            mock.Setup(s => s.GetExclusionsAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync([item]);

            var client = CreateClient(mock);
            var response = await client.GetAsync("/api/reports/players/exclusions");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<IReadOnlyList<ExclusionDto>>(
                JsonOptions
            );
            body.Should().HaveCount(1);
        }
    }

    // ── POST /api/reports/players/{userId}/exclusions ─────────────────────────

    public sealed class AddExclusion_Returns201 : ReportControllerTests
    {
        public AddExclusion_Returns201(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns201()
        {
            var userId = Guid.NewGuid();
            var mock = new Mock<IReportService>();

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync(
                $"/api/reports/players/{userId}/exclusions",
                new { Reason = "QA test account" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            mock.Verify(
                s => s.AddExclusionAsync(userId, "QA test account", It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class AddExclusion_Returns404_WhenUserNotFound : ReportControllerTests
    {
        public AddExclusion_Returns404_WhenUserNotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns404_WhenServiceThrowsEntityNotFoundException()
        {
            var userId = Guid.NewGuid();
            var mock = new Mock<IReportService>();
            mock.Setup(s =>
                    s.AddExclusionAsync(userId, It.IsAny<string?>(), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(
                    new StarterKit.Data.Exceptions.EntityNotFoundException("User", userId)
                );

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync(
                $"/api/reports/players/{userId}/exclusions",
                new { Reason = "test" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class AddExclusion_Returns403_WhenMissingManagePermission : ReportControllerTests
    {
        public AddExclusion_Returns403_WhenMissingManagePermission(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserHasViewButNotManage()
        {
            var userId = Guid.NewGuid();
            var client = CreateClient(new Mock<IReportService>());
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Reports.View
            );

            var response = await client.PostAsJsonAsync(
                $"/api/reports/players/{userId}/exclusions",
                new { Reason = "test" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ── DELETE /api/reports/players/{userId}/exclusions ───────────────────────

    public sealed class RemoveExclusion_Returns204 : ReportControllerTests
    {
        public RemoveExclusion_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns204()
        {
            var userId = Guid.NewGuid();
            var mock = new Mock<IReportService>();

            var client = CreateClient(mock);
            var response = await client.DeleteAsync($"/api/reports/players/{userId}/exclusions");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            mock.Verify(
                s => s.RemoveExclusionAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class RemoveExclusion_Returns403_WhenMissingManagePermission
        : ReportControllerTests
    {
        public RemoveExclusion_Returns403_WhenMissingManagePermission(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserHasViewButNotManage()
        {
            var userId = Guid.NewGuid();
            var client = CreateClient(new Mock<IReportService>());
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Reports.View
            );

            var response = await client.DeleteAsync($"/api/reports/players/{userId}/exclusions");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    // ── GET /api/reports/teams/export ───────────────────────────────────

    protected HttpClient CreateClientForTeamsExport(
        Mock<IReportService> reportMock,
        Mock<IReportExcelService> excelMock
    ) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IReportService>(_ => reportMock.Object);
            services.AddScoped<IReportExcelService>(_ => excelMock.Object);
        });

    public sealed class ExportTeams_Returns200 : ReportControllerTests
    {
        public ExportTeams_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithXlsxContentType()
        {
            var bytes = new byte[] { 1, 2, 3 };
            var reportMock = new Mock<IReportService>();
            reportMock
                .Setup(s =>
                    s.GetTeamsAsync(
                        From,
                        To,
                        1,
                        int.MaxValue,
                        null,
                        null,
                        false,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new TeamsReportDto());

            var excelMock = new Mock<IReportExcelService>();
            excelMock
                .Setup(s => s.GenerateTeamsReport(It.IsAny<IReadOnlyList<TeamReportItemDto>>()))
                .Returns(bytes);

            var client = CreateClientForTeamsExport(reportMock, excelMock);

            var response = await client.GetAsync(
                $"/api/reports/teams/export?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response
                .Content.Headers.ContentType?.MediaType.Should()
                .Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            excelMock.Verify(
                s => s.GenerateTeamsReport(It.IsAny<IReadOnlyList<TeamReportItemDto>>()),
                Times.Once
            );
        }
    }

    public sealed class ExportTeams_Returns400_WhenFromAfterTo : ReportControllerTests
    {
        public ExportTeams_Returns400_WhenFromAfterTo(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenFromIsAfterTo()
        {
            var client = CreateClientForTeamsExport(
                new Mock<IReportService>(),
                new Mock<IReportExcelService>()
            );

            var response = await client.GetAsync(
                $"/api/reports/teams/export?from={To:yyyy-MM-dd}&to={From:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class ExportTeams_Returns400_WhenRangeExceeds365Days : ReportControllerTests
    {
        public ExportTeams_Returns400_WhenRangeExceeds365Days(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns400_WhenDateRangeExceeds365Days()
        {
            var longFrom = new DateOnly(2025, 1, 1);
            var longTo = new DateOnly(2026, 3, 1);
            var client = CreateClientForTeamsExport(
                new Mock<IReportService>(),
                new Mock<IReportExcelService>()
            );

            var response = await client.GetAsync(
                $"/api/reports/teams/export?from={longFrom:yyyy-MM-dd}&to={longTo:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class ExportTeams_Returns403_WhenMissingManagePermission : ReportControllerTests
    {
        public ExportTeams_Returns403_WhenMissingManagePermission(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task Returns403_WhenUserHasViewButNotManage()
        {
            var client = CreateClientForTeamsExport(
                new Mock<IReportService>(),
                new Mock<IReportExcelService>()
            );
            client.DefaultRequestHeaders.Add(
                TestAuthHandler.PermissionsHeader,
                StarterKitPermissions.Reports.View
            );

            var response = await client.GetAsync(
                $"/api/reports/teams/export?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    public sealed class ExportTeams_Returns401_WhenUnauthenticated : ReportControllerTests
    {
        public ExportTeams_Returns401_WhenUnauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_ForAnonymousRequest()
        {
            var response = await Factory
                .CreateClient()
                .GetAsync($"/api/reports/teams/export?from={From:yyyy-MM-dd}&to={To:yyyy-MM-dd}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
