using Npgsql;

namespace StarterKit.Migrator.Seeders;

internal static class RolesSeeder
{
    private static readonly string SeedsDirectory = Path.Combine(
        AppContext.BaseDirectory,
        "Seeds",
        "Auth"
    );

    private static readonly IReadOnlyList<(string CsvFile, string TableName)> SeedSources =
    [
        ("Roles.csv", "Roles"),
        ("RolePermissions.csv", "RolePermissions"),
    ];

    public static async Task<bool> HasBeenSeededAsync(NpgsqlConnection connection)
    {
        foreach (var (csvFile, tableName) in SeedSources)
        {
            var rows = await ReadCsvAsync(csvFile);
            var actual = await GetTableCountAsync(connection, tableName);
            if (actual < rows.Count)
                return false;
        }

        return true;
    }

    private static async Task<int> GetTableCountAsync(NpgsqlConnection connection, string tableName)
    {
        // Table name is validated against the SeedSources whitelist — safe to interpolate.
        if (!SeedSources.Any(s => s.TableName == tableName))
            throw new ArgumentOutOfRangeException(
                nameof(tableName),
                tableName,
                "Unsupported table name."
            );

        // PostgreSQL folds unquoted identifiers to lowercase; the EF model maps to
        // PascalCase table names, so quote them. COUNT(1) returns bigint (long).
        await using var command = new NpgsqlCommand(
            $"SELECT COUNT(1) FROM \"{tableName}\"",
            connection
        );
        return (int)(long)(await command.ExecuteScalarAsync() ?? 0L);
    }

    public static async Task SeedAsync(NpgsqlConnection connection)
    {
        await RenameTenantAdminToClubAdminAsync(connection);
        await SeedRolesAsync(connection);
    }

    private static async Task RenameTenantAdminToClubAdminAsync(NpgsqlConnection connection)
    {
        await using var command = new NpgsqlCommand(
            """
            UPDATE "Roles" SET "Name" = 'ClubAdmin'
            WHERE "Id" = '00000000-0000-0000-0000-000000000002' AND "Name" = 'TenantAdmin';
            """,
            connection
        );
        await command.ExecuteNonQueryAsync();
    }

    public static async Task ApplyDescriptionsAsync(NpgsqlConnection connection)
    {
        var rows = await ReadCsvAsync("Roles.csv");

        foreach (var row in rows)
        {
            var id = Guid.Parse(row[0]);
            var description = row.Length > 2 ? row[2] : null;

            await using var command = new NpgsqlCommand(
                """
                UPDATE "Roles" SET "Description" = @Description WHERE "Id" = @Id AND ("Description" IS NULL OR "Description" != @Description);
                """,
                connection
            );

            command.Parameters.AddWithValue("@Id", id);
            command.Parameters.AddWithValue(
                "@Description",
                description is null ? DBNull.Value : description
            );
            await command.ExecuteNonQueryAsync();
        }
    }

    /// <summary>
    /// Ensures system-role flags (IsElevated, IsPortalRole, IsSystem, RequiresOnboarding) match
    /// the seed CSV. Runs unconditionally so flag changes are applied even when
    /// <see cref="HasBeenSeededAsync"/> reports the seed is already present.
    /// </summary>
    public static async Task ApplyRoleFlagsAsync(NpgsqlConnection connection)
    {
        var rows = await ReadCsvAsync("Roles.csv");

        foreach (var row in rows)
        {
            var id = Guid.Parse(row[0]);
            var isElevated = row.Length > 3 && bool.TryParse(row[3], out var e) && e;
            var isPortalRole = row.Length > 4 && bool.TryParse(row[4], out var p) && p;
            var isSystem = row.Length > 5 && bool.TryParse(row[5], out var s) && s;
            var requiresOnboarding = row.Length > 6 && bool.TryParse(row[6], out var r) && r;

            await using var command = new NpgsqlCommand(
                """
                UPDATE "Roles"
                SET "IsElevated" = @IsElevated, "IsPortalRole" = @IsPortalRole, "IsSystem" = @IsSystem,
                    "RequiresOnboarding" = @RequiresOnboarding
                WHERE "Id" = @Id;
                """,
                connection
            );

            command.Parameters.AddWithValue("@Id", id);
            command.Parameters.AddWithValue("@IsElevated", isElevated);
            command.Parameters.AddWithValue("@IsPortalRole", isPortalRole);
            command.Parameters.AddWithValue("@IsSystem", isSystem);
            command.Parameters.AddWithValue("@RequiresOnboarding", requiresOnboarding);
            await command.ExecuteNonQueryAsync();
        }
    }

