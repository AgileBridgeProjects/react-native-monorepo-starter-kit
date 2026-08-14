using Hangfire;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Attributes;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Excel;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.Core.Reports.Interfaces.Services;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Reports.DTOs;
using StarterKit.WebApi.Reports.Interfaces;

namespace StarterKit.WebApi.Reports;

[ApiController]
[AllowImpersonation]
[Route("api/reports")]
[Tags("Reports")]
[Authorize(Policy = StarterKitPermissions.Reports.View)]
public sealed class ReportController(
    IReportService reportService,
    IReportExcelService excelService,
    IBackgroundJobClient backgroundJobs
) : ControllerBase, IReportController
{
    [HttpGet("summary")]
    [ValidateDateRange]
    [ProducesResponseType(typeof(SummaryReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SummaryReportDto>> GetSummaryAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetSummaryAsync(from, to, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Xlsx dashboard export — KPI overview plus team-activity breakdown for the reports
    /// toolbar (ABC-123 #2).
    /// </summary>
    [HttpGet("summary/export")]
    [ValidateDateRange]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportDashboardAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        var summary = await reportService.GetSummaryAsync(from, to, cancellationToken);
        var teams = await reportService.GetTeamsAsync(
            from,
            to,
            1,
            500,
            cancellationToken: cancellationToken
        );

        var bytes = excelService.GenerateDashboardReport(summary, teams.Teams.Items);
        return File(
            bytes,
            ExcelHelper.XlsxContentType,
            ExcelHelper.ExportFileName("reports-summary", from, to)
        );
    }

    [HttpGet("summary/trends")]
    [ValidateDateRange]
    [ProducesResponseType(typeof(TrendReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TrendReportDto>> GetTrendsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] Granularity granularity = Granularity.Daily,
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetTrendsAsync(from, to, granularity, cancellationToken);
        return Ok(result);
    }

    [HttpPost("refresh")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    public Task<ActionResult> RefreshAsync(CancellationToken cancellationToken = default)
    {
        backgroundJobs.Enqueue<IReportSnapshotRefreshService>(job =>
            job.ExecuteAsync(JobCancellationToken.Null)
        );
        return Task.FromResult<ActionResult>(Accepted());
    }

    [HttpGet("players/exclusions")]
    [ProducesResponseType(typeof(IReadOnlyList<ExclusionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExclusionDto>>> GetExclusionsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetExclusionsAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("players/{userId:guid}/exclusions")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> AddExclusionAsync(
        Guid userId,
        [FromBody] AddExclusionRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.AddExclusionAsync(userId, request.Reason, cancellationToken);
        return StatusCode(StatusCodes.Status201Created);
    }

    [HttpDelete("players/{userId:guid}/exclusions")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> RemoveExclusionAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.RemoveExclusionAsync(userId, cancellationToken);
        return NoContent();
    }

    /// <summary>Leave records for the current club — date-range player exclusions (ABC-123 #1).</summary>
    [HttpGet("players/leave")]
    [ProducesResponseType(typeof(IReadOnlyList<LeaveRecordDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LeaveRecordDto>>> GetLeaveRecordsAsync(
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetLeaveRecordsAsync(cancellationToken);
        return Ok(result);
    }

    /// <summary>Records a leave period that excludes the player from reporting for those dates.</summary>
    [HttpPost("players/leave")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(typeof(LeaveRecordDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LeaveRecordDto>> CreateLeaveRecordAsync(
        [FromBody] CreateLeaveRequest request,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var result = await reportService.CreateLeaveRecordAsync(
                request.UserId,
                request.StartDate,
                request.EndDate,
                request.Reason,
                cancellationToken
            );
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("players/leave/{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteLeaveRecordAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await reportService.DeleteLeaveRecordAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpGet("teams")]
    [ValidateDateRange]
    [ProducesResponseType(typeof(TeamsReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TeamsReportDto>> GetTeamsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] TeamListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetTeamsAsync(
            from,
            to,
            query.ClampedPage,
            query.ClampedPageSize,
            query.FilterText,
            query.SortBy,
            query.SortDescending,
            cancellationToken
        );
        return Ok(result);
    }

    [HttpGet("teams/export")]
    [ValidateDateRange]
    [Authorize(Policy = StarterKitPermissions.Reports.Manage)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportTeamsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetTeamsAsync(
            from,
            to,
            1,
            int.MaxValue,
            cancellationToken: cancellationToken
        );
        var bytes = excelService.GenerateTeamsReport(result.Teams.Items);
        return File(
            bytes,
            ExcelHelper.XlsxContentType,
            ExcelHelper.ExportFileName("reports-teams", from, to)
        );
    }

    [HttpGet("teams/trends")]
    [ValidateDateRange]
    [ProducesResponseType(typeof(IReadOnlyList<TeamTrendDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<TeamTrendDto>>> GetTeamTrendsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] Granularity granularity = Granularity.Daily,
        CancellationToken cancellationToken = default
    )
    {
        var result = await reportService.GetTeamTrendsAsync(
            from,
            to,
            granularity,
            cancellationToken
        );
        return Ok(result);
    }
}
