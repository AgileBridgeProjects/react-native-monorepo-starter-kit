using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Services;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

/// <summary>
/// Parent onboarding linked-athlete reads and relationship writes.
/// </summary>
public abstract class LinkedAthleteServiceTests
{
    protected readonly Mock<IUserRepository> UserRepositoryMock = new();
    protected readonly Mock<IBlobStorageService> BlobServiceMock = new();
    protected readonly UserService Sut;
    protected readonly Guid GuardianId = Guid.NewGuid();

    protected LinkedAthleteServiceTests()
    {
        Sut = new UserService(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            UserRepositoryMock.Object,
            Mock.Of<IRoleRepository>(),
            Mock.Of<IClubRepository>(),
            Mock.Of<ITeamRepository>(),
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

    protected static UserGuardianEntity Link(
        Guid guardianId,
        UserEntity dependent,
        GuardianRelationship? relationship = null
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            GuardianId = guardianId,
            DependentId = dependent.Id,
            Dependent = dependent,
            Relationship = relationship,
        };

    // ── ListLinkedAthletesAsync ───────────────────────────────────────────────

    public sealed class ListLinkedAthletes : LinkedAthleteServiceTests
    {
        [Fact]
        public async Task ListLinkedAthletesAsync_MapsEveryLinkWithResolvedPhotoUrl()
        {
            var athlete = new UserEntity
            {
                Id = Guid.NewGuid(),
                DisplayName = "Julia Smith",
                Position = PlayingPosition.MiddleBlocker,
                JerseyNumber = 10,
                FacePhotoUrl = "user-avatars/julia/face-photo",
                UserTeams =
                [
                    new UserTeam
                    {
                        Team = new Team { Id = Guid.NewGuid(), Name = "U14 Texas Slam" },
                    },
                ],
            };
            UserRepositoryMock
                .Setup(r =>
                    r.ListGuardianLinksWithDependentsAsync(
                        GuardianId,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([Link(GuardianId, athlete, GuardianRelationship.Mother)]);
            BlobServiceMock
                .Setup(s =>
                    s.ResolveStoredPathAsync(athlete.FacePhotoUrl, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync("https://blob.example/face.jpg?sas");

            var result = await Sut.ListLinkedAthletesAsync(GuardianId);

            result.Should().HaveCount(1);
            result[0].AthleteUserId.Should().Be(athlete.Id);
            result[0].DisplayName.Should().Be("Julia Smith");
            result[0].TeamName.Should().Be("U14 Texas Slam");
            result[0].Position.Should().Be(PlayingPosition.MiddleBlocker);
            result[0].JerseyNumber.Should().Be(10);
            result[0].PhotoUrl.Should().Be("https://blob.example/face.jpg?sas");
            result[0].Relationship.Should().Be(GuardianRelationship.Mother);
        }

        [Fact]
        public async Task ListLinkedAthletesAsync_WhenAthleteHasNoFacePhoto_FallsBackToAvatar()
        {
            var athlete = new UserEntity
            {
                Id = Guid.NewGuid(),
                DisplayName = "No Portrait",
                AvatarUrl = "user-avatars/no-portrait/avatar",
            };
            UserRepositoryMock
                .Setup(r =>
                    r.ListGuardianLinksWithDependentsAsync(
                        GuardianId,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([Link(GuardianId, athlete)]);
            BlobServiceMock
                .Setup(s =>
                    s.ResolveStoredPathAsync(athlete.AvatarUrl, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync("https://blob.example/avatar.jpg?sas");

            var result = await Sut.ListLinkedAthletesAsync(GuardianId);

            result[0].PhotoUrl.Should().Be("https://blob.example/avatar.jpg?sas");
            result[0].Relationship.Should().BeNull();
        }

        [Fact]
        public async Task ListLinkedAthletesAsync_WhenAthleteHasNeitherPhoto_ReturnsNullPhotoUrl()
        {
            var athlete = new UserEntity { Id = Guid.NewGuid(), DisplayName = "Bare Row" };
            UserRepositoryMock
                .Setup(r =>
                    r.ListGuardianLinksWithDependentsAsync(
                        GuardianId,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([Link(GuardianId, athlete)]);
            BlobServiceMock
                .Setup(s => s.ResolveStoredPathAsync(null, It.IsAny<CancellationToken>()))
                .ReturnsAsync((string?)null);

            var result = await Sut.ListLinkedAthletesAsync(GuardianId);

            result[0].PhotoUrl.Should().BeNull();
            result[0].TeamName.Should().BeNull();
        }

        [Fact]
        public async Task ListLinkedAthletesAsync_WhenParentHasNoLinks_ReturnsEmpty()
        {
            UserRepositoryMock
                .Setup(r =>
                    r.ListGuardianLinksWithDependentsAsync(
                        GuardianId,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);

            var result = await Sut.ListLinkedAthletesAsync(GuardianId);

            result.Should().BeEmpty();
        }
    }

    // ── SetGuardianRelationshipsAsync ─────────────────────────────────────────

    public sealed class SetGuardianRelationships : LinkedAthleteServiceTests
    {
        private SetGuardianRelationshipsCommand Command(
            params GuardianRelationshipAssignment[] assignments
        ) => new() { GuardianUserId = GuardianId, Relationships = assignments };

        [Fact]
        public async Task SetGuardianRelationshipsAsync_WithLinkedAthletes_WritesEveryAssignment()
        {
            var firstAthleteId = Guid.NewGuid();
            var secondAthleteId = Guid.NewGuid();
            UserRepositoryMock
                .Setup(r =>
                    r.ListDependentIdsForGuardianAsync(GuardianId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync([firstAthleteId, secondAthleteId]);

            await Sut.SetGuardianRelationshipsAsync(
                Command(
                    new GuardianRelationshipAssignment(firstAthleteId, GuardianRelationship.Mother),
                    new GuardianRelationshipAssignment(
                        secondAthleteId,
                        GuardianRelationship.Guardian
                    )
                )
            );

            UserRepositoryMock.Verify(
                r =>
                    r.SetGuardianRelationshipsAsync(
                        GuardianId,
                        It.Is<IReadOnlyDictionary<Guid, GuardianRelationship>>(d =>
                            d.Count == 2
                            && d[firstAthleteId] == GuardianRelationship.Mother
                            && d[secondAthleteId] == GuardianRelationship.Guardian
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task SetGuardianRelationshipsAsync_WhenListIsEmpty_ThrowsAndWritesNothing()
        {
            var act = () => Sut.SetGuardianRelationshipsAsync(Command());

            await act.Should().ThrowAsync<ArgumentException>();
            UserRepositoryMock.Verify(
                r =>
                    r.SetGuardianRelationshipsAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<IReadOnlyDictionary<Guid, GuardianRelationship>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task SetGuardianRelationshipsAsync_WhenAthleteAppearsTwice_Throws()
        {
            var athleteId = Guid.NewGuid();

            var act = () =>
                Sut.SetGuardianRelationshipsAsync(
                    Command(
                        new GuardianRelationshipAssignment(athleteId, GuardianRelationship.Mother),
                        new GuardianRelationshipAssignment(athleteId, GuardianRelationship.Father)
                    )
                );

            await act.Should().ThrowAsync<ArgumentException>();
            UserRepositoryMock.Verify(
                r =>
                    r.SetGuardianRelationshipsAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<IReadOnlyDictionary<Guid, GuardianRelationship>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task SetGuardianRelationshipsAsync_WhenAthleteIsNotLinkedToThisParent_Throws()
        {
            var linkedAthleteId = Guid.NewGuid();
            var someoneElsesAthleteId = Guid.NewGuid();
            UserRepositoryMock
                .Setup(r =>
                    r.ListDependentIdsForGuardianAsync(GuardianId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync([linkedAthleteId]);

            var act = () =>
                Sut.SetGuardianRelationshipsAsync(
                    Command(
                        new GuardianRelationshipAssignment(
                            someoneElsesAthleteId,
                            GuardianRelationship.Other
                        )
                    )
                );

            await act.Should().ThrowAsync<ArgumentException>();
            UserRepositoryMock.Verify(
                r =>
                    r.SetGuardianRelationshipsAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<IReadOnlyDictionary<Guid, GuardianRelationship>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }
}
