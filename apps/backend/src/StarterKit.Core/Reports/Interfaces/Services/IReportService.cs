using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Enums;

namespace StarterKit.Core.Reports.Interfaces.Services;

public interface IReportService
{
    Task<SummaryReportDto> GetSummaryAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    );

    Task<TrendReportDto> GetTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    );

    Task<IReadOnlyList<ExclusionDto>> GetExclusionsAsync(
        CancellationToken cancellationToken = default
    );

    Task AddExclusionAsync(
        Guid userId,
        string? reason,
        CancellationToken cancellationToken = default
    );

    Task RemoveExclusionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Leave records for the current club, newest first (ABC-123 #1).</summary>
    Task<IReadOnlyList<LeaveRecordDto>> GetLeaveRecordsAsync(
        CancellationToken cancellationToken = default
    );

    Task<LeaveRecordDto> CreateLeaveRecordAsync(
        Guid userId,
        DateOnly startDate,
        DateOnly endDate,
        string? reason,
        CancellationToken cancellationToken = default
    );

    Task DeleteLeaveRecordAsync(Guid id, CancellationToken cancellationToken = default);

    Task<TeamsReportDto> GetTeamsAsync(
        DateOnly from,
        DateOnly to,
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default,
        Guid? clubId = null
    );

    Task<IReadOnlyList<TeamTrendDto>> GetTeamTrendsAsync(
        DateOnly from,
        DateOnly to,
        Granularity granularity,
        CancellationToken cancellationToken = default
    );
}
