using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;

namespace StarterKit.Core.Excel;

/// <summary>
/// Base class for header-driven CSV parsers. Reads the header row (case-insensitive,
/// whitespace-trimmed), validates required columns, and delegates per-row parsing to
/// <see cref="ParseRow"/> — the CSV counterpart of <see cref="ExcelParserBase{TRow}"/>, sharing
/// the same <see cref="ExcelParseResult{TRow}"/> result shape so callers can dispatch on file
/// extension/content-type without duplicating downstream row-handling logic.
/// </summary>
/// <typeparam name="TRow">The parsed row type.</typeparam>
public abstract class CsvParserBase<TRow>
    where TRow : IHasErrors
{
    /// <summary>Column header names (normalised: lower-case, no spaces) that must be present.</summary>
    protected abstract string[] RequiredColumns { get; }

    /// <summary>
    /// Parses a single data row. <paramref name="cell"/> resolves a normalised column name to its
    /// trimmed string value (empty string when the column is absent or blank).
    /// </summary>
    protected abstract TRow ParseRow(int rowIndex, Func<string, string> cell);

    public ExcelParseResult<TRow> Parse(Stream csvStream)
    {
        using var reader = new StreamReader(csvStream);
        using var csv = new CsvReader(
            reader,
            new CsvConfiguration(CultureInfo.InvariantCulture) { HasHeaderRecord = true }
        );

        if (!csv.Read() || !csv.ReadHeader())
            throw new InvalidDataException("The file does not contain a header row.");

        var columnMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var headerRecord = csv.HeaderRecord ?? [];
        for (var i = 0; i < headerRecord.Length; i++)
        {
            var name = Normalise(headerRecord[i]);
            if (name.Length > 0 && !columnMap.ContainsKey(name))
                columnMap[name] = i;
        }

        var missing = RequiredColumns.Where(c => !columnMap.ContainsKey(c)).ToArray();
        if (missing.Length > 0)
            return new ExcelParseResult<TRow>.MissingColumns(missing);

        var rows = new List<TRow>();
        var rowIndex = 1;
        while (csv.Read())
        {
            rowIndex++;

            string Cell(string columnName) =>
                columnMap.TryGetValue(columnName, out var col)
                    ? (csv.GetField(col) ?? string.Empty).Trim()
                    : string.Empty;

            if (
                headerRecord.Length == 0
                || Enumerable
                    .Range(0, headerRecord.Length)
                    .All(i => string.IsNullOrWhiteSpace(csv.GetField(i)))
            )
                continue;

            rows.Add(ParseRow(rowIndex, Cell));
        }

        return new ExcelParseResult<TRow>.Success(rows);
    }

    private static string Normalise(string raw) =>
        new string(raw.Where(ch => !char.IsWhiteSpace(ch)).ToArray()).ToLowerInvariant();
}
