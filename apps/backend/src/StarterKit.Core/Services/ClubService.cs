using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.Clubs.DTOs;
using StarterKit.Core.Common;
using StarterKit.Core.Imaging;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Resources;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;

namespace StarterKit.Core.Services;

public class ClubService : IClubService
{
    private readonly IClubRepository _clubRepository;
    private readonly ISeasonService _seasonService;
    private readonly IBlobStorageService _blobStorageService;
    private readonly ILogger<ClubService> _logger;
    private readonly LogoUploadOptions _logoOptions;

    public ClubService(
        IClubRepository clubRepository,
        ISeasonService seasonService,
        IBlobStorageService blobStorageService,
        IOptions<LogoUploadOptions> logoOptions,
        ILogger<ClubService> logger
    )
    {
        _clubRepository = clubRepository;
        _seasonService = seasonService;
        _blobStorageService = blobStorageService;
        _logoOptions = logoOptions.Value;
        _logger = logger;
    }

    public async Task<PagedResult<ClubListItem>> ListAsync(
        int page,
        int pageSize,
        string? filterText = null,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default
    )
    {
        var (items, totalCount) = await _clubRepository.ListAsync(
            page,
            pageSize,
            filterText,
            sortBy,
            sortDescending,
            cancellationToken
        );
        return new PagedResult<ClubListItem>
        {
            Items = items
                .Select(x => new ClubListItem
                {
                    Club = x.Club,
                    ActiveUserCount = x.ActiveUserCount,
                    TeamCount = x.TeamCount,
                })
                .ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<Club> GetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _clubRepository.GetAsync(id, cancellationToken);
    }

    public async Task<Club?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await _clubRepository.FindByIdAsync(id, cancellationToken);
    }

    public async Task<Club> CreateAsync(
        CreateClubCommand command,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Creating new club: {Name}", command.Name);

        var club = new Club
        {
            Id = Guid.NewGuid(),
            Name = command.Name,
            StreetAddress = command.StreetAddress.Trim(),
            City = command.City.Trim(),
            State = command.State.Trim().ToUpperInvariant(),
            ZipCode = string.IsNullOrWhiteSpace(command.ZipCode) ? null : command.ZipCode.Trim(),
            Timezone = string.IsNullOrWhiteSpace(command.Timezone) ? null : command.Timezone.Trim(),
            MaxAthletes = command.MaxAthletes,
            LogoUrl = command.LogoUrl,
            IsDeleted = false,
        };

        await _clubRepository.AddAsync(club, cancellationToken);

        // Onboarding always defines the club's first season explicitly — no more
        // implicit "current season" auto-creation at club-creation time. Teams are created
        // separately, afterwards, from the standalone Teams page — not as part of onboarding.
        await _seasonService.CreateAsync(
            club.Id,
            command.SeasonName,
            command.SeasonStartDate,
            command.SeasonEndDate,
            cloneTeamsFromSeasonId: null,
            cancellationToken
        );

        return club;
    }

    public async Task<Club> UpdateAsync(
        UpdateClubCommand command,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation("Updating club {ClubId}: {Name}", command.Id, command.Name);

        var club = await _clubRepository.GetAsync(command.Id, cancellationToken);

        club.Name = command.Name;
        club.MaxAthletes = command.MaxAthletes;
        club.LogoUrl = command.LogoUrl;
        club.StreetAddress = command.StreetAddress.Trim();
        club.City = command.City.Trim();
        club.State = command.State.Trim().ToUpperInvariant();
        club.ZipCode = string.IsNullOrWhiteSpace(command.ZipCode) ? null : command.ZipCode.Trim();
        club.Timezone = string.IsNullOrWhiteSpace(command.Timezone)
            ? null
            : command.Timezone.Trim();

        await _clubRepository.UpdateAsync(club, cancellationToken);

        return club;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Deleting club {ClubId}", id);
        await _clubRepository.DeleteAsync(id, cancellationToken);
    }

    public async Task<string> UploadLogoAsync(
        UploadedFile file,
        CancellationToken cancellationToken = default
    )
    {
        FileUploadValidator.Validate(
            file,
            _logoOptions.AllowedContentTypes,
            _logoOptions.MaxFileSizeBytes
        );

        // SVG: validate well-formedness and sanitize XSS vectors
        if (string.Equals(file.ContentType, "image/svg+xml", StringComparison.OrdinalIgnoreCase))
        {
            var doc = SvgSanitizer.ParseAndValidate(file.Content);
            SvgSanitizer.Sanitize(doc);
            // Rewrite the stream with sanitized content
            var sanitizedStream = new MemoryStream();
            doc.Save(sanitizedStream);
            sanitizedStream.Position = 0;
            file = file with { Content = sanitizedStream, ContentLength = sanitizedStream.Length };
        }

        var result = await _blobStorageService.UploadAsync(
            BlobContainerName.ClubLogos,
            file,
            cancellationToken
        );

        _logger.LogInformation("Uploaded club logo blob {BlobPath}", result.StoredPath);

        return result.StoredPath;
    }

    public Task<string?> ResolveLogoSasUrlAsync(
        string? storedPath,
        CancellationToken cancellationToken = default
    ) => _blobStorageService.ResolveStoredPathAsync(storedPath, cancellationToken);

    public async Task<bool> ExistsAsync(Guid clubId, CancellationToken cancellationToken = default)
    {
        var club = await _clubRepository.FindByIdAsync(clubId, cancellationToken);
        return club is not null;
    }
}
