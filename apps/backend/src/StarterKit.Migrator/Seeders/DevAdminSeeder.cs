using Npgsql;

namespace StarterKit.Migrator.Seeders;

/// <summary>
/// Seeds the StarterKit platform club and a placeholder admin role assignment.
/// Only seeds if the StarterKit club row does not already exist.
///
/// This seeder exists so every local developer has a Club row available
/// for the dev bootstrap endpoint (POST /api/dev/bootstrap-admin) to link
/// their Firebase account to without needing to manually insert data.
/// </summary>
internal static class DevAdminSeeder
{
    /// <summary>Fixed GUID for the StarterKit platform club — same across all environments.</summary>
    public static readonly Guid StarterKitClubId = new("00000000-0000-0000-0000-000000000010");

    /// <summary>
    /// Fixed GUID for the dev admin user (admin@starterkit.local). The bootstrap endpoint
    /// replaces the placeholder ExternalAuthId with the real Firebase UID on first sign-in.
    /// </summary>
    public static readonly Guid DevAdminUserId = new("00000000-0000-0000-0000-000000000030");

    /// <summary>
    /// Fixed GUID for the dev test phone user. The phone number +27123456789 always maps
    /// to this row — the bootstrap endpoint updates ExternalAuthId to the real Firebase UID
    /// on first sign-in, linking the seeded profile to the live Firebase phone auth account.
    /// </summary>
    public static readonly Guid DevPhoneTestUserId = new("00000000-0000-0000-0000-000000000020");

    /// <summary>Fixed GUID for the default "General" team under the StarterKit club.</summary>
    public static readonly Guid StarterKitTeamId = new("00000000-0000-0000-0000-000000000040");

    /// <summary>Fixed GUID for the default season the "General" team belongs to.</summary>
    public static readonly Guid StarterKitSeasonId = new("00000000-0000-0000-0000-000000000050");

    public static async Task<bool> HasBeenSeededAsync(NpgsqlConnection connection)
    {
        // Check the club, team, admin user (by Id OR ExternalAuthId), and test phone
        // user (by Id OR email) so SeedAsync re-runs if any are missing (e.g. after a DB wipe
        // or a new seeded row is added). PostgreSQL folds unquoted identifiers to lowercase;
        // the EF model maps to PascalCase names, so quote them. COUNT(1) returns bigint (long).
        await using var command = new NpgsqlCommand(
            """
            SELECT
                (SELECT COUNT(1) FROM "Clubs"    WHERE "Id" = @ClubId)  +
                (SELECT COUNT(1) FROM "Teams"  WHERE "Id" = @DeptId)    +
                (CASE WHEN EXISTS (SELECT 1 FROM "Users" WHERE "Id" = @AdminId)
                       OR EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'admin@starterkit.local')
                      THEN 1 ELSE 0 END) +
                (CASE WHEN EXISTS (SELECT 1 FROM "Users" WHERE "Id" = @UserId)
                       OR EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'testplayer@starterkit.local' AND "ClubId" = @ClubId)
                      THEN 1 ELSE 0 END)
            """,
            connection
        );
        command.Parameters.AddWithValue("@ClubId", StarterKitClubId);
        command.Parameters.AddWithValue("@DeptId", StarterKitTeamId);
        command.Parameters.AddWithValue("@AdminId", DevAdminUserId);
        command.Parameters.AddWithValue("@UserId", DevPhoneTestUserId);
        return (long)(await command.ExecuteScalarAsync() ?? 0L) >= 4;
    }

