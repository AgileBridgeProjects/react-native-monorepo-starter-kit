using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Services;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

/// <summary>
/// Coach onboarding linked-team reads and logo writes.
/// </summary>
public abstract class LinkedTeamServiceTests
{
    protected readonly Mock<ITeamRepository> TeamRepositoryMock = new();
    protected readonly Mock<IBlobStorageService> BlobServiceMock = new();
    protected readonly UserService Sut;
    protected readonly Guid CoachId = Guid.NewGuid();

    protected LinkedTeamServiceTests()
    {
        Sut = new UserService(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            Mock.Of<IUserRepository>(),
            Mock.Of<IRoleRepository>(),
            Mock.Of<IClubRepository>(),
            TeamRepositoryMock.Object,
            BlobServiceMock.Object,
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            Mock.Of<IUserSetupTokenRepository>(),
            Mock.Of<ISetupEmailService>(),
            Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
            Options.Create(new UserServiceOptions()),
            Mock.Of<IUserBulkUploadExcelParserService>(),
            Mock.Of<IUserExportExcelService>()
        );
    }

    protected static Team BuildTeam(string name = "U14 Texas Slam", string? logoUrl = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            AgeGroup = AgeGroup.U14,
            LogoUrl = logoUrl,
        };

    // ── ListLinkedTeamsAsync ──────────────────────────────────────────────────

    public sealed class ListLinkedTeams : LinkedTeamServiceTests
    {
        [Fact]
        public async Task ListLinkedTeamsAsync_MapsEveryTeamWithResolvedLogoUrl()
        {
            var team = BuildTeam(logoUrl: "club-images/team-a/logo");
            TeamRepositoryMock
                .Setup(r => r.ListTeamsForUserAsync(CoachId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([team]);
            BlobServiceMock
                .Setup(s => s.ResolveStoredPathAsync(team.LogoUrl, It.IsAny<CancellationToken>()))
                .ReturnsAsync("https://blob.example/logo.jpg?sas");

            var result = await Sut.ListLinkedTeamsAsync(CoachId);

            result.Should().HaveCount(1);
            result[0].TeamId.Should().Be(team.Id);
            result[0].Name.Should().Be("U14 Texas Slam");
            result[0].AgeGroup.Should().Be(AgeGroup.U14);
            result[0].LogoUrl.Should().Be("https://blob.example/logo.jpg?sas");
        }

        [Fact]
        public async Task ListLinkedTeamsAsync_WhenTeamHasNoLogo_ReturnsNullLogoUrl()
        {
            var team = BuildTeam();
            TeamRepositoryMock
                .Setup(r => r.ListTeamsForUserAsync(CoachId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([team]);
            BlobServiceMock
                .Setup(s => s.ResolveStoredPathAsync(null, It.IsAny<CancellationToken>()))
                .ReturnsAsync((string?)null);

            var result = await Sut.ListLinkedTeamsAsync(CoachId);

            result[0].LogoUrl.Should().BeNull();
        }

        [Fact]
        public async Task ListLinkedTeamsAsync_WhenCoachHasNoLinkedTeams_ReturnsEmpty()
        {
            TeamRepositoryMock
                .Setup(r => r.ListTeamsForUserAsync(CoachId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);

            var result = await Sut.ListLinkedTeamsAsync(CoachId);

            result.Should().BeEmpty();
        }
    }

    // ── SetLinkedTeamLogoAsync ────────────────────────────────────────────────

    public sealed class SetLinkedTeamLogo : LinkedTeamServiceTests
    {
        [Fact]
        public async Task SetLinkedTeamLogoAsync_WhenTeamIsLinkedToCoach_UpdatesLogoUrl()
        {
            var team = BuildTeam();
            TeamRepositoryMock
                .Setup(r => r.FindLinkedTeamAsync(CoachId, team.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);

            await Sut.SetLinkedTeamLogoAsync(CoachId, team.Id, "club-images/team-a/logo");

            team.LogoUrl.Should().Be("club-images/team-a/logo");
            TeamRepositoryMock.Verify(
                r => r.UpdateAsync(team, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task SetLinkedTeamLogoAsync_WhenTeamIsNotLinkedToCoach_ThrowsAndWritesNothing()
        {
            var teamId = Guid.NewGuid();
            TeamRepositoryMock
                .Setup(r => r.FindLinkedTeamAsync(CoachId, teamId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((Team?)null);

            var act = () => Sut.SetLinkedTeamLogoAsync(CoachId, teamId, "club-images/team-a/logo");

            await act.Should().ThrowAsync<EntityNotFoundException>();
            TeamRepositoryMock.Verify(
                r => r.UpdateAsync(It.IsAny<Team>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }
}
