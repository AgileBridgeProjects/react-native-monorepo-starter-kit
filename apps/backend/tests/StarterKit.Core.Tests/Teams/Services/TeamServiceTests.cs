using Bogus;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Teams;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.Core.Teams.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;

namespace StarterKit.Core.Tests.Teams.Services;

public abstract class TeamServiceTests
{
    private readonly Mock<ITeamRepository> _repositoryMock = new();
    private readonly Mock<IBlobStorageService> _blobStorageMock = new();
    protected readonly ITeamService Sut;
    protected static readonly Faker Faker = new();

    protected TeamServiceTests()
    {
        Sut = new TeamService(
            _repositoryMock.Object,
            _blobStorageMock.Object,
            Mock.Of<ILogger<TeamService>>()
        );
    }

    protected Team BuildTeam() =>
        new()
        {
            Id = Guid.NewGuid(),
            SeasonId = Guid.NewGuid(),
            Name = Faker.Commerce.Department(),
        };

    protected Mock<ITeamRepository> RepositoryMock => _repositoryMock;
    protected Mock<IBlobStorageService> BlobStorageMock => _blobStorageMock;

    public sealed class ResolveLogoSasUrlAsync : TeamServiceTests
    {
        [Fact]
        public async Task ResolvesStoredPathToSasUrl_ViaBlobStorage()
        {
            BlobStorageMock
                .Setup(b =>
                    b.ResolveStoredPathAsync("club-images/logo.png", It.IsAny<CancellationToken>())
                )
                .ReturnsAsync("https://blob.test/club-images/logo.png?sig=abc");

            var result = await Sut.ResolveLogoSasUrlAsync("club-images/logo.png");

            result.Should().Be("https://blob.test/club-images/logo.png?sig=abc");
        }
    }

    public sealed class ListAsync : TeamServiceTests
    {
        [Fact]
        public async Task ListAsync_WithQuery_ReturnsPagedResult()
        {
            var clubId = Guid.NewGuid();
            var teams = new[] { BuildTeam(), BuildTeam() };
            var items = teams.Select(d => new TeamListItem(d, 0)).ToArray();
            var query = new TeamListQuery
            {
                ClubId = clubId,
                Page = 2,
                PageSize = 1,
                FilterText = "ops",
            };

            RepositoryMock
                .Setup(r => r.ListAsync(2, 1, clubId, null, "ops", It.IsAny<CancellationToken>()))
                .ReturnsAsync(((IReadOnlyList<TeamListItem>)items, 2));

            var result = await Sut.ListAsync(query, CancellationToken.None);

            result.Items.Should().BeEquivalentTo(items);
            result.TotalCount.Should().Be(2);
            result.Page.Should().Be(2);
            result.PageSize.Should().Be(1);
        }

        [Fact]
        public async Task ListAsync_WithOutOfRangePaging_UsesClampedValues()
        {
            var query = new TeamListQuery { Page = -1, PageSize = 999 };

            RepositoryMock
                .Setup(r => r.ListAsync(1, 250, null, null, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(((IReadOnlyList<TeamListItem>)Array.Empty<TeamListItem>(), 0));

            var result = await Sut.ListAsync(query, CancellationToken.None);

            result.Page.Should().Be(1);
            result.PageSize.Should().Be(250);
        }
    }

    public sealed class GetAsync : TeamServiceTests
    {
        [Fact]
        public async Task GetAsync_WhenExists_ReturnsTeam()
        {
            var team = BuildTeam();
            RepositoryMock
                .Setup(r => r.GetAsync(team.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);

            var result = await Sut.GetAsync(team.Id, CancellationToken.None);

            result.Should().Be(team);
        }

        [Fact]
        public async Task GetAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.GetAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () => await Sut.GetAsync(id, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }

    public sealed class FindByIdAsync : TeamServiceTests
    {
        [Fact]
        public async Task FindByIdAsync_WhenExists_ReturnsTeam()
        {
            var team = BuildTeam();
            RepositoryMock
                .Setup(r => r.FindByIdAsync(team.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);

            var result = await Sut.FindByIdAsync(team.Id, CancellationToken.None);

            result.Should().Be(team);
        }

        [Fact]
        public async Task FindByIdAsync_WhenNotFound_ReturnsNull()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.FindByIdAsync(id, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Team?)null);

            var result = await Sut.FindByIdAsync(id, CancellationToken.None);

            result.Should().BeNull();
        }
    }

    public sealed class CreateAsync : TeamServiceTests
    {
        [Fact]
        public async Task CreateAsync_WithValidInput_AddsTeam()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Commerce.Department();
            Team? captured = null;

            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(seasonId, name, It.IsAny<CancellationToken>(), null)
                )
                .ReturnsAsync((Team?)null);
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()))
                .Callback<Team, CancellationToken>((team, _) => captured = team)
                .Returns(Task.CompletedTask);