    public static async Task SeedAsync(NpgsqlConnection connection)
    {
        // ── Club ───────────────────────────────────────────────────────────
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "Clubs" ("Id", "Name", "StreetAddress", "City", "State", "ZipCode", "Timezone", "CreatedAt", "IsDeleted")
                VALUES (@Id, @Name, @StreetAddress, @City, @State, @ZipCode, @Timezone, now() AT TIME ZONE 'utc', false)
                ON CONFLICT ("Id") DO NOTHING;
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@Id", StarterKitClubId);
            cmd.Parameters.AddWithValue("@Name", "StarterKit");
            cmd.Parameters.AddWithValue("@StreetAddress", "123 Dev Street");
            cmd.Parameters.AddWithValue("@City", "Denver");
            cmd.Parameters.AddWithValue("@State", "CO");
            cmd.Parameters.AddWithValue("@ZipCode", "80202");
            // A real US IANA zone (matching the seeded Denver/CO address) so local dev exercises
            // the actual TimeZoneInfo conversion path instead of the Timezone-is-null
            // UTC-passthrough fallback in CheckInSlotResolver.
            cmd.Parameters.AddWithValue("@Timezone", "America/Denver");
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Season ───────────────────────────────────────────────────────
        // Teams are scoped to a Season, not directly to a Club. A wide, fixed
        // date range keeps this seed valid indefinitely without needing yearly updates.
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "Seasons" ("Id", "ClubId", "Name", "StartDate", "EndDate", "CreatedAt", "IsDeleted")
                VALUES (@Id, @ClubId, @Name, @StartDate, @EndDate, now() AT TIME ZONE 'utc', false)
                ON CONFLICT ("Id") DO NOTHING;
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@Id", StarterKitSeasonId);
            cmd.Parameters.AddWithValue("@ClubId", StarterKitClubId);
            cmd.Parameters.AddWithValue("@Name", "StarterKit Default Season");
            cmd.Parameters.AddWithValue("@StartDate", new DateOnly(2020, 1, 1));
            cmd.Parameters.AddWithValue("@EndDate", new DateOnly(2099, 12, 31));
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Team ─────────────────────────────────────────────────────────
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "Teams" ("Id", "SeasonId", "Name", "CreatedAt", "IsDeleted")
                VALUES (@Id, @SeasonId, @Name, now() AT TIME ZONE 'utc', false)
                ON CONFLICT ("Id") DO NOTHING;
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@Id", StarterKitTeamId);
            cmd.Parameters.AddWithValue("@SeasonId", StarterKitSeasonId);
            cmd.Parameters.AddWithValue("@Name", "General");
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Dev admin user (admin@starterkit.local) ─────────────────────────────
        // ExternalAuthId is seeded as a placeholder; the real Firebase UID is
        // written by the bootstrap endpoint (POST /api/dev/bootstrap-admin) on
        // first sign-in, so the seeder stays decoupled from the Firebase project.
        // Guard by ExternalAuthId (not just Id) to avoid inserting a duplicate when
        // DevBootstrapService already created the user with a different GUID.
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "Users"
                    ("Id", "ExternalAuthId", "ClubId", "Email", "DisplayName", "AuthMethod", "IsActive", "IsDeleted", "LastActiveAt", "CreatedAt")
                SELECT
                    @UserId, 'nsdeS848Y6Q0StvR3lI5qVz2bGa2', @ClubId, 'admin@starterkit.local', 'Dev Admin', 0, true, false, now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'
                WHERE NOT EXISTS (SELECT 1 FROM "Users" WHERE "Id" = @UserId)
                  AND NOT EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'admin@starterkit.local');
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@UserId", DevAdminUserId);
            cmd.Parameters.AddWithValue("@ClubId", StarterKitClubId);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Dev admin team membership (UserTeams) ─────────────────────────────
        // TeamId used to be set directly on the Users row; team membership now lives
        // solely in UserTeams.
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "UserTeams" ("Id", "UserId", "TeamId", "IsDeleted", "CreatedAt")
                SELECT gen_random_uuid(), @UserId, @DeptId, false, now() AT TIME ZONE 'utc'
                WHERE NOT EXISTS (
                    SELECT 1 FROM "UserTeams"
                    WHERE "UserId" = @UserId AND "TeamId" = @DeptId AND "IsDeleted" = false
                );
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@UserId", DevAdminUserId);
            cmd.Parameters.AddWithValue("@DeptId", StarterKitTeamId);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Dev admin SuperAdmin role assignment ──────────────────────────────
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "UserRoleAssignments" ("Id", "UserId", "RoleId", "AssignedAt")
                SELECT gen_random_uuid(), @UserId, r."Id", now() AT TIME ZONE 'utc'
                FROM "Roles" r
                WHERE r."Name" = 'SuperAdmin'
                  AND NOT EXISTS (
                    SELECT 1 FROM "UserRoleAssignments" ura
                    WHERE ura."UserId" = @UserId AND ura."RoleId" = r."Id"
                  );
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@UserId", DevAdminUserId);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Test phone user ───────────────────────────────────────────────────
        // ExternalAuthId is a placeholder — DevBootstrapService replaces it with the
        // real Firebase UID on first sign-in with +27123456789 (OTP: 123456).
        // Guard by Id only — the placeholder 'dev-phone-test-user' is replaced on bootstrap,
        // so we can't use ExternalAuthId to detect an existing linked user.
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "Users"
                    ("Id", "ExternalAuthId", "ClubId", "Email", "DisplayName", "AuthMethod", "IsActive", "IsDeleted", "LastActiveAt", "CreatedAt")
                SELECT
                    @UserId, 'dev-phone-test-user', @ClubId, 'testplayer@starterkit.local', 'Test Player', 3, true, false, now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc'
                WHERE NOT EXISTS (SELECT 1 FROM "Users" WHERE "Id" = @UserId)
                  AND NOT EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'testplayer@starterkit.local' AND "ClubId" = @ClubId);
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@UserId", DevPhoneTestUserId);
            cmd.Parameters.AddWithValue("@ClubId", StarterKitClubId);
            await cmd.ExecuteNonQueryAsync();
        }

        // ── Test phone user role assignment (Athlete) ───────────────────────────
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "UserRoleAssignments" ("Id", "UserId", "RoleId", "AssignedAt")
                SELECT gen_random_uuid(), @UserId, r."Id", now() AT TIME ZONE 'utc'
                FROM "Roles" r
                WHERE r."Name" = 'Athlete'
                  AND NOT EXISTS (
                    SELECT 1 FROM "UserRoleAssignments" ura
                    WHERE ura."UserId" = @UserId AND ura."RoleId" = r."Id"
                  );
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@UserId", DevPhoneTestUserId);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
