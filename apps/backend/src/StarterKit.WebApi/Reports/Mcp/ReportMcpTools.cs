using System.ComponentModel;
using Hangfire;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.Mcp.Validation;
using StarterKit.WebApi.Reports.DTOs;

namespace StarterKit.WebApi.Reports.Mcp;

/// <summary>MCP tools mirroring <see cref="ReportController"/> 1:1.</summary>
// Not MCP-exposed: ExportDashboardAsync (GET summary/export) and ExportTeamsAsync
// (GET teams/export) — XLSX file downloads do not map to MCP tool JSON.
[McpServerToolType]
public sealed class ReportMcpTools(
    IReportService reportService,
    IBackgroundJobClient backgroundJobs
)
{
    [McpServerTool(Name = "reports_get_summary", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description("Returns the KPI summary report for the given date range (max 365 days).")]
    public async Task<SummaryReportDto> GetSummaryAsync(
        [Description("Inclusive start date of the report range.")] DateOnly from,
        [Description("Inclusive end date of the report range.")] DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        McpDateRange.EnsureValid(from, to);

        return await reportService.GetSummaryAsync(from, to, cancellationToken);
    }

    [McpServerTool(Name = "reports_get_trends", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description("Returns trend data points for the given date range (max 365 days).")]
    public async Task<TrendReportDto> GetTrendsAsync(
        [Description("Inclusive start date of the report range.")] DateOnly from,
        [Description("Inclusive end date of the report range.")] DateOnly to,
        [Description("Bucket size for the trend series (daily, weekly, monthly).")]
            Granularity granularity = Granularity.Daily,
        CancellationToken cancellationToken = default
    )
    {
        McpDateRange.EnsureValid(from, to);

        return await reportService.GetTrendsAsync(from, to, granularity, cancellationToken);
    }

    [McpServerTool(Name = "reports_refresh", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [Description(
        "Enqueues a background job that refreshes the reporting snapshots. Returns immediately; the refresh runs asynchronously."
    )]
    public Task RefreshAsync(CancellationToken cancellationToken = default)
    {
        backgroundJobs.Enqueue<IReportSnapshotRefreshService>(job =>
            job.ExecuteAsync(JobCancellationToken.Null)
        );
        return Task.CompletedTask;
    }

    [McpServerTool(Name = "reports_get_exclusions", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description("Returns the players currently excluded from all report queries.")]
    public async Task<IReadOnlyList<ExclusionDto>> GetExclusionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await reportService.GetExclusionsAsync(cancellationToken);
    }

    [McpServerTool(Name = "reports_add_exclusion")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [Description("Excludes a player from all report queries.")]
    public async Task AddExclusionAsync(
        [Description("The user to exclude from reporting.")] Guid userId,
        AddExclusionRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.AddExclusionAsync(userId, request.Reason, cancellationToken);
    }

    [McpServerTool(Name = "reports_remove_exclusion", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [Description("Removes a player's reporting exclusion so they appear in reports again.")]
    public async Task RemoveExclusionAsync(
        [Description("The user whose exclusion is removed.")] Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.RemoveExclusionAsync(userId, cancellationToken);
    }

    [McpServerTool(Name = "reports_get_leave_records", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description(
        "Returns leave records for the current club — date-range player exclusions from reporting."
    )]
    public async Task<IReadOnlyList<LeaveRecordDto>> GetLeaveRecordsAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await reportService.GetLeaveRecordsAsync(cancellationToken);
    }

    [McpServerTool(Name = "reports_create_leave_record")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [Description("Records a leave period that excludes the player from reporting for those dates.")]
    public async Task<LeaveRecordDto> CreateLeaveRecordAsync(
        CreateLeaveRequest request,
        CancellationToken cancellationToken = default
    )
    {
        return await reportService.CreateLeaveRecordAsync(
            request.UserId,
            request.StartDate,
            request.EndDate,
            request.Reason,
            cancellationToken
        );
    }

    [McpServerTool(Name = "reports_delete_leave_record", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [Description("Deletes a leave record.")]
    public async Task DeleteLeaveRecordAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await reportService.DeleteLeaveRecordAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "reports_get_teams", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description(
        "Returns the team-activity report for the given date range (max 365 days), paged."
    )]
    public async Task<TeamsReportDto> GetTeamsAsync(
        [Description("Inclusive start date of the report range.")] DateOnly from,
        [Description("Inclusive end date of the report range.")] DateOnly to,
        [Description("Paging, sorting and free-text filter options.")] TeamListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        McpDateRange.EnsureValid(from, to);

        return await reportService.GetTeamsAsync(
            from,
            to,
            query.ClampedPage,
            query.ClampedPageSize,
            query.FilterText,
            query.SortBy,
            query.SortDescending,
            cancellationToken
        );
    }

    [McpServerTool(Name = "reports_get_team_trends", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Reports.View)]
    [Description("Returns per-team trend series for the given date range (max 365 days).")]
    public async Task<IReadOnlyList<TeamTrendDto>> GetTeamTrendsAsync(
        [Description("Inclusive start date of the report range.")] DateOnly from,
        [Description("Inclusive end date of the report range.")] DateOnly to,
        [Description("Bucket size for the trend series (daily, weekly, monthly).")]
            Granularity granularity = Granularity.Daily,
        CancellationToken cancellationToken = default
    )
    {
        McpDateRange.EnsureValid(from, to);

        return await reportService.GetTeamTrendsAsync(from, to, granularity, cancellationToken);
    }
}
