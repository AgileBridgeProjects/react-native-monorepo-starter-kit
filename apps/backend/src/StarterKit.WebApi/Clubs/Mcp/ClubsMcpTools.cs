using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Clubs.DTOs;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Storage;
using StarterKit.Data.Clubs.Models;
using StarterKit.WebApi.Clubs.DTOs;

namespace StarterKit.WebApi.Clubs.Mcp;

/// <summary>MCP tools mirroring <see cref="ClubsController"/> 1:1.</summary>
// Not MCP-exposed: UploadLogoAsync (POST /api/clubs/images) — multipart IFormFile upload does
// not map to MCP tool JSON.
[McpServerToolType]
public sealed class ClubsMcpTools(
    IClubService clubService,
    IOptionsMonitor<LogoUploadOptions> logoUploadOptions
)
{
    [McpServerTool(Name = "clubs_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
    [Description("Returns a paginated list of all clubs.")]
    public async Task<ClubListResponse> ListAsync(
        [Description("Paging, sorting and free-text filter options.")] ClubListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await clubService.ListAsync(
            query.ClampedPage,
            query.ClampedPageSize,
            query.FilterText,
            query.SortBy,
            query.SortDescending,
            cancellationToken
        );

        var logoTasks = result
            .Items.Select(item =>
                clubService.ResolveLogoSasUrlAsync(item.Club.LogoUrl, cancellationToken)
            )
            .ToList();
        var resolvedUrls = await Task.WhenAll(logoTasks);

        var items = result
            .Items.Zip(resolvedUrls)
            .Select(pair =>
                ToResponse(
                    pair.First.Club,
                    pair.Second,
                    pair.First.ActiveUserCount,
                    pair.First.TeamCount
                )
            )
            .ToList();

        return new ClubListResponse
        {
            Items = items,
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "clubs_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
    [Description("Returns a single club by ID.")]
    public async Task<ClubResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var club = await clubService.GetAsync(id, cancellationToken);

        return await ToResponseAsync(club, cancellationToken);
    }

    [McpServerTool(Name = "clubs_create")]
    [Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
    [Description("Creates a new club.")]
    public async Task<ClubResponse> CreateAsync(
        CreateClubRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var command = new CreateClubCommand(
            Name: request.Name,
            StreetAddress: request.StreetAddress,
            City: request.City,
            State: request.State,
            SeasonStartDate: request.SeasonStartDate,
            SeasonEndDate: request.SeasonEndDate,
            SeasonName: request.SeasonName,
            ZipCode: request.ZipCode,
            Timezone: request.Timezone,
            MaxAthletes: request.MaxAthletes,
            LogoUrl: request.LogoUrl
        );

        var club = await clubService.CreateAsync(command, cancellationToken);
        return await ToResponseAsync(club, cancellationToken);
    }

    [McpServerTool(Name = "clubs_update", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
    [Description("Updates an existing club.")]
    public async Task<ClubResponse> UpdateAsync(
        Guid id,
        UpdateClubRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var club = await clubService.UpdateAsync(
            new UpdateClubCommand(
                Id: id,
                Name: request.Name,
                StreetAddress: request.StreetAddress,
                City: request.City,
                State: request.State,
                ZipCode: request.ZipCode,
                Timezone: request.Timezone,
                MaxAthletes: request.MaxAthletes,
                LogoUrl: request.LogoUrl
            ),
            cancellationToken
        );
        return await ToResponseAsync(club, cancellationToken);
    }

    [McpServerTool(Name = "clubs_delete", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
    [Description("Soft-deletes an existing club (marks as deleted).")]
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await clubService.DeleteAsync(id, cancellationToken);
    }

    // The REST endpoint is [AllowAnonymous] so the club form can read constraints pre-auth;
    // the MCP endpoint itself always requires a bearer token, so plain [Authorize] here.
    [McpServerTool(Name = "clubs_get_upload_constraints", ReadOnly = true)]
    [Authorize]
    [Description(
        "Returns the server-canonical constraints for club logo uploads (accepted MIME types, max file size in bytes)."
    )]
    public UploadConstraintsResponse GetUploadConstraints()
    {
        var options = logoUploadOptions.CurrentValue;
        return new UploadConstraintsResponse
        {
            AllowedContentTypes = options.AllowedContentTypes,
            MaxFileSizeBytes = options.MaxFileSizeBytes,
        };
    }

    private async Task<ClubResponse> ToResponseAsync(
        Club club,
        CancellationToken cancellationToken,
        int? activeUserCount = null,
        int? teamCount = null
    ) =>
        ToResponse(
            club,
            await clubService.ResolveLogoSasUrlAsync(club.LogoUrl, cancellationToken),
            activeUserCount,
            teamCount
        );

    private static ClubResponse ToResponse(
        Club club,
        string? resolvedLogoUrl,
        int? activeUserCount = null,
        int? teamCount = null
    ) =>
        new()
        {
            Id = club.Id,
            Name = club.Name,
            StreetAddress = club.StreetAddress,
            City = club.City,
            State = club.State,
            ZipCode = club.ZipCode,
            Timezone = club.Timezone,
            MaxAthletes = club.MaxAthletes,
            LogoUrl = resolvedLogoUrl,
            CreatedAt = club.CreatedAt,
            CreatedBy = club.CreatedBy,
            UpdatedAt = club.UpdatedAt,
            UpdatedBy = club.UpdatedBy,
            IsDeleted = club.IsDeleted,
            DeletedAt = club.DeletedAt,
            ActiveUserCount = activeUserCount,
            TeamCount = teamCount,
        };
}
