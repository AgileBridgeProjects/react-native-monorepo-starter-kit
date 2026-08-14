using ClosedXML.Excel;
using StarterKit.Core.Excel;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Interfaces.Services;

namespace StarterKit.Core.Reports.Services;

public sealed class ReportExcelService : IReportExcelService
{
    public byte[] GenerateDashboardReport(
        SummaryReportDto summary,
        IReadOnlyList<TeamReportItemDto> teams
    )
    {
        using var workbook = new XLWorkbook();

        var overview = workbook.Worksheets.Add("Overview");
        WriteHeader(overview, ["Metric", "Value", "Δ vs prior period"]);
        var metrics = new (string Label, object Value, object Delta)[]
        {
            ("Participation rate %", summary.ParticipationRate, summary.ParticipationRateDelta),
            ("Active players", summary.TotalActivePlayers, summary.TotalActivePlayersDelta),
            ("Sessions", summary.TotalSessions, summary.TotalSessionsDelta),
            ("Average accuracy %", summary.AverageAccuracy, summary.AverageAccuracyDelta),
            ("Completions", summary.TotalCompletions, summary.TotalCompletionsDelta),
        };
        for (var i = 0; i < metrics.Length; i++)
        {
            var row = i + 2;
            overview.Cell(row, 1).Value = metrics[i].Label;
            overview.Cell(row, 2).Value = XLCellValue.FromObject(metrics[i].Value);
            overview.Cell(row, 3).Value = XLCellValue.FromObject(metrics[i].Delta);
        }
        overview.Columns().AdjustToContents();

        var deptSheet = workbook.Worksheets.Add("Team activity");
        WriteHeader(deptSheet, TeamHeaders);
        for (var i = 0; i < teams.Count; i++)
            WriteTeamRow(deptSheet, i + 2, teams[i]);
        deptSheet.Columns().AdjustToContents();

        return ToBytes(workbook);
    }

    public byte[] GenerateTeamsReport(IReadOnlyList<TeamReportItemDto> teams)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Teams");
        WriteHeader(sheet, TeamHeaders);
        for (var i = 0; i < teams.Count; i++)
            WriteTeamRow(sheet, i + 2, teams[i]);
        sheet.Columns().AdjustToContents();
        return ToBytes(workbook);
    }

    private static readonly string[] TeamHeaders =
    [
        "Team",
        "Active players",
        "Total players",
        "Participation %",
        "Sessions",
        "Avg. accuracy %",
        "Anomaly",
    ];

    private static void WriteTeamRow(IXLWorksheet sheet, int row, TeamReportItemDto d)
    {
        sheet.Cell(row, 1).Value = d.TeamName;
        sheet.Cell(row, 2).Value = d.ActiveUsers;
        sheet.Cell(row, 3).Value = d.TotalUsers;
        sheet.Cell(row, 4).Value = d.ParticipationRate;
        sheet.Cell(row, 5).Value = d.TotalSessions;
        sheet.Cell(row, 6).Value = d.AverageAccuracy;
        sheet.Cell(row, 7).Value = d.IsAnomaly ? "Yes" : "No";
    }

    private static void WriteHeader(IXLWorksheet sheet, string[] headers) =>
        ExcelHelper.WriteHeader(sheet, headers);

    private static byte[] ToBytes(XLWorkbook workbook) => ExcelHelper.ToBytes(workbook);
}
