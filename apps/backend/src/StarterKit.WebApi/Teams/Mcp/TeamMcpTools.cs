using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.WebApi.Teams.DTOs;
using StarterKit.WebApi.Teams.Mappers;
using CoreTeamListQuery = StarterKit.Core.Teams.TeamListQuery;

namespace StarterKit.WebApi.Teams.Mcp;

/// <summary>MCP tools mirroring <see cref="TeamController"/> 1:1.</summary>
[McpServerToolType]
public sealed class TeamMcpTools(ITeamService teamService)
{
    [McpServerTool(Name = "teams_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [Description("Returns a paginated list of teams, optionally filtered by club and season.")]
    public async Task<TeamListResponse> ListAsync(
        [Description(
            "Optional club/season scope plus paging, sorting and free-text filter options."
        )]
            TeamListQuery query,
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

        return new TeamListResponse
        {
            Items = result
                .Items.Zip(resolvedLogos)
                .Select(pair => pair.First.ToResponse() with { LogoUrl = pair.Second })
                .ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "teams_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.View)]
    [Description("Returns a single team by ID.")]
    public async Task<TeamResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var team = await teamService.GetAsync(id, cancellationToken);

        return await ToResponseAsync(team, cancellationToken);
    }

    [McpServerTool(Name = "teams_create")]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [Description("Creates a new team for the specified season.")]
    public async Task<TeamResponse> CreateAsync(
        [Description("The season the new team belongs to.")] Guid seasonId,
        CreateTeamRequest request,
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

        return await ToResponseAsync(team, cancellationToken);
    }

    [McpServerTool(Name = "teams_update", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [Description("Updates an existing team.")]
    public async Task<TeamResponse> UpdateAsync(
        Guid id,
        UpdateTeamRequest request,
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
        return await ToResponseAsync(team, cancellationToken);
    }

    [McpServerTool(Name = "teams_delete", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Teams.Manage)]
    [Description("Soft-deletes a team.")]
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await teamService.DeleteAsync(id, cancellationToken);
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
