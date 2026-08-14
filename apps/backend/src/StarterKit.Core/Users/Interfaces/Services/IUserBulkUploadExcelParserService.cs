using StarterKit.Core.Excel;
using StarterKit.Core.Users.DTOs;

namespace StarterKit.Core.Users.Interfaces.Services;

public interface IUserBulkUploadExcelParserService
{
    ExcelParseResult<BulkUploadParsedRow> Parse(Stream excelStream);

    /// <summary>
    /// Generates an XLSX template with data-validation dropdowns pre-populated from the
    /// supplied option lists. Pass empty collections to omit dropdowns for that column.
    /// </summary>
    byte[] GenerateTemplate(IReadOnlyList<string> roleNames, IReadOnlyList<string> teamNames);
}
