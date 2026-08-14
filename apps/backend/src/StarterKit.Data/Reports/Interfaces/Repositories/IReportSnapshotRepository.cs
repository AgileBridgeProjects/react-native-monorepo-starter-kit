using StarterKit.Data.Reports.Models;

namespace StarterKit.Data.Reports.Interfaces.Repositories;

public interface IReportSnapshotRepository
{
    // Validates that a user exists and is active within the given club
    Task<bool> UserExistsInClubAsync(
        Guid userId,
        Guid clubId,
        CancellationToken cancellationToken = default
    );

    // Club snapshots
    Task<IReadOnlyList<DailyClubSnapshot>> GetClubSnapshotsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<DailyClubSnapshot>> GetClubSnapshotsAsync(
        Guid clubId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    );

    Task UpsertClubSnapshotAsync(
        DailyClubSnapshot snapshot,
        CancellationToken cancellationToken = default
    );

    // Team snapshots
    Task<IReadOnlyList<DailyTeamSnapshot>> GetTeamSnapshotsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    );

    Task<IReadOnlyList<DailyTeamSnapshot>> GetTeamSnapshotsAsync(
        Guid clubId,
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken = default
    );

    Task UpsertTeamSnapshotAsync(
        DailyTeamSnapshot snapshot,
        CancellationToken cancellationToken = default
    );

    // Team report — paginated, aggregated per-team with user counts, LEFT JOIN from all teams
    Task<(
        IReadOnlyList<TeamReportRow> Items,
        int TotalCount,
        decimal ClubWeightedAvg,
        decimal ClubUnweightedAvg
    )> GetTeamsReportAsync(TeamReportQuery query, CancellationToken cancellationToken = default);

    // Lightweight dept metadata (name + active user count) used for trend computation
    Task<IReadOnlyList<TeamMetadataRow>> GetTeamMetadataAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    );
}
