using ClosedXML.Excel;
using FluentAssertions;
using StarterKit.Core.Excel;
using StarterKit.Core.Users.DTOs;
using StarterKit.Core.Users.Services;
using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Tests.Users;

public abstract class UserBulkUploadExcelParserTests
{
    protected readonly UserBulkUploadExcelParserService Sut = new();

    private static MemoryStream BuildExcel(string[][] dataRows, string[]? headers = null)
    {
        headers ??=
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
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Users");

        for (var i = 0; i < headers.Length; i++)
            sheet.Cell(1, i + 1).Value = headers[i];

        for (var r = 0; r < dataRows.Length; r++)
        for (var c = 0; c < dataRows[r].Length; c++)
            sheet.Cell(r + 2, c + 1).Value = dataRows[r][c];

        var ms = new MemoryStream();
        workbook.SaveAs(ms);
        ms.Position = 0;
        return ms;
    }

    // ── Parse — valid rows ───────────────────────────────────────────────────

    public sealed class Parse_WithValidRow : UserBulkUploadExcelParserTests
    {
        [Fact]
        public void Parse_WithValidRow_ReturnsSuccessWithNoErrors()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "john@example.com", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows.Should().HaveCount(1);
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].FirstName.Should().Be("John");
            success.Rows[0].LastName.Should().Be("Doe");
            success.Rows[0].Email.Should().Be("john@example.com");
            success.Rows[0].RoleName.Should().Be("Coach");
        }

        [Fact]
        public void Parse_WithPhoneStartingZero_NormalisesToE164()
        {
            using var stream = BuildExcel([
                ["Jane", "Smith", "jane@example.com", "0821234567", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].PhoneNumber.Should().Be("+27821234567");
        }

        [Fact]
        public void Parse_WithInternationalPhone_NormalisesToE164()
        {
            using var stream = BuildExcel([
                ["Jane", "Smith", "jane@example.com", "07911123456", "GB", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].PhoneNumber.Should().Be("+447911123456");
            success.Rows[0].CountryCode.Should().Be("GB");
        }

        [Fact]
        public void Parse_TrimsWhitespaceFromNames()
        {
            using var stream = BuildExcel([
                ["  Alice  ", "  Wonder  ", "a@b.com", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].FirstName.Should().Be("Alice");
            success.Rows[0].LastName.Should().Be("Wonder");
        }

        [Fact]
        public void Parse_NormalisesEmailToLowercase()
        {
            using var stream = BuildExcel([
                ["Alice", "Wonder", "Alice@Example.COM", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Email.Should().Be("alice@example.com");
        }

        [Fact]
        public void Parse_WithTeamAndPositionAndJerseyNumber_CapturesValues()
        {
            using var stream = BuildExcel([
                [
                    "John",
                    "Doe",
                    "john@example.com",
                    "",
                    "",
                    "Coach",
                    "First Team",
                    "",
                    "ServingSpecialist",
                    "9",
                ],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].TeamName.Should().Be("First Team");
            success.Rows[0].Position.Should().Be(PlayingPosition.ServingSpecialist);
            success.Rows[0].JerseyNumber.Should().Be(9);
        }

        [Fact]
        public void Parse_WithPositionNotMatchingTheEnum_ReportsAnError()
        {
            using var stream = BuildExcel([
                [
                    "John",
                    "Doe",
                    "john@example.com",
                    "",
                    "",
                    "Coach",
                    "First Team",
                    "",
                    "Striker",
                    "9",
                ],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Position.Should().BeNull();
            success.Rows[0].Errors.Should().ContainMatch("Position must be one of:*");
        }

        [Fact]
        public void Parse_WithAthleteRoleAndDateOfBirth_CapturesDateOfBirth()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "john@example.com", "", "", "Athlete", "", "2010-05-01"],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].DateOfBirth.Should().Be(new DateOnly(2010, 5, 1));
        }

        [Fact]
        public void Parse_WithParentGuardianEmail_CapturesValue()
        {
            using var stream = BuildExcel([
                [
                    "John",
                    "Doe",
                    "john@example.com",
                    "",
                    "",
                    "Athlete",
                    "",
                    "2010-05-01",
                    "",
                    "",
                    "parent@example.com",
                ],
            ]);

            var result = Sut.Parse(stream);

            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().BeEmpty();
            success.Rows[0].ParentGuardianEmail.Should().Be("parent@example.com");
        }
    }

    // ── Parse — missing required template columns ─────────────────────────────

    public sealed class Parse_WithMissingRequiredColumn : UserBulkUploadExcelParserTests
    {
        [Fact]
        public void Parse_WhenFirstNameColumnMissing_ReturnsMissingColumns()
        {
            using var stream = BuildExcel(
                [
                    ["Doe", "john@example.com"],
                ],
                ["LastName", "Email"]
            );

            var result = Sut.Parse(stream);

            var missing = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.MissingColumns>()
                .Subject;
            missing.Columns.Should().Contain("firstname");
        }

        [Fact]
        public void Parse_WhenMultipleRequiredColumnsMissing_ReportsAllMissing()
        {
            using var stream = BuildExcel(
                [
                    ["foo"],
                ],
                ["SomeRandomColumn"]
            );

            var result = Sut.Parse(stream);

            var missing = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.MissingColumns>()
                .Subject;
            missing.Columns.Should().Contain("firstname");
            missing.Columns.Should().Contain("lastname");
            missing.Columns.Should().Contain("email");
            missing.Columns.Should().Contain("rolename");
        }
    }

    // ── Parse — field-level validation errors ────────────────────────────────

    public sealed class Parse_WithInvalidData : UserBulkUploadExcelParserTests
    {
        [Fact]
        public void Parse_WhenFirstNameBlank_RowHasError()
        {
            using var stream = BuildExcel([
                ["", "Doe", "j@e.com", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("First name is required"));
        }

        [Fact]
        public void Parse_WhenLastNameBlank_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "", "j@e.com", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().ContainSingle(e => e.Contains("Last name is required"));
        }

        [Fact]
        public void Parse_WhenNameContainsInvalidChars_RowHasError()
        {
            using var stream = BuildExcel([
                ["John123", "Doe", "j@e.com", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("letters, spaces, hyphens"));
        }

        [Fact]
        public void Parse_WhenEmailBlank_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().ContainSingle(e => e.Contains("Email is required"));
        }

        [Fact]
        public void Parse_WhenEmailFormatInvalid_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "not-an-email", "", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().ContainSingle(e => e.Contains("valid email"));
        }

        [Fact]
        public void Parse_WhenPhoneFormatInvalid_RowHasError()
        {
            using var stream = BuildExcel([
                ["Jane", "Doe", "jane@example.com", "abc123", "", "Coach", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().ContainSingle(e => e.Contains("valid mobile number"));
        }

        [Fact]
        public void Parse_WhenRoleNameBlank_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "j@e.com", "", "", "", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success.Rows[0].Errors.Should().ContainSingle(e => e.Contains("Role name is required"));
        }

        [Fact]
        public void Parse_WhenDateOfBirthInvalid_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "j@e.com", "", "", "Athlete", "", "not-a-date"],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("Date of birth must be a valid date"));
        }

        [Fact]
        public void Parse_WhenAthleteRoleWithNoDateOfBirth_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "j@e.com", "", "", "Athlete", ""],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("Date of birth is required for Athlete"));
        }

        [Fact]
        public void Parse_WhenJerseyNumberIsOutOfRange_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "j@e.com", "", "", "Coach", "", "", "", "100"],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("Jersey number") && e.Contains("between"));
        }

        [Fact]
        public void Parse_WhenJerseyNumberIsNotNumeric_RowHasError()
        {
            using var stream = BuildExcel([
                ["John", "Doe", "j@e.com", "", "", "Coach", "", "", "", "AB1"],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("Jersey number") && e.Contains("between"));
        }

        [Fact]
        public void Parse_WhenParentGuardianEmailInvalid_RowHasError()
        {
            using var stream = BuildExcel([
                [
                    "John",
                    "Doe",
                    "j@e.com",
                    "",
                    "",
                    "Athlete",
                    "",
                    "2010-05-01",
                    "",
                    "",
                    "not-an-email",
                ],
            ]);

            var result = Sut.Parse(stream);
            var success = result
                .Should()
                .BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>()
                .Subject;
            success
                .Rows[0]
                .Errors.Should()
                .ContainSingle(e => e.Contains("valid Parent/Guardian email"));
        }
    }

    // ── GenerateTemplate ─────────────────────────────────────────────────────

    public sealed class GenerateTemplate : UserBulkUploadExcelParserTests
    {
        [Fact]
        public void GenerateTemplate_ReturnsNonEmptyBytes()
        {
            var bytes = Sut.GenerateTemplate(["Athlete"], ["First Team"]);
            bytes.Should().NotBeEmpty();
        }

        [Fact]
        public void GenerateTemplate_ProducesFileParserCanReadBack()
        {
            var bytes = Sut.GenerateTemplate(["Athlete"], ["First Team"]);
            using var ms = new MemoryStream(bytes);

            // Template has the example row — should parse as success (example row may have errors due to blank optional fields, but no MissingColumns)
            var result = Sut.Parse(ms);
            result.Should().BeOfType<ExcelParseResult<BulkUploadParsedRow>.Success>();
        }

        [Fact]
        public void GenerateTemplate_DoesNotIncludeAuthMethodOrUsernameOrMaxAttemptsHeaders()
        {
            var bytes = Sut.GenerateTemplate(["Athlete"], ["First Team"]);
            using var ms = new MemoryStream(bytes);
            using var workbook = new XLWorkbook(ms);
            var sheet = workbook.Worksheet("Users");

            var headers = sheet.Row(1).CellsUsed().Select(c => c.GetString()).ToList();

            headers.Should().NotContain("AuthMethod");
            headers.Should().NotContain("Username");
            headers.Should().NotContain("MaxAttempts");
            headers.Should().Contain("ParentGuardianEmail");
        }
    }
}