            var result = await Sut.CreateAsync(seasonId, name, null);

            captured.Should().NotBeNull();
            captured!.SeasonId.Should().Be(seasonId);
            captured.Name.Should().Be(name);
            result.Should().Be(captured);
            result.Id.Should().NotBeEmpty();
        }

        [Fact]
        public async Task CreateAsync_WithDescription_SetsTeamDescription()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Commerce.Department();
            var description = Faker.Lorem.Sentence();
            Team? captured = null;

            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(seasonId, name, It.IsAny<CancellationToken>(), null)
                )
                .ReturnsAsync((Team?)null);
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()))
                .Callback<Team, CancellationToken>((team, _) => captured = team)
                .Returns(Task.CompletedTask);

            await Sut.CreateAsync(seasonId, name, description);

            captured!.Description.Should().Be(description);
        }

        [Fact]
        public async Task CreateAsync_WithAgeGroup_SetsTeamAgeGroup()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Commerce.Department();
            const AgeGroup ageGroup = AgeGroup.U14;
            Team? captured = null;

            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(seasonId, name, It.IsAny<CancellationToken>(), null)
                )
                .ReturnsAsync((Team?)null);
            RepositoryMock
                .Setup(r => r.AddAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()))
                .Callback<Team, CancellationToken>((team, _) => captured = team)
                .Returns(Task.CompletedTask);

            await Sut.CreateAsync(seasonId, name, ageGroup: ageGroup);

            captured!.AgeGroup.Should().Be(ageGroup);
        }

        [Fact]
        public async Task CreateAsync_WhenNameAlreadyExistsInSeason_ThrowsConflictException()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Commerce.Department();
            var existing = BuildTeam();

            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(seasonId, name, It.IsAny<CancellationToken>(), null)
                )
                .ReturnsAsync(existing);

            var act = async () => await Sut.CreateAsync(seasonId, name, null);

            await act.Should().ThrowAsync<ConflictException>();
            RepositoryMock.Verify(
                r => r.AddAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class UpdateAsync : TeamServiceTests
    {
        [Fact]
        public async Task UpdateAsync_WhenExists_UpdatesTeamName()
        {
            var team = BuildTeam();
            var updatedName = Faker.Commerce.Department();

            RepositoryMock
                .Setup(r => r.GetAsync(team.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);
            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(
                        team.SeasonId,
                        updatedName,
                        It.IsAny<CancellationToken>(),
                        team.Id
                    )
                )
                .ReturnsAsync((Team?)null);
            RepositoryMock
                .Setup(r => r.UpdateAsync(team, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await Sut.UpdateAsync(team.Id, updatedName, null);

            result.Name.Should().Be(updatedName);
            RepositoryMock.Verify(
                r => r.UpdateAsync(team, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task UpdateAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.GetAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () => await Sut.UpdateAsync(id, Faker.Commerce.Department(), null);

            await act.Should().ThrowAsync<InvalidOperationException>();
            RepositoryMock.Verify(
                r => r.UpdateAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }

        [Fact]
        public async Task UpdateAsync_WhenNameAlreadyExistsInSeason_ThrowsConflictException()
        {
            var team = BuildTeam();
            var conflictingName = Faker.Commerce.Department();
            var existingOther = BuildTeam();
            existingOther.SeasonId = team.SeasonId;
            existingOther.Name = conflictingName;

            RepositoryMock
                .Setup(r => r.GetAsync(team.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);
            RepositoryMock
                .Setup(r =>
                    r.FindByNameInSeasonAsync(
                        team.SeasonId,
                        conflictingName,
                        It.IsAny<CancellationToken>(),
                        team.Id
                    )
                )
                .ReturnsAsync(existingOther);

            var act = async () => await Sut.UpdateAsync(team.Id, conflictingName, null);

            await act.Should().ThrowAsync<ConflictException>();
            RepositoryMock.Verify(
                r => r.UpdateAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class DeleteAsync : TeamServiceTests
    {
        [Fact]
        public async Task DeleteAsync_WithId_DeletesTeam()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.DeleteAsync(id, CancellationToken.None);

            RepositoryMock.Verify(
                r => r.DeleteAsync(id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task DeleteAsync_WhenNotFound_PropagatesInvalidOperationException()
        {
            var id = Guid.NewGuid();
            RepositoryMock
                .Setup(r => r.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException());

            var act = async () => await Sut.DeleteAsync(id, CancellationToken.None);

            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }
}
