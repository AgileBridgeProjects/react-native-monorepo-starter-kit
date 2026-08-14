using System.Globalization;
using ClosedXML.Excel;
using StarterKit.Core.Excel;
using StarterKit.Core.Helpers;
using StarterKit.Core.Users.DTOs;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Users.Services;

public sealed class UserBulkUploadExcelParserService
    : ExcelParserBase<BulkUploadParsedRow>,
        IUserBulkUploadExcelParserService
{
    private const string ColFirstName = "firstname";
    private const string ColLastName = "lastname";
    private const string ColEmail = "email";
    private const string ColPhone = "phonenumber";
    private const string ColCountryCode = "countrycode";
    private const string ColRoleName = "rolename";
    private const string ColTeam = "teamname";
    private const string ColDateOfBirth = "dateofbirth";
    private const string ColPosition = "position";
    private const string ColJerseyNumber = "jerseynumber";
    private const string ColParentGuardianEmail = "parentguardianemail";

    private const string RoleAthlete = "Athlete";

    /// <summary>Fallback region when CountryCode column is blank — preserves backward compatibility.</summary>
    private const string DefaultCountryCode = "ZA";

    protected override string[] RequiredColumns =>
        [ColFirstName, ColLastName, ColEmail, ColRoleName];

    protected override BulkUploadParsedRow ParseRow(int rowIndex, Func<string, string> cell)
    {
        var errors = new List<string>();

        var firstName = cell(ColFirstName).Trim();
        var lastName = cell(ColLastName).Trim();
        var email = cell(ColEmail).Trim() is { Length: > 0 } e ? e.ToLowerInvariant() : null;
        var countryCode = cell(ColCountryCode).Trim() is { Length: > 0 } cc
            ? cc.ToUpperInvariant()
            : DefaultCountryCode;
        string? phone = null;
        var phoneRaw = cell(ColPhone).Trim();
        if (phoneRaw.Length > 0)
        {
            if (
                PhoneHelper.TryNormaliseInternationalPhone(
                    phoneRaw,
                    countryCode,
                    out var normalizedPhone
                )
            )
                phone = normalizedPhone;
            else
                errors.Add(
                    $"Please enter a valid mobile number for the selected country ({countryCode})."
                );
        }
        var roleName = cell(ColRoleName).Trim() is { Length: > 0 } r ? r : null;
        var teamName = cell(ColTeam).Trim() is { Length: > 0 } d ? d : null;
        var positionRaw = cell(ColPosition).Trim();
        PlayingPosition? position = null;
        if (positionRaw.Length > 0)
        {
            if (
                Enum.TryParse<PlayingPosition>(
                    positionRaw,
                    ignoreCase: true,
                    out var parsedPosition
                )
            )
                position = parsedPosition;
            else
                errors.Add(
                    $"Position must be one of: {string.Join(", ", Enum.GetNames<PlayingPosition>())}."
                );
        }
        int? jerseyNumber = null;
        var jerseyNumberRaw = cell(ColJerseyNumber).Trim();
        if (jerseyNumberRaw.Length > 0)
        {
            if (
                int.TryParse(
                    jerseyNumberRaw,
                    NumberStyles.None,
                    CultureInfo.InvariantCulture,
                    out var parsedJerseyNumber
                )
                && parsedJerseyNumber
                    is >= JerseyNumberConstraints.Min
                        and <= JerseyNumberConstraints.Max
            )
                jerseyNumber = parsedJerseyNumber;
            else
                errors.Add(
                    $"Jersey number must be between {JerseyNumberConstraints.Min} and {JerseyNumberConstraints.Max}."
                );
        }
        var parentGuardianEmail = cell(ColParentGuardianEmail).Trim() is { Length: > 0 } pge
            ? pge.ToLowerInvariant()
            : null;

        DateOnly? dateOfBirth = null;
        var dateOfBirthRaw = cell(ColDateOfBirth).Trim();
        if (dateOfBirthRaw.Length > 0)
        {
            if (
                DateOnly.TryParse(
                    dateOfBirthRaw,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out var parsedDob
                )
            )
                dateOfBirth = parsedDob;
            else
                errors.Add("Date of birth must be a valid date.");
        }

        // Name validation
        if (string.IsNullOrWhiteSpace(firstName))
            errors.Add("First name is required.");
        else if (!ValidationHelper.IsValidName(firstName))
            errors.Add("First name may only contain letters, spaces, hyphens, and apostrophes.");

        if (string.IsNullOrWhiteSpace(lastName))
            errors.Add("Last name is required.");
        else if (!ValidationHelper.IsValidName(lastName))
            errors.Add("Last name may only contain letters, spaces, hyphens, and apostrophes.");

        // Email/Credentials is the only sign-in method in this phase.
        const AuthenticationMethod authMethod = AuthenticationMethod.Credentials;
        if (email == null)
            errors.Add("Email is required.");
        else if (!ValidationHelper.IsValidEmail(email))
            errors.Add("Please enter a valid email address.");

        // Role name
        if (string.IsNullOrWhiteSpace(roleName))
            errors.Add("Role name is required.");

        if (parentGuardianEmail != null && !ValidationHelper.IsValidEmail(parentGuardianEmail))
            errors.Add("Please enter a valid Parent/Guardian email address.");

        // Athletes require a date of birth.
        if (
            string.Equals(roleName, RoleAthlete, StringComparison.OrdinalIgnoreCase)
            && dateOfBirth is null
        )
            errors.Add("Date of birth is required for Athlete users.");

        return new BulkUploadParsedRow(
            RowNumber: rowIndex,
            FirstName: firstName,
            LastName: lastName,
            Email: email,
            PhoneNumber: phone,
            CountryCode: countryCode,
            AuthMethod: authMethod,
            RoleName: roleName,
            TeamName: teamName,
            Username: null,
            Errors: errors,
            DateOfBirth: dateOfBirth,
            Position: position,
            JerseyNumber: jerseyNumber,
            ParentGuardianEmail: parentGuardianEmail
        );
    }

    public byte[] GenerateTemplate(IReadOnlyList<string> roleNames, IReadOnlyList<string> teamNames)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Users");

        // Column order: FirstName, LastName, Email, PhoneNumber, CountryCode, RoleName, TeamName,
        //               DateOfBirth, Position, JerseyNumber, ParentGuardianEmail.
        // Only email/Credentials sign-in is supported in this phase — no AuthMethod/Username column.
        string[] headers =
        [
            "FirstName",
            "LastName",
            "Email",
            "PhoneNumber",
            "CountryCode",
            "RoleName",
            "TeamName",
            "DateOfBirth",
            "Position",
            "JerseyNumber",
            "ParentGuardianEmail",
        ];

        // Column indices (1-based)
        const int ColIdxPhoneNumber = 4;
        const int ColIdxCountryCode = 5;
        const int ColIdxRoleName = 6;
        const int ColIdxDeptName = 7;
        const int ColIdxPosition = 9;

        // Header row
        for (var i = 0; i < headers.Length; i++)
        {
            var headerCell = sheet.Cell(1, i + 1);
            headerCell.Value = headers[i];
            headerCell.Style.Font.Bold = true;
            headerCell.Style.Fill.BackgroundColor = XLColor.FromArgb(0, 70, 127);
            headerCell.Style.Font.FontColor = XLColor.White;
        }

        // Example row
        sheet.Cell(2, 1).Value = "John";
        sheet.Cell(2, 2).Value = "Doe";
        sheet.Cell(2, 3).Value = "john.doe@example.com";
        sheet.Cell(2, 4).Value = string.Empty; // PhoneNumber
        sheet.Cell(2, 5).Value = "ZA"; // CountryCode — ISO alpha-2, e.g. ZA, GB, US
        sheet.Cell(2, 6).Value = roleNames.Count > 0 ? roleNames[0] : string.Empty;
        sheet.Cell(2, 7).Value = teamNames.Count > 0 ? teamNames[0] : string.Empty;
        sheet.Cell(2, 8).Value = string.Empty; // DateOfBirth — required for Athlete rows
        sheet.Cell(2, 9).Value = string.Empty; // Position
        sheet.Cell(2, 10).Value = string.Empty; // JerseyNumber
        sheet.Cell(2, 11).Value = string.Empty; // ParentGuardianEmail — Athlete rows only

        // Data rows range for validation (rows 2–1001 = up to 1000 users).
        const int DataRows = 1_000;

        // PhoneNumber and CountryCode as text so Excel preserves leading zeros and formatting.
        sheet
            .Range(2, ColIdxPhoneNumber, DataRows + 1, ColIdxPhoneNumber)
            .Style.NumberFormat.SetFormat("@");
        sheet
            .Range(2, ColIdxCountryCode, DataRows + 1, ColIdxCountryCode)
            .Style.NumberFormat.SetFormat("@");

        // Dropdowns — use hidden-sheet approach for all lists to avoid the 255-char OOXML limit.
        if (roleNames.Count > 0)
            AddDropdown(workbook, sheet, "Roles", roleNames, ColIdxRoleName, DataRows);

        if (teamNames.Count > 0)
            AddDropdown(workbook, sheet, "Teams", teamNames, ColIdxDeptName, DataRows);

        AddDropdown(
            workbook,
            sheet,
            "Positions",
            Enum.GetNames<PlayingPosition>(),
            ColIdxPosition,
            DataRows
        );

        sheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static void AddDropdown(
        IXLWorkbook workbook,
        IXLWorksheet dataSheet,
        string listSheetName,
        IReadOnlyList<string> values,
        int columnIndex,
        int dataRows
    )
    {
        // Write values to a hidden sheet so the dropdown list can exceed 255 chars.
        var listSheet = workbook.Worksheets.Add(listSheetName);
        for (var i = 0; i < values.Count; i++)
            listSheet.Cell(i + 1, 1).Value = values[i];
        listSheet.Visibility = XLWorksheetVisibility.Hidden;

        // Use the IXLRange overload — ClosedXML only serialises cross-sheet validation correctly
        // via this overload; the string overload does not produce a valid OOXML reference.
        var listRange = listSheet.Range(1, 1, values.Count, 1);
        dataSheet
            .Range(2, columnIndex, dataRows + 1, columnIndex)
            .SetDataValidation()
            .List(listRange, true);
    }
}
