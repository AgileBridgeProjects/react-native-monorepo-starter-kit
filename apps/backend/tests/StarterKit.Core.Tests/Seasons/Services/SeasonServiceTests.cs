using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Core.Seasons.Interfaces.Services;
using StarterKit.Core.Seasons.Services;
using StarterKit.Data.Seasons.Interfaces.Repositories;
using StarterKit.Data.Seasons.Models;

namespace StarterKit.Core.Tests.Seasons.Services;

public abstract class SeasonServiceTests
{
    private readonly Mock<ISeasonRepository> _repositoryMock = new();
    private readonly FakeTimeProvider _clock = new(
        new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc)
    );
    protected readonly ISeasonService Sut;

    protected SeasonServiceTests()
    {
        Sut = new SeasonService(_repositoryMock.Object, _clock, Mock.Of<ILogger<SeasonService>>());
    }

    protected Mock<ISeasonRepository> RepositoryMock => _repositoryMock;

    protected static Season BuildSeason(Guid? clubId = null, string? name = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            ClubId = clubId ?? Guid.NewGuid(),
            Name = name,
            StartDate = new DateOnly(2026, 1, 1),
            EndDate = new DateOnly(2026, 12, 31),
        };

    private sealed class FakeTimeProvider(DateTime utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(utcNow, TimeSpan.Zero);
    }

    public sealed class CreateAsync : SeasonServiceTests
    {
        [Fact]
        public async Task CreateAsync_WithValidInput_AddsSeason()
        {
            var clubId = Guid.NewGuid();
            Season? captured = null;
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()))
                .Callback<Season, CancellationToken>((s, _) => captured = s)
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(
                clubId,
                "2026 Indoor",
                new DateOnly(2026, 8, 1),
                new DateOnly(2027, 5, 31)
            );

            captured.Should().NotBeNull();
            captured!.ClubId.Should().Be(clubId);
            captured.Name.Should().Be("2026 Indoor");
            captured.StartDate.Should().Be(new DateOnly(2026, 8, 1));
            captured.EndDate.Should().Be(new DateOnly(2027, 5, 31));
            result.Should().Be(captured);
        }

        [Fact]
        public async Task CreateAsync_WithBlankName_StoresNull()
        {
            Season? captured = null;
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()))
                .Callback<Season, CancellationToken>((s, _) => captured = s)
                .Returns(Task.CompletedTask);

            await Sut.CreateAsync(
                Guid.NewGuid(),
                "   ",
                new DateOnly(2026, 1, 1),
                new DateOnly(2026, 12, 31)
            );

            captured!.Name.Should().BeNull();
        }

        [Fact]
        public async Task CreateAsync_WithCloneTeamsFromSeasonId_DoesNotCopyAnyTeams()
        {
            // The clone flag is accepted for API contract stability but is a deliberate no-op
            // — CreateAsync must not touch any team-related repository.
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var act = async () =>
                await Sut.CreateAsync(
                    Guid.NewGuid(),
                    null,
                    new DateOnly(2026, 1, 1),
                    new DateOnly(2026, 12, 31),
                    cloneTeamsFromSeasonId: Guid.NewGuid()
                );

            await act.Should().NotThrowAsync();
            RepositoryMock.Verify(
                r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class GetOrCreateCurrentAsync : SeasonServiceTests
    {
        [Fact]
        public async Task GetOrCreateCurrentAsync_WhenCurrentSeasonExists_ReturnsIt()
        {
            var clubId = Guid.NewGuid();
            var existing = BuildSeason(clubId);
            RepositoryMock
                .Setup(r =>
                    r.FindCurrentAsync(
                        clubId,
                        new DateOnly(2026, 7, 21),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(existing);

            var result = await Sut.GetOrCreateCurrentAsync(clubId);

            result.Should().Be(existing);
            RepositoryMock.Verify(
                r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }

        [Fact]
        public async Task GetOrCreateCurrentAsync_WhenNoneExists_CreatesDefaultCalendarYearSeason()
        {
            var clubId = Guid.NewGuid();
            RepositoryMock
                .Setup(r =>
                    r.FindCurrentAsync(clubId, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync((Season?)null);

            Season? captured = null;
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Season>(), It.IsAny<CancellationToken>()))
                .Callback<Season, CancellationToken>((s, _) => captured = s)
                .Returns(Task.CompletedTask);

            var result = await Sut.GetOrCreateCurrentAsync(clubId);

            captured.Should().NotBeNull();
            captured!.ClubId.Should().Be(clubId);
            captured.Name.Should().BeNull();
            captured.StartDate.Should().Be(new DateOnly(2026, 1, 1));
            captured.EndDate.Should().Be(new DateOnly(2026, 12, 31));
            result.Should().Be(captured);
        }
    }

    public sealed class GetDisplayLabel : SeasonServiceTests
    {
        [Fact]
        public void GetDisplayLabel_WithName_ReturnsName()
        {
            var season = BuildSeason(name: "2026 Indoor");

            Sut.GetDisplayLabel(season).Should().Be("2026 Indoor");
        }

        [Fact]
        public void GetDisplayLabel_WithoutName_SameYear_DerivesFromDateRange()
        {
            var season = BuildSeason();
            season.StartDate = new DateOnly(2026, 1, 1);
            season.EndDate = new DateOnly(2026, 12, 31);

            Sut.GetDisplayLabel(season).Should().Be("2026 Season");
        }

        [Fact]
        public void GetDisplayLabel_WithoutName_CrossYear_DerivesFromDateRange()
        {
            var season = BuildSeason();
            season.StartDate = new DateOnly(2026, 8, 1);
            season.EndDate = new DateOnly(2027, 5, 31);

            Sut.GetDisplayLabel(season).Should().Be("2026/2027 Season");
        }
    }
}
