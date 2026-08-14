using Npgsql;

namespace StarterKit.Migrator.Seeders;

/// <summary>
/// DEVELOPMENT ONLY. Seeds one Survey <c>ReflectionTemplate</c> and four assignments of it to the
/// dev athlete — surveys overdue, due in the future and already completed, plus one Homework —
/// so the Reflect &gt; Assignments tab renders all three of its sections and both
/// reflection types without anyone hand-writing SQL.
///
/// The athlete is resolved by email (<see cref="AthleteEmail"/>) and the club is taken from that
/// user's own row, rather than using <see cref="DevAdminSeeder.DevPhoneTestUserId"/> and
/// <see cref="DevAdminSeeder.StarterKitClubId"/>. Those constants describe the Firebase-era phone
/// account, which holds no role assignment and cannot sign in: assignments hung off it were
/// invisible to every account that can. Assignment <c>ClubId</c> also has to match the athlete's
/// club or the tenant query filter hides the rows from their own requests.
///
/// This exists because nothing yet <em>creates</em> assignments: the Coach/Director assign flow is
/// separate follow-on work. It is not production seed data, which is why it lives here (behind the
/// migrator's <c>IsDevelopment</c> gate) rather than in an EF migration.
///
/// Ids are fixed rather than <c>Guid.NewGuid()</c> — the same reasoning as
/// <see cref="DevAdminSeeder"/>: a dev seeder must be idempotent across re-runs, and these rows
/// never reach a deployed environment.
/// </summary>
internal static class DevSurveyAssignmentSeeder
{
    /// <summary>
    /// The dev athlete these assignments belong to.
    ///
    /// Nothing in this repository creates this account: it has to exist in Supabase already, be
    /// linked to a club, and hold a role assignment. On a machine where it does not, seeding is
    /// skipped and the migrator says so — see the return value of <see cref="SeedAsync"/>. Earlier
    /// this claimed the Supabase auth fixtures seeded it, which was wrong, and the skip was silent
    /// while the migrator still printed success.
    /// </summary>
    public const string AthleteEmail = "athlete@starterkit.local";

    private static readonly Guid TemplateId = new("00000000-0000-0000-0000-000000000097");
    private static readonly Guid TemplateShareId = new("00000000-0000-0000-0000-000000000098");

    /// <summary>Template question ids, and the assignment-question ids copied from each.</summary>
    private static readonly Guid RatingQuestionId = new("00000000-0000-0000-0000-000000009701");
    private static readonly Guid FillInQuestionId = new("00000000-0000-0000-0000-000000009702");
    private static readonly Guid ChoiceQuestionId = new("00000000-0000-0000-0000-000000009703");

    /// <summary>One assignment per Reflect tab section.</summary>
    private static readonly Guid OverdueAssignmentId = new("00000000-0000-0000-0000-000000009711");
    private static readonly Guid UpcomingAssignmentId = new("00000000-0000-0000-0000-000000009712");
    private static readonly Guid CompletedAssignmentId = new(
        "00000000-0000-0000-0000-000000009713"
    );

    /// <summary>
    /// A Homework assignment alongside the surveys, so the merged Assignments list renders its
    /// per-type icon and label with real mixed data rather than only ever showing surveys.
    /// </summary>
    private static readonly Guid HomeworkAssignmentId = new("00000000-0000-0000-0000-000000009714");

    private const string RatingContent = """
        {"prompt":"How confident do you feel about your serve right now?","minValue":1,"maxValue":5,"minLabel":"Not at all","maxLabel":"Very confident"}
        """;

    private const string FillInContent = """
        {"prompt":"What is the one thing you most want to work on this week?","maxLength":500}
        """;

    private const string ChoiceContent = """
        {"prompt":"When working on a team project, I prefer to:","options":[{"id":"a","text":"Take charge and drive results"},{"id":"b","text":"Motivate and energize the team"},{"id":"c","text":"Support others and maintain harmony"},{"id":"d","text":"Analyze details and ensure accuracy"}]}
        """;

