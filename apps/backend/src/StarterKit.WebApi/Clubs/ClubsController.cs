using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Clubs.DTOs;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Resources;
using StarterKit.Core.Storage;
using StarterKit.Data.Clubs.Models;
using StarterKit.WebApi.Clubs.DTOs;
using StarterKit.WebApi.Clubs.Interfaces;

namespace StarterKit.WebApi.Clubs;

[ApiController]
[Route("api/clubs")]
[Tags("Clubs")]
[Authorize(Policy = StarterKitPermissions.Clubs.Manage)]
public sealed class ClubsController(
    IClubService clubService,
    IOptionsMonitor<LogoUploadOptions> logoUploadOptions
) : ControllerBase, IClubsController
{
    /// <summary>
    /// Returns a paginated list of all clubs.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ClubListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ClubListResponse>> ListAsync(
        [FromQuery] ClubListQuery query,
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

        return Ok(
            new ClubListResponse
            {
                Items = items,
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single club by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ClubResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ClubResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var club = await clubService.GetAsync(id, cancellationToken);

        return Ok(await ToResponseAsync(club, cancellationToken));
    }

    /// <summary>
    /// Creates a new club.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ClubResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClubResponse>> CreateAsync(
        [FromBody] CreateClubRequest request,
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
        return Created($"/api/clubs/{club.Id}", await ToResponseAsync(club, cancellationToken));
    }

    /// <summary>
    /// Updates an existing club.
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ClubResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ClubResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateClubRequest request,
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
        return Ok(await ToResponseAsync(club, cancellationToken));
    }

    /// <summary>
    /// Soft-deletes an existing club (marks as deleted).
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await clubService.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Uploads a club logo image to blob storage and returns the stored URL. The caller is
    /// expected to send the returned LogoUrl back in the next POST/PUT /api/clubs call.
    /// </summary>
    [HttpPost("images")]
    [EnableRateLimiting(RateLimitPolicies.UploadOrImport)]
    [ProducesResponseType(typeof(UploadClubLogoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<UploadClubLogoResponse>> UploadLogoAsync(
        IFormFile file,
        CancellationToken cancellationToken = default
    )
    {
        // Copy to MemoryStream so it's seekable (needed for validation)
        var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        memoryStream.Position = 0;

        var uploadedFile = new UploadedFile(
            file.FileName,
            file.ContentType,
            memoryStream.Length,
            memoryStream
        );

        var storedPath = await clubService.UploadLogoAsync(uploadedFile, cancellationToken);

        return Ok(new UploadClubLogoResponse { LogoUrl = storedPath });
    }

    /// <summary>
    /// Returns the server-canonical constraints for logo uploads (accepted MIME types,
    /// max file size in bytes). Intentionally public so the form can fetch them before
    /// any auth-gated action, and so the frontend never duplicates these values.
    /// </summary>
    [HttpGet("upload-constraints")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(UploadConstraintsResponse), StatusCodes.Status200OK)]
    public ActionResult<UploadConstraintsResponse> GetUploadConstraints()
    {
        var options = logoUploadOptions.CurrentValue;
        return Ok(
            new UploadConstraintsResponse
            {
                AllowedContentTypes = options.AllowedContentTypes,
                MaxFileSizeBytes = options.MaxFileSizeBytes,
            }
        );
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