    private static async Task SeedRolesAsync(NpgsqlConnection connection)
    {
        var rows = await ReadCsvAsync("Roles.csv");

        foreach (var row in rows)
        {
            var id = Guid.Parse(row[0]);
            var name = row[1];
            var description = row.Length > 2 ? row[2] : null;
            var isElevated = row.Length > 3 && bool.TryParse(row[3], out var e) && e;
            var isPortalRole = row.Length > 4 && bool.TryParse(row[4], out var p) && p;
            var isSystem = row.Length > 5 && bool.TryParse(row[5], out var s) && s;
            var requiresOnboarding = row.Length > 6 && bool.TryParse(row[6], out var r) && r;

            await using var command = new NpgsqlCommand(
                """
                INSERT INTO "Roles" ("Id", "Name", "Description", "IsElevated", "IsPortalRole", "IsSystem", "RequiresOnboarding")
                VALUES (@Id, @Name, @Description, @IsElevated, @IsPortalRole, @IsSystem, @RequiresOnboarding)
                ON CONFLICT ("Id") DO UPDATE
                SET "IsElevated" = @IsElevated, "IsPortalRole" = @IsPortalRole, "IsSystem" = @IsSystem,
                    "RequiresOnboarding" = @RequiresOnboarding;
                """,
                connection
            );

            command.Parameters.AddWithValue("@Id", id);
            command.Parameters.AddWithValue("@Name", name);
            command.Parameters.AddWithValue(
                "@Description",
                description is null ? DBNull.Value : description
            );
            command.Parameters.AddWithValue("@IsElevated", isElevated);
            command.Parameters.AddWithValue("@IsPortalRole", isPortalRole);
            command.Parameters.AddWithValue("@IsSystem", isSystem);
            command.Parameters.AddWithValue("@RequiresOnboarding", requiresOnboarding);
            await command.ExecuteNonQueryAsync();
        }
    }

    /// <summary>
    /// Inserts missing role-permissions and removes stale ones in a single CSV read.
    /// Runs unconditionally so permission changes take effect without a DB wipe.
    /// </summary>
    public static async Task SyncRolePermissionsAsync(NpgsqlConnection connection)
    {
        var rows = await ReadCsvAsync("RolePermissions.csv");

        // Insert missing permissions
        foreach (var row in rows)
        {
            var roleId = Guid.Parse(row[0]);
            var permission = row[1];

            await using var insertCmd = new NpgsqlCommand(
                """
                INSERT INTO "RolePermissions" ("Id", "RoleId", "Permission")
                SELECT gen_random_uuid(), @RoleId, @Permission
                WHERE NOT EXISTS (
                    SELECT 1 FROM "RolePermissions" WHERE "RoleId" = @RoleId AND "Permission" = @Permission
                );
                """,
                connection
            );

            insertCmd.Parameters.AddWithValue("@RoleId", roleId);
            insertCmd.Parameters.AddWithValue("@Permission", permission);
            await insertCmd.ExecuteNonQueryAsync();
        }

        // Remove stale permissions
        var systemRoleIds = rows.Select(r => Guid.Parse(r[0])).Distinct().ToList();

        foreach (var roleId in systemRoleIds)
        {
            var expected = rows.Where(r => Guid.Parse(r[0]) == roleId).Select(r => r[1]).ToList();

            var paramList = string.Join(", ", expected.Select((_, i) => $"@P{i}"));

            await using var command = new NpgsqlCommand(
                $"""
                DELETE FROM "RolePermissions"
                WHERE "RoleId" = @RoleId AND "Permission" NOT IN ({paramList});
                """,
                connection
            );

            command.Parameters.AddWithValue("@RoleId", roleId);
            for (var i = 0; i < expected.Count; i++)
                command.Parameters.AddWithValue($"@P{i}", expected[i]);

            await command.ExecuteNonQueryAsync();
        }
    }

    /// <summary>
    /// Reads a simple CSV file and returns each data row split by comma.
    /// Fields must not contain commas — no quoted-field or escape support.
    /// </summary>
    private static async Task<IReadOnlyList<string[]>> ReadCsvAsync(string fileName)
    {
        var path = Path.Combine(SeedsDirectory, fileName);
        var lines = await File.ReadAllLinesAsync(path);

        return lines
            .Skip(1)
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .Select(line => line.Split(','))
            .ToList();
    }
}