    /// <summary>
    /// One Rating + Fill In + Multiple Choice set per assignment. Every assignment initially
    /// copied the template's questions verbatim, so all four opened as the same survey and
    /// nothing on a device distinguished them; the copy semantics stay (each row is still an
    /// assignment-owned snapshot with template lineage), only the seeded content differs.
    /// </summary>
    private static readonly IReadOnlyDictionary<
        Guid,
        (string Rating, string FillIn, string Choice)
    > AssignmentQuestionContent = new Dictionary<Guid, (string, string, string)>
    {
        [OverdueAssignmentId] = (RatingContent, FillInContent, ChoiceContent),
        [UpcomingAssignmentId] = (
            """
            {"prompt":"How well did you stick to this week's training plan?","minValue":1,"maxValue":5,"minLabel":"Not at all","maxLabel":"Perfectly"}
            """,
            """
            {"prompt":"Which part of the training plan was hardest to follow, and why?","maxLength":500}
            """,
            """
            {"prompt":"How do you prefer to get feedback after training?","options":[{"id":"a","text":"One-on-one with the coach"},{"id":"b","text":"Written notes"},{"id":"c","text":"Video review"},{"id":"d","text":"Group debrief"}]}
            """
        ),
        [CompletedAssignmentId] = (
            """
            {"prompt":"How consistent was your serve toss in this session?","minValue":1,"maxValue":5,"minLabel":"All over the place","maxLabel":"Rock solid"}
            """,
            """
            {"prompt":"Describe one adjustment you made to your serve this session.","maxLength":500}
            """,
            """
            {"prompt":"Which serve are you most confident hitting under pressure?","options":[{"id":"a","text":"Standing float"},{"id":"b","text":"Jump float"},{"id":"c","text":"Jump spin"},{"id":"d","text":"Short serve"}]}
            """
        ),
        [HomeworkAssignmentId] = (
            """
            {"prompt":"How clearly can you visualise your role in the next match?","minValue":1,"maxValue":5,"minLabel":"Blurry","maxLabel":"Crystal clear"}
            """,
            """
            {"prompt":"Walk through one moment from the last match you would replay differently.","maxLength":500}
            """,
            """
            {"prompt":"When do you find visualisation easiest?","options":[{"id":"a","text":"The night before"},{"id":"b","text":"The morning of the match"},{"id":"c","text":"Travelling to the venue"},{"id":"d","text":"Right before warm-up"}]}
            """
        ),
    };

    public static async Task<bool> HasBeenSeededAsync(NpgsqlConnection connection)
    {
        await using var command = new NpgsqlCommand(
            """
            SELECT COUNT(1) FROM "ReflectionAssignments"
            WHERE "Id" IN (@OverdueId, @UpcomingId, @CompletedId, @HomeworkId)
            """,
            connection
        );
        command.Parameters.AddWithValue("@OverdueId", OverdueAssignmentId);
        command.Parameters.AddWithValue("@UpcomingId", UpcomingAssignmentId);
        command.Parameters.AddWithValue("@CompletedId", CompletedAssignmentId);
        command.Parameters.AddWithValue("@HomeworkId", HomeworkAssignmentId);
        return (long)(await command.ExecuteScalarAsync() ?? 0L) >= 4;
    }

    /// <summary>
    /// Seeds the dev assignments. Returns false when <see cref="AthleteEmail"/> resolves to no
    /// usable account, so the caller can report a skip rather than a success.
    /// </summary>
    public static async Task<bool> SeedAsync(NpgsqlConnection connection)
    {
        var target = await ResolveAthleteAsync(connection);
        if (target is null)
            return false;

        var (userId, clubId) = target.Value;

        await SeedTemplateAsync(connection);
        await SeedTemplateQuestionsAsync(connection);
        await SeedTemplateShareAsync(connection, clubId);

        // Overdue and undated-style urgency both land in Needs Attention; a future due date lands
        // in Due Soon. Relative offsets keep the seed meaningful however long after it runs.
        await SeedAssignmentAsync(
            connection,
            OverdueAssignmentId,
            "Skillset surveys",
            dueAtOffsetDays: -2,
            isCompleted: false,
            userId,
            clubId
        );
        await SeedAssignmentAsync(
            connection,
            UpcomingAssignmentId,
            "Training protocols",
            dueAtOffsetDays: 5,
            isCompleted: false,
            userId,
            clubId
        );
        await SeedAssignmentAsync(
            connection,
            CompletedAssignmentId,
            "Practice serves",
            dueAtOffsetDays: -10,
            isCompleted: true,
            userId,
            clubId
        );
        await SeedAssignmentAsync(
            connection,
            HomeworkAssignmentId,
            "Match visualisation",
            dueAtOffsetDays: 3,
            isCompleted: false,
            userId,
            clubId,
            reflectionType: "Homework"
        );

        return true;
    }

