using Microsoft.Extensions.Logging;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Data.Extensions;
using StarterKit.Data.Seasons.Interfaces.Repositories;
using StarterKit.Data.Seasons.Models;

namespace StarterKit.Core.Seasons.Services;

public class SeasonService(
    ISeasonRepository seasonRepository,
    TimeProvider clock,
    ILogger<SeasonService> logger
) : ISeasonService
{
    public async Task<Season> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await seasonRepository.GetAsync(id, cancellationToken);
    }

    public async Task<Season?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await seasonRepository.FindByIdAsync(id, cancellationToken);
    }

    public async Task<Season> GetOrCreateCurrentAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var today = DateOnly.FromDateTime(clock.Now());

        var existing = await seasonRepository.FindCurrentAsync(clubId, today, cancellationToken);
        if (existing is not null)
            return existing;

        logger.LogInformation(
            "No current season for club {ClubId} — creating a default {Year} season",
            clubId,
            today.Year
        );

        var season = new Season
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            Name = null,
            StartDate = new DateOnly(today.Year, 1, 1),
            EndDate = new DateOnly(today.Year, 12, 31),
        };

        await seasonRepository.AddAsync(season, cancellationToken);

        return season;
    }

    public async Task<IReadOnlyList<Season>> ListByClubAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        return await seasonRepository.ListByClubAsync(clubId, cancellationToken);
    }

    public async Task<Season> CreateAsync(
        Guid clubId,
        string? name,
        DateOnly startDate,
        DateOnly endDate,
        Guid? cloneTeamsFromSeasonId = null,
        CancellationToken cancellationToken = default
    )
    {
        if (endDate < startDate)
            throw new ArgumentException("The end date must be on or after the start date.");

        logger.LogInformation(
            "Creating season for club {ClubId}: {StartDate}–{EndDate}",
            clubId,
            startDate,
            endDate
        );

        if (cloneTeamsFromSeasonId is not null)
        {
            // TODO: implement "clone team structure from prior season" — accepted for API
            // contract stability but intentionally not acted on yet.
            logger.LogInformation(
                "cloneTeamsFromSeasonId {SourceSeasonId} supplied but team cloning is not yet implemented — ignoring",
                cloneTeamsFromSeasonId
            );
        }

        var season = new Season
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            Name = string.IsNullOrWhiteSpace(name) ? null : name.Trim(),
            StartDate = startDate,
            EndDate = endDate,
        };

        await seasonRepository.AddAsync(season, cancellationToken);

        return season;
    }

    public string GetDisplayLabel(Season season)
    {
        if (!string.IsNullOrWhiteSpace(season.Name))
            return season.Name;

        return season.StartDate.Year == season.EndDate.Year
            ? $"{season.StartDate.Year} Season"
            : $"{season.StartDate.Year}/{season.EndDate.Year} Season";
    }
}
