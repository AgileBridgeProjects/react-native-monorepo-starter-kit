using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Data.Seasons.Models;
using StarterKit.WebApi.Seasons.DTOs;
using StarterKit.WebApi.Seasons.Interfaces;
using StarterKit.WebApi.Seasons.Mappers;

namespace StarterKit.WebApi.Seasons;

[ApiController]
[Route("api/clubs/{clubId:guid}/seasons")]
[Tags("Seasons")]
[Authorize]
public sealed class SeasonController(ISeasonService seasonService)
    : ControllerBase,
        ISeasonController
{
    /// <summary>
    /// Lists all seasons for a club, newest first — used to populate season filters/pickers.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [ProducesResponseType(typeof(SeasonListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeasonListResponse>> ListAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var seasons = await seasonService.ListByClubAsync(clubId, cancellationToken);

        return Ok(new SeasonListResponse { Items = seasons.Select(ToResponse).ToList() });
    }

    /// <summary>
    /// Returns the club's current season (whose date range contains today), creating a
    /// default calendar-year season for the club if none exists yet.
    /// </summary>
    [HttpGet("current")]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [ProducesResponseType(typeof(SeasonResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SeasonResponse>> GetCurrentAsync(
        Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var season = await seasonService.GetOrCreateCurrentAsync(clubId, cancellationToken);

        return Ok(ToResponse(season));
    }

    /// <summary>
    /// Explicitly creates a new season for a club (the admin "Add Season" action). Unlike
    /// the "current season" auto-create, dates are always caller-supplied.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [ProducesResponseType(typeof(SeasonResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SeasonResponse>> CreateAsync(
        Guid clubId,
        [FromBody] CreateSeasonRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var season = await seasonService.CreateAsync(
            clubId,
            request.Name,
            request.StartDate,
            request.EndDate,
            request.CloneTeamsFromSeasonId,
            cancellationToken
        );

        return Created($"/api/clubs/{clubId}/seasons/{season.Id}", ToResponse(season));
    }

    private SeasonResponse ToResponse(Season season) =>
        season.ToResponse() with
        {
            DisplayLabel = seasonService.GetDisplayLabel(season),
        };
}