    /// <summary>
    /// The dev athlete's user and club ids, or <c>null</c> when that account is absent (a
    /// partially-seeded database) so the migrator run does not fail over dev-only fixture data.
    ///
    /// Requires the Athlete role assignment: without it the endpoint 403s on
    /// <c>StarterKit.ReflectionAssignments.Access</c> and the seeded rows are unreachable anyway.
    /// </summary>
    private static async Task<(Guid UserId, Guid ClubId)?> ResolveAthleteAsync(
        NpgsqlConnection connection
    )
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT u."Id", u."ClubId"
            FROM "Users" u
            WHERE lower(u."Email") = @Email
              AND u."IsDeleted" = false
              AND u."ClubId" IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM "UserRoleAssignments" ura WHERE ura."UserId" = u."Id"
              )
            LIMIT 1;
            """,
            connection
        );
        cmd.Parameters.AddWithValue("@Email", AthleteEmail);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (!await reader.ReadAsync())
            return null;

        return (reader.GetGuid(0), reader.GetGuid(1));
    }

    private static async Task SeedTemplateAsync(NpgsqlConnection connection)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO "ReflectionTemplates"
                ("Id", "Name", "ReflectionType", "XPValue", "IsActive", "CreatedAt", "IsDeleted")
            VALUES (@Id, @Name, 'Survey', 25, true, now() AT TIME ZONE 'utc', false)
            ON CONFLICT ("Id") DO NOTHING;
            """,
            connection
        );
        cmd.Parameters.AddWithValue("@Id", TemplateId);
        cmd.Parameters.AddWithValue("@Name", "Dev survey template");
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task SeedTemplateQuestionsAsync(NpgsqlConnection connection)
    {
        var questions = new (Guid Id, string Type, string Content, int SortOrder)[]
        {
            (RatingQuestionId, "Rating", RatingContent, 0),
            (FillInQuestionId, "FillIn", FillInContent, 1),
            (ChoiceQuestionId, "MultipleChoice", ChoiceContent, 2),
        };

        foreach (var (id, type, content, sortOrder) in questions)
        {
            await using var cmd = new NpgsqlCommand(
                """
                INSERT INTO "ReflectionTemplateQuestions"
                    ("Id", "ReflectionTemplateId", "QuestionType", "QuestionContent", "SortOrder", "CreatedAt", "IsDeleted")
                VALUES (@Id, @TemplateId, @QuestionType, @QuestionContent::jsonb, @SortOrder, now() AT TIME ZONE 'utc', false)
                ON CONFLICT ("Id") DO NOTHING;
                """,
                connection
            );
            cmd.Parameters.AddWithValue("@Id", id);
            cmd.Parameters.AddWithValue("@TemplateId", TemplateId);
            cmd.Parameters.AddWithValue("@QuestionType", type);
            cmd.Parameters.AddWithValue("@QuestionContent", content);
            cmd.Parameters.AddWithValue("@SortOrder", sortOrder);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static async Task SeedTemplateShareAsync(NpgsqlConnection connection, Guid clubId)
    {
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO "ReflectionTemplateClubs"
                ("Id", "ReflectionTemplateId", "ClubId", "CreatedAt", "IsDeleted")
            VALUES (@Id, @TemplateId, @ClubId, now() AT TIME ZONE 'utc', false)
            ON CONFLICT ("Id") DO NOTHING;
            """,
            connection
        );
        cmd.Parameters.AddWithValue("@Id", TemplateShareId);
        cmd.Parameters.AddWithValue("@TemplateId", TemplateId);
        cmd.Parameters.AddWithValue("@ClubId", clubId);
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>
    /// Inserts one assignment plus a copy of every template question, mirroring what the
    /// Coach-side assign flow will do.
    /// </summary>
    private static async Task SeedAssignmentAsync(
        NpgsqlConnection connection,
        Guid assignmentId,
        string name,
        int dueAtOffsetDays,
        bool isCompleted,
        Guid userId,
        Guid clubId,
        string reflectionType = "Survey"
    )
    {
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "ReflectionAssignments"
                    ("Id", "ClubId", "AssignedToUserId", "ReflectionTemplateId", "Name", "ReflectionType",
                     "XPValue", "DueAt", "CompletedAt", "CreatedAt", "IsDeleted")
                SELECT
                    @Id, @ClubId, @UserId, @TemplateId, @Name, @ReflectionType, 25,
                    (now() AT TIME ZONE 'utc') + make_interval(days => @DueAtOffsetDays),
                    CASE WHEN @IsCompleted THEN (now() AT TIME ZONE 'utc') ELSE NULL END,
                    now() AT TIME ZONE 'utc', false
                WHERE EXISTS (SELECT 1 FROM "Users" WHERE "Id" = @UserId)
                ON CONFLICT ("Id") DO NOTHING;
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@Id", assignmentId);
            cmd.Parameters.AddWithValue("@ClubId", clubId);
            cmd.Parameters.AddWithValue("@UserId", userId);
            cmd.Parameters.AddWithValue("@TemplateId", TemplateId);
            cmd.Parameters.AddWithValue("@Name", name);
            cmd.Parameters.AddWithValue("@ReflectionType", reflectionType);
            cmd.Parameters.AddWithValue("@DueAtOffsetDays", dueAtOffsetDays);
            cmd.Parameters.AddWithValue("@IsCompleted", isCompleted);
            await cmd.ExecuteNonQueryAsync();
        }

        // Questions are copied, not referenced — the whole point of the assignment domain. Each
        // assignment carries its own content (see AssignmentQuestionContent) while keeping
        // template lineage per sort order, exactly as the assign flow's copy will.
        var (rating, fillIn, choice) = AssignmentQuestionContent[assignmentId];
        var questions = new (Guid TemplateQuestionId, string Type, string Content, int SortOrder)[]
        {
            (RatingQuestionId, "Rating", rating, 0),
            (FillInQuestionId, "FillIn", fillIn, 1),
            (ChoiceQuestionId, "MultipleChoice", choice, 2),
        };

        foreach (var (templateQuestionId, type, content, sortOrder) in questions)
        {
            await using var cmd = new NpgsqlCommand(
                """
                INSERT INTO "ReflectionAssignmentQuestions"
                    ("Id", "ReflectionAssignmentId", "ReflectionTemplateQuestionId", "QuestionType",
                     "QuestionContent", "SortOrder", "CreatedAt", "IsDeleted")
                SELECT
                    gen_random_uuid(), @AssignmentId, @TemplateQuestionId, @QuestionType,
                    @QuestionContent::jsonb, @SortOrder, now() AT TIME ZONE 'utc', false
                WHERE EXISTS (SELECT 1 FROM "ReflectionAssignments" WHERE "Id" = @AssignmentId)
                  AND NOT EXISTS (
                    SELECT 1 FROM "ReflectionAssignmentQuestions" aq
                    WHERE aq."ReflectionAssignmentId" = @AssignmentId
                      AND aq."ReflectionTemplateQuestionId" = @TemplateQuestionId
                  );
                """,
                connection
            );
            cmd.Parameters.AddWithValue("@AssignmentId", assignmentId);
            cmd.Parameters.AddWithValue("@TemplateQuestionId", templateQuestionId);
            cmd.Parameters.AddWithValue("@QuestionType", type);
            cmd.Parameters.AddWithValue("@QuestionContent", content);
            cmd.Parameters.AddWithValue("@SortOrder", sortOrder);
            await cmd.ExecuteNonQueryAsync();
        }

        if (!isCompleted)
            return;

        // A completed assignment needs every question answered, or reopening it would contradict
        // its own Completed badge.
        await using (
            var cmd = new NpgsqlCommand(
                """
                INSERT INTO "ReflectionAssignmentAnswers"
                    ("Id", "ReflectionAssignmentQuestionId", "AnswerContent", "AnsweredAt", "CreatedAt", "IsDeleted")
                SELECT
                    gen_random_uuid(), aq."Id",
                    CASE aq."QuestionType"
                        WHEN 'Rating' THEN '{"ratingValue":4}'
                        WHEN 'FillIn' THEN '{"text":"Consistency on my second serve."}'
                        ELSE '{"selectedOptionId":"b"}'
                    END::jsonb,
                    now() AT TIME ZONE 'utc', now() AT TIME ZONE 'utc', false
                FROM "ReflectionAssignmentQuestions" aq
                WHERE aq."ReflectionAssignmentId" = @AssignmentId
                  AND NOT EXISTS (
                    SELECT 1 FROM "ReflectionAssignmentAnswers" a
                    WHERE a."ReflectionAssignmentQuestionId" = aq."Id"
                  );
                """,
                connection
            )
        )
        {
            cmd.Parameters.AddWithValue("@AssignmentId", assignmentId);
            await cmd.ExecuteNonQueryAsync();
        }
    }
}
