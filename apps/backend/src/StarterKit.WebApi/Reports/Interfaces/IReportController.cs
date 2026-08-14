using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;
using StarterKit.WebApi.Reports.DTOs;

namespace StarterKit.WebApi.Reports.Interfaces;

public interface IReportController
{
    Task<ActionResult<SummaryReportDto>> GetSummaryAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken
    );

    Task<ActionResult<TrendReportDto>> GetTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken
    );

    Task<ActionResult> RefreshAsync(CancellationToken cancellationToken);

    Task<ActionResult<IReadOnlyList<ExclusionDto>>> GetExclusionsAsync(
        CancellationToken cancellationToken
    );

    Task<ActionResult> AddExclusionAsync(
        Guid userId,
        [FromBody] AddExclusionRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult> RemoveExclusionAsync(Guid userId, CancellationToken cancellationToken);

    Task<ActionResult<IReadOnlyList<LeaveRecordDto>>> GetLeaveRecordsAsync(
        CancellationToken cancellationToken
    );

    Task<ActionResult<LeaveRecordDto>> CreateLeaveRecordAsync(
        [FromBody] CreateLeaveRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult> DeleteLeaveRecordAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<TeamsReportDto>> GetTeamsAsync(
        [FromQuery] DateOnly from,
        [FromQuery] DateOnly to,
        [FromQuery] TeamListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<IReadOnlyList<TeamTrendDto>>> GetTeamTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken
    );

    Task<IActionResult> ExportTeamsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken
    );
}
