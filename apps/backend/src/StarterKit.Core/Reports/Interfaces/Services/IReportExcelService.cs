using StarterKit.Core.Reports.DTOs;

namespace StarterKit.Core.Reports.Interfaces.Services;

/// <summary>Xlsx generation for the club/team report exports.</summary>
public interface IReportExcelService
{
    /// <summary>
    /// Dashboard export — KPI overview plus team-activity breakdown for the reports
    /// toolbar export (ABC-123 #2).
    /// </summary>
    byte[] GenerateDashboardReport(
        SummaryReportDto summary,
        IReadOnlyList<TeamReportItemDto> teams
    );

    /// <summary>Teams-only export — one row per team (ABC-123).</summary>
    byte[] GenerateTeamsReport(IReadOnlyList<TeamReportItemDto> teams);
}
