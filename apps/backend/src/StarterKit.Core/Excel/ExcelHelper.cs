using ClosedXML.Excel;
using ClosedXML.Excel.Drawings;
using Microsoft.Extensions.Logging;

namespace StarterKit.Core.Excel;

/// <summary>
/// Shared low-level helpers for Excel exports across the admin portal.
/// Available to any feature that produces .xlsx files — not limited to reports.
/// </summary>
public static class ExcelHelper
{
    public const string XlsxContentType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /// <summary>Writes bold white-on-dark-blue headers at row 1.</summary>
    public static void WriteHeader(IXLWorksheet sheet, string[] headers) =>
        WriteHeader(sheet, 1, headers, XLColor.FromArgb(0, 70, 127));

    /// <summary>Writes bold headers at <paramref name="row"/> using the supplied brand colour.</summary>
    public static void WriteHeader(
        IXLWorksheet sheet,
        int row,
        string[] headers,
        XLColor brandColor
    )
    {
        for (var col = 1; col <= headers.Length; col++)
        {
            var cell = sheet.Cell(row, col);
            cell.Value = headers[col - 1];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = brandColor;
            cell.Style.Font.FontColor = XLColor.White;
        }
    }

    /// <summary>
    /// Wraps the data range in a named Excel table. No-ops when there are no data rows
    /// (avoids an empty-table error from ClosedXML).
    /// </summary>
    public static void ApplyTable(
        IXLWorksheet sheet,
        int headerRow,
        int lastDataRow,
        int columnCount,
        string tableName
    )
    {
        if (lastDataRow <= headerRow)
            return;

        sheet.Range(headerRow, 1, lastDataRow, columnCount).CreateTable(tableName);
    }

    /// <summary>
    /// Adds a 3-row logo/title block at the top of <paramref name="sheet"/> and returns the
    /// row at which column headers should begin (always 4 when a logo is present).
    /// </summary>
    public static int AddLogoHeader(
        IXLWorksheet sheet,
        byte[] logoBytes,
        string? clubName,
        DateOnly from,
        DateOnly to,
        ILogger? logger = null
    )
    {
        if (!string.IsNullOrWhiteSpace(clubName))
        {
            var nameCell = sheet.Cell(1, 2);
            nameCell.Value = clubName;
            nameCell.Style.Font.Bold = true;
            nameCell.Style.Font.FontSize = 14;
        }

        var periodCell = sheet.Cell(2, 2);
        periodCell.Value = $"Period: {from:yyyy-MM-dd} to {to:yyyy-MM-dd}";
        periodCell.Style.Font.Italic = true;

        try
        {
            using var imgStream = new MemoryStream(logoBytes);
            sheet.AddPicture(imgStream).MoveTo(sheet.Cell(1, 1)).WithSize(120, 40);
        }
        catch (Exception ex)
        {
            logger?.LogWarning(
                ex,
                "Logo embedding failed for sheet {Sheet}; export continues without logo.",
                sheet.Name
            );
        }

        // Row 3 is an empty separator; data starts at row 4.
        return 4;
    }

    /// <summary>Parses a CSS hex colour string to an <see cref="XLColor"/>, defaulting to StarterKit dark blue.</summary>
    public static XLColor ParseHexColor(string? hex)
    {
        if (!string.IsNullOrWhiteSpace(hex))
        {
            try
            {
                var cleaned = hex.TrimStart('#');
                if (cleaned.Length == 6)
                {
                    var r = Convert.ToInt32(cleaned[..2], 16);
                    var g = Convert.ToInt32(cleaned[2..4], 16);
                    var b = Convert.ToInt32(cleaned[4..6], 16);
                    return XLColor.FromArgb(r, g, b);
                }
            }
            catch
            { /* fall through to default */
            }
        }

        return XLColor.FromArgb(0, 70, 127); // StarterKit default dark blue
    }

    public static byte[] ToBytes(XLWorkbook workbook)
    {
        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    /// <summary>Standard date-range export filename: "{prefix}-{from:yyyyMMdd}-{to:yyyyMMdd}.xlsx".</summary>
    public static string ExportFileName(string prefix, DateOnly from, DateOnly to) =>
        $"{prefix}-{from:yyyyMMdd}-{to:yyyyMMdd}.xlsx";

    /// <summary>Standard identifier export filename: "{prefix}-{identifier}.xlsx".</summary>
    public static string ExportFileName(string prefix, string identifier) =>
        $"{prefix}-{identifier}.xlsx";
}
