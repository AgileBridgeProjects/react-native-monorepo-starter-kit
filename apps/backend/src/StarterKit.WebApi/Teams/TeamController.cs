using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.WebApi.Teams.DTOs;
using StarterKit.WebApi.Teams.Interfaces;
using StarterKit.WebApi.Teams.Mappers;
using CoreTeamListQuery = StarterKit.Core.Teams.TeamListQuery;

namespace StarterKit.WebApi.Teams;

[ApiController]
[Route("api/teams")]
[Tags("Teams")]
[Authorize]
public sealed class TeamController(ITeamService teamService) : ControllerBase, ITeamController
{
    /// <summary>
    /// Returns a paginated list of teams, optionally filtered by club.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [ProducesResponseType(typeof(TeamListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<TeamListResponse>> ListAsync(
        [FromQuery] TeamListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await teamService.ListAsync(
            new CoreTeamListQuery
            {
                ClubId = query.ClubId,
                SeasonId = query.SeasonId,
                FilterText = query.FilterText,
                Page = query.Page,
                PageSize = query.PageSize,
                SortBy = query.SortBy,
                SortDescending = query.SortDescending,
            },
            cancellationToken
        );

        var logoTasks = result
            .Items.Select(item =>
                teamService.ResolveLogoSasUrlAsync(item.Team.LogoUrl, cancellationToken)
            )
            .ToList();
        var resolvedLogos = await Task.WhenAll(logoTasks);

        return Ok(
            new TeamListResponse
            {
                Items = result
                    .Items.Zip(resolvedLogos)
                    .Select(pair => pair.First.ToResponse() with { LogoUrl = pair.Second })
                    .ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single team by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [ProducesResponseType(typeof(TeamResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TeamResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var team = await teamService.GetAsync(id, cancellationToken);

        return Ok(await ToResponseAsync(team, cancellationToken));
    }

    /// <summary>
    /// Creates a new team for the specified season.
    /// </summary>
    [HttpPost("/api/seasons/{seasonId:guid}/teams")]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [ProducesResponseType(typeof(TeamResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TeamResponse>> CreateAsync(
        [FromRoute] Guid seasonId,
        [FromBody] CreateTeamRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var team = await teamService.CreateAsync(
            seasonId,
            request.Name,
            request.Description,
            request.AgeGroup,
            request.LogoUrl,
            cancellationToken
        );

        return Created($"/api/teams/{team.Id}", await ToResponseAsync(team, cancellationToken));
    }

    /// <summary>
    /// Updates an existing team.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [ProducesResponseType(typeof(TeamResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TeamResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateTeamRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var team = await teamService.UpdateAsync(
            id,
            request.Name,
            request.Description,
            request.AgeGroup,
            request.LogoUrl,
            cancellationToken
        );
        return Ok(await ToResponseAsync(team, cancellationToken));
    }

    /// <summary>
    /// Soft-deletes a team.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await teamService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Maps a team to its response, resolving the stored logo path to a browser-renderable SAS URL.
    /// </summary>
    private async Task<TeamResponse> ToResponseAsync(
        Data.Teams.Models.Team team,
        CancellationToken cancellationToken
    )
    {
        var resolvedLogo = await teamService.ResolveLogoSasUrlAsync(
            team.LogoUrl,
            cancellationToken
        );
        return team.ToResponse() with { LogoUrl = resolvedLogo };
    }
}
