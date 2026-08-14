using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Data.Seasons.Models;
using StarterKit.WebApi.Seasons.DTOs;
using StarterKit.WebApi.Seasons.Mappers;

namespace StarterKit.WebApi.Seasons.Mcp;

/// <summary>MCP tools mirroring <see cref="SeasonController"/> 1:1.</summary>
[McpServerToolType]
public sealed class SeasonMcpTools(ISeasonService seasonService)
{
    [McpServerTool(Name = "seasons_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [Description(
        "Lists all seasons for a club, newest first — used to populate season filters/pickers."
    )]
    public async Task<SeasonListResponse> ListAsync(
        [Description("The club whose seasons are listed.")] Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var seasons = await seasonService.ListByClubAsync(clubId, cancellationToken);

        return new SeasonListResponse { Items = seasons.Select(ToResponse).ToList() };
    }

    [McpServerTool(Name = "seasons_get_current", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [Description(
        "Returns the club's current season (whose date range contains today), creating a default calendar-year season for the club if none exists yet."
    )]
    public async Task<SeasonResponse> GetCurrentAsync(
        [Description("The club whose current season is returned.")] Guid clubId,
        CancellationToken cancellationToken = default
    )
    {
        var season = await seasonService.GetOrCreateCurrentAsync(clubId, cancellationToken);

        return ToResponse(season);
    }

    [McpServerTool(Name = "seasons_create")]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [Description(
        "Explicitly creates a new season for a club (the admin \"Add Season\" action). Dates are always caller-supplied."
    )]
    public async Task<SeasonResponse> CreateAsync(
        [Description("The club the season belongs to.")] Guid clubId,
        CreateSeasonRequest request,
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

        return ToResponse(season);
    }

    private SeasonResponse ToResponse(Season season) =>
        season.ToResponse() with
        {
            DisplayLabel = seasonService.GetDisplayLabel(season),
        };
}
