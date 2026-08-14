using ClosedXML.Excel;

namespace StarterKit.Core.Excel;

/// <summary>
/// Implemented by parsed-row records that can carry per-row validation errors.
/// </summary>
public interface IHasErrors
{
    IReadOnlyList<string> Errors { get; }
}

/// <summary>
/// Discriminated result of parsing an uploaded Excel workbook. Either the workbook was
/// missing required columns (<see cref="MissingColumns"/>) or it parsed into rows
/// (<see cref="Success"/>).
/// </summary>
/// <typeparam name="TRow">The parsed row type.</typeparam>
public abstract record ExcelParseResult<TRow>
    where TRow : IHasErrors
{
    private ExcelParseResult() { }

    /// <summary>The workbook was missing one or more required header columns.</summary>
    public sealed record MissingColumns(IReadOnlyList<string> Columns) : ExcelParseResult<TRow>;

    /// <summary>The workbook parsed successfully into the given rows (rows may still have errors).</summary>
    public sealed record Success(IReadOnlyList<TRow> Rows) : ExcelParseResult<TRow>;
}

/// <summary>
/// Base class for header-driven Excel parsers. Reads the first worksheet, maps the header
/// row (case-insensitive, whitespace-trimmed) to column indices, validates required columns,
/// and delegates per-row parsing to <see cref="ParseRow"/>.
/// </summary>
/// <typeparam name="TRow">The parsed row type.</typeparam>
public abstract class ExcelParserBase<TRow>
    where TRow : IHasErrors
{
    /// <summary>Column header names (normalised: lower-case, no spaces) that must be present.</summary>
    protected abstract string[] RequiredColumns { get; }

    /// <summary>
    /// Parses a single data row. <paramref name="cell"/> resolves a normalised column name to its
    /// trimmed string value (empty string when the column is absent or blank).
    /// </summary>
    protected abstract TRow ParseRow(int rowIndex, Func<string, string> cell);

    public ExcelParseResult<TRow> Parse(Stream excelStream)
    {
        using var workbook = new XLWorkbook(excelStream);

        var sheet =
            workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidDataException("The workbook does not contain any worksheets.");

        var headerRow = sheet.Row(1);
        var columnMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var used in headerRow.CellsUsed())
        {
            var name = Normalise(used.GetString());
            if (name.Length > 0 && !columnMap.ContainsKey(name))
                columnMap[name] = used.Address.ColumnNumber;
        }

        var missing = RequiredColumns.Where(c => !columnMap.ContainsKey(c)).ToArray();
        if (missing.Length > 0)
            return new ExcelParseResult<TRow>.MissingColumns(missing);

        var rows = new List<TRow>();
        var lastRow = sheet.LastRowUsed()?.RowNumber() ?? 1;
        for (var rowIndex = 2; rowIndex <= lastRow; rowIndex++)
        {
            var row = sheet.Row(rowIndex);
            if (row.IsEmpty())
                continue;

            string Cell(string columnName) =>
                columnMap.TryGetValue(columnName, out var col)
                    ? row.Cell(col).GetString().Trim()
                    : string.Empty;

            rows.Add(ParseRow(rowIndex, Cell));
        }

        return new ExcelParseResult<TRow>.Success(rows);
    }

    private static string Normalise(string raw) =>
        new string(raw.Where(ch => !char.IsWhiteSpace(ch)).ToArray()).ToLowerInvariant();
}
