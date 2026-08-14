using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Clubs.DTOs;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Core.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Seasons.Models;

namespace StarterKit.Core.Tests.Clubs.Services;

public abstract class ClubServiceTests
{
    private readonly Mock<IClubRepository> _repositoryMock = new();
    private readonly Mock<ISeasonService> _seasonServiceMock = new();
    private readonly Mock<IBlobStorageService> _blobStorageMock = new();
    protected readonly IClubService Sut;

    protected ClubServiceTests()
    {
        Sut = new ClubService(
            _repositoryMock.Object,
            _seasonServiceMock.Object,
            _blobStorageMock.Object,
            Options.Create(
                new LogoUploadOptions
                {
                    AllowedContentTypes = ["image/svg+xml", "image/png"],
                    MaxFileSizeBytes = 2 * 1024 * 1024,
                }
            ),
            NullLogger<ClubService>.Instance
        );

        // Every CreateAsync test relies on the club's season being created — default it here
        // so individual tests only need to override when they care about the captured args.
        SeasonServiceMock
            .Setup(s =>
                s.CreateAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<string?>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (Guid clubId, string? _, DateOnly _, DateOnly _, Guid? _, CancellationToken _) =>
                    BuildSeason(clubId)
            );
    }

    protected Mock<IClubRepository> RepositoryMock => _repositoryMock;
    protected Mock<ISeasonService> SeasonServiceMock => _seasonServiceMock;

    protected static Season BuildSeason(Guid clubId) =>
        new()
        {
            Id = Guid.NewGuid(),
            ClubId = clubId,
            StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
            EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
            CreatedAt = DateTime.UtcNow,
        };

    protected static Club BuildClub(string? name = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name ?? "Texas Slam",
            StreetAddress = "123 Main St",
            City = "Denver",
            State = "CO",
            ZipCode = "80202",
            CreatedAt = DateTime.UtcNow,
        };

    protected static CreateClubCommand BuildCommand(
        string? name = null,
        DateOnly? seasonStartDate = null,
        DateOnly? seasonEndDate = null,
        string? seasonName = null
    ) =>
        new(
            Name: name ?? "Texas Slam",
            StreetAddress: "123 Main St",
            City: "Denver",
            State: "CO",
            SeasonStartDate: seasonStartDate ?? new DateOnly(2026, 1, 1),
            SeasonEndDate: seasonEndDate ?? new DateOnly(2026, 12, 31),
            SeasonName: seasonName
        );

    public sealed class CreateAsync : ClubServiceTests
    {
        [Fact]
        public async Task CreateAsync_PersistsCoreFields()
        {
            Club? captured = null;
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Club>(), It.IsAny<CancellationToken>()))
                .Callback<Club, CancellationToken>((c, _) => captured = c);

            var command = new CreateClubCommand(
                Name: "Texas Slam",
                StreetAddress: "  123 Main St  ",
                City: " Denver ",
                State: "co",
                SeasonStartDate: new DateOnly(2026, 1, 1),
                SeasonEndDate: new DateOnly(2026, 12, 31),
                ZipCode: " 80202 ",
                Timezone: "America/Denver",
                MaxAthletes: 60
            );

            var result = await Sut.CreateAsync(command);

            captured.Should().NotBeNull();
            captured!.Name.Should().Be("Texas Slam");
            captured.StreetAddress.Should().Be("123 Main St"); // trimmed
            captured.City.Should().Be("Denver"); // trimmed
            captured.State.Should().Be("CO"); // trimmed + uppercased
            captured.ZipCode.Should().Be("80202"); // trimmed
            captured.Timezone.Should().Be("America/Denver");
            captured.MaxAthletes.Should().Be(60);
            result.Should().BeSameAs(captured);
        }

        [Fact]
        public async Task CreateAsync_AlwaysCreatesTheClubsFirstSeason()
        {
            var command = BuildCommand();

            var club = await Sut.CreateAsync(command);

            SeasonServiceMock.Verify(
                s =>
                    s.CreateAsync(
                        club.Id,
                        It.IsAny<string?>(),
                        It.IsAny<DateOnly>(),
                        It.IsAny<DateOnly>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task CreateAsync_PassesSeasonFieldsToSeasonService()
        {
            Guid? capturedClubId = null;
            string? capturedName = null;
            DateOnly capturedStart = default;
            DateOnly capturedEnd = default;

            SeasonServiceMock
                .Setup(s =>
                    s.CreateAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string?>(),
                        It.IsAny<DateOnly>(),
                        It.IsAny<DateOnly>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Callback<Guid, string?, DateOnly, DateOnly, Guid?, CancellationToken>(
                    (clubId, name, start, end, _, _) =>
                    {
                        capturedClubId = clubId;
                        capturedName = name;
                        capturedStart = start;
                        capturedEnd = end;
                    }
                )
                .ReturnsAsync(
                    (
                        Guid clubId,
                        string? _,
                        DateOnly _,
                        DateOnly _,
                        Guid? _,
                        CancellationToken _
                    ) => BuildSeason(clubId)
                );

            var command = BuildCommand(
                seasonStartDate: new DateOnly(2026, 8, 1),
                seasonEndDate: new DateOnly(2027, 5, 31),
                seasonName: "2026 Indoor"
            );

            var club = await Sut.CreateAsync(command);

            capturedClubId.Should().Be(club.Id);
            capturedName.Should().Be("2026 Indoor");
            capturedStart.Should().Be(new DateOnly(2026, 8, 1));
            capturedEnd.Should().Be(new DateOnly(2027, 5, 31));
        }
    }

    public sealed class UpdateAsync : ClubServiceTests
    {
        [Fact]
        public async Task UpdateAsync_UpdatesEditableFields()
        {
            var existing = BuildClub();
            RepositoryMock
                .Setup(r => r.GetAsync(existing.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(existing);

            var command = new UpdateClubCommand(
                Id: existing.Id,
                Name: "Renamed Club",
                StreetAddress: "456 New Ave",
                City: "Austin",
                State: "tx",
                ZipCode: "73301",
                Timezone: "America/Chicago",
                MaxAthletes: 80
            );

            var result = await Sut.UpdateAsync(command);

            result.Name.Should().Be("Renamed Club");
            result.StreetAddress.Should().Be("456 New Ave");
            result.City.Should().Be("Austin");
            result.State.Should().Be("TX");
            result.ZipCode.Should().Be("73301");
            result.Timezone.Should().Be("America/Chicago");
            result.MaxAthletes.Should().Be(80);
            RepositoryMock.Verify(
                r => r.UpdateAsync(existing, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class DeleteAsync : ClubServiceTests
    {
        [Fact]
        public async Task DeleteAsync_DelegatesToRepository()
        {
            var id = Guid.NewGuid();

            await Sut.DeleteAsync(id);

            RepositoryMock.Verify(
                r => r.DeleteAsync(id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class ExistsAsync : ClubServiceTests
    {
        [Fact]
        public async Task ExistsAsync_ReturnsTrue_WhenFound()
        {
            var club = BuildClub();
            RepositoryMock
                .Setup(r => r.FindByIdAsync(club.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(club);

            (await Sut.ExistsAsync(club.Id)).Should().BeTrue();
        }

        [Fact]
        public async Task ExistsAsync_ReturnsFalse_WhenMissing()
        {
            RepositoryMock
                .Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((Club?)null);

            (await Sut.ExistsAsync(Guid.NewGuid())).Should().BeFalse();
        }
    }
}
