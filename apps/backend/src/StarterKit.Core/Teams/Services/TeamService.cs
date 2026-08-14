using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StarterKit.Core.Common;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Extensions;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Core.Teams.Services;

public class TeamService : ITeamService
{
    private readonly ITeamRepository _teamRepository;
    private readonly IBlobStorageService _blobStorageService;
    private readonly ILogger<TeamService> _logger;

    public TeamService(
        ITeamRepository teamRepository,
        IBlobStorageService blobStorageService,
        ILogger<TeamService> logger
    )
    {
        _teamRepository = teamRepository;
        _blobStorageService = blobStorageService;
        _logger = logger;
    }

    /// <summary>
    /// Resolves a stored team-logo blob path to a short-lived, browser-renderable URL.
    /// Team logos are uploaded via the shared club image endpoint, so they live in the same
    /// container and resolve the same way.
    /// </summary>
    public Task<string?> ResolveLogoSasUrlAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    ) => _blobStorageService.ResolveStoredPathAsync(storedPath, cancellationToken);

    public async Task<PagedResult<TeamListItem>> ListAsync(
        TeamListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount) = await _teamRepository.ListAsync(
            query.ClampedPage,
            query.ClampedPageSize,
            query.ClubId,
            query.SeasonId,
            query.FilterText,
            cancellationToken
        );

        return new PagedResult<TeamListItem>
        {
            Items = items,
            TotalCount = totalCount,
            Page = query.ClampedPage,
            PageSize = query.ClampedPageSize,
        };
    }

    public async Task<Team> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _teamRepository.GetAsync(id, cancellationToken);
    }

    public async Task<Team?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _teamRepository.FindByIdAsync(id, cancellationToken);
    }

    public async Task<Team> CreateAsync(
        Guid seasonId,
        string name,
        string? description = null,
        AgeGroup? ageGroup = null,
        string? logoUrl = null,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Creating team {Name} for season {SeasonId}", name, seasonId);

        var existing = await _teamRepository.FindByNameInSeasonAsync(
            seasonId,
            name,
            cancellationToken
        );

        if (existing is not null)
            throw new ConflictException($"A team named '{name}' already exists in this season.");

        var team = new Team
        {
            Id = Guid.NewGuid(),
            SeasonId = seasonId,
            Name = name,
            Description = description,
            AgeGroup = ageGroup,
            LogoUrl = logoUrl,
        };

        try
        {
            await _teamRepository.AddAsync(team, cancellationToken);
        }
        catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
        {
            throw new ConflictException($"A team named '{name}' already exists in this season.");
        }

        return team;
    }

    public async Task<Team> UpdateAsync(
        Guid id,
        string name,
        string? description = null,
        AgeGroup? ageGroup = null,
        string? logoUrl = null,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Updating team {TeamId}: {Name}", id, name);

        var team = await _teamRepository.GetAsync(id, cancellationToken);

        var existing = await _teamRepository.FindByNameInSeasonAsync(
            team.SeasonId,
            name,
            cancellationToken,
            excludeId: id
        );

        if (existing is not null)
            throw new ConflictException($"A team named '{name}' already exists in this season.");

        team.Name = name;
        team.Description = description;
        team.AgeGroup = ageGroup;
        team.LogoUrl = logoUrl;

        try
        {
            await _teamRepository.UpdateAsync(team, cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new ConflictException(
                $"Team '{id}' was updated by someone else. Please try again.",
                errorCode: "team-concurrency-conflict",
                conflictingEntityId: id
            );
        }
        catch (DbUpdateException ex) when (ex.IsUniqueConstraintViolation())
        {
            throw new ConflictException($"A team named '{name}' already exists in this season.");
        }

        return team;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting team {TeamId}", id);
        await _teamRepository.DeleteAsync(id, cancellationToken);
    }
}
