using ClosedXML.Excel;
using StarterKit.Core.Helpers;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.Persistence.Entities;

namespace StarterKit.Core.Users.Services;

public sealed class UserExportExcelService : IUserExportExcelService
{
    public byte[] Generate(
        IReadOnlyList<UserEntity> users,
        IReadOnlyDictionary<Guid, string> teamNames
    )
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Users");

        // Header row — styled to match the bulk-upload template.
        string[] headers =
        [
            "#",
            "Display Name",
            "Email",
            "Phone",
            "Username",
            "Sign-In Method",
            "Role(s)",
            "Team",
            "Status",
            "Created",
            "Last Login",
        ];
        for (var col = 1; col <= headers.Length; col++)
        {
            var cell = sheet.Cell(1, col);
            cell.Value = headers[col - 1];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(0, 70, 127);
            cell.Style.Font.FontColor = XLColor.White;
        }

        // Phone column — text format to preserve leading zeros.
        sheet.Column(4).Style.NumberFormat.Format = "@";

        for (var i = 0; i < users.Count; i++)
        {
            var u = users[i];
            var row = i + 2;
            sheet.Cell(row, 1).Value = i + 1;
            sheet.Cell(row, 2).Value = u.DisplayName;
            sheet.Cell(row, 3).Value = u.Email ?? string.Empty;
            sheet.Cell(row, 4).SetValue(u.PhoneNumber ?? string.Empty);
            sheet.Cell(row, 5).Value = u.Username ?? string.Empty;
            sheet.Cell(row, 6).Value = u.AuthMethod.ToString();
            sheet.Cell(row, 7).Value = string.Join(", ", u.UserRoles.Select(r => r.Role.Name));
            // Alphabetical, matching UserRepository.ApplyUserSorting's "team" sort convention.
            // Looked up by name, not `ut.Team.Name` — the Team navigation isn't included on the
            // ListForExportAsync query this runs against, only TeamId.
            sheet.Cell(row, 8).Value = string.Join(
                ", ",
                u.UserTeams.Select(ut =>
                        teamNames.TryGetValue(ut.TeamId, out var teamName) ? teamName : null
                    )
                    .Where(name => name is not null)
                    .OrderBy(name => name, StringComparer.Ordinal)
            );
            sheet.Cell(row, 9).Value = u.IsActive ? "Active" : "Inactive";
            sheet.Cell(row, 10).Value = u.CreatedAt.ToIsoDateString();
            sheet.Cell(row, 11).Value = u.LastLoginAt?.ToIsoDateString() ?? string.Empty;
        }

        sheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }
}
