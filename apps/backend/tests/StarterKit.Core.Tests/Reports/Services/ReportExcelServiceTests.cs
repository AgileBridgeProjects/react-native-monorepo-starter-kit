using ClosedXML.Excel;
using FluentAssertions;
using StarterKit.Core.Reports.DTOs;
using StarterKit.Core.Reports.Services;

namespace StarterKit.Core.Tests.Reports.Services;

public class ReportExcelServiceTests
{
    private static readonly ReportExcelService Service = new();

    private static IXLWorksheet FirstSheet(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        var workbook = new XLWorkbook(ms);
        return workbook.Worksheet(1);
    }

    [Fact]
    public void GenerateTeamsReport_AddsAnomalyColumn()
    {
        var bytes = Service.GenerateTeamsReport([
            new TeamReportItemDto { TeamName = "Sales", IsAnomaly = true },
            new TeamReportItemDto { TeamName = "Support", IsAnomaly = false },
        ]);

        var sheet = FirstSheet(bytes);
        sheet.Cell(1, 7).GetString().Should().Be("Anomaly");
        sheet.Cell(2, 7).GetString().Should().Be("Yes");
        sheet.Cell(3, 7).GetString().Should().Be("No");
    }
}
