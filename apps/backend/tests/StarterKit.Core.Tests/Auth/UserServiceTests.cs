using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Enums;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Services;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Repositories;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Teams.Repositories;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Interfaces.Repositories;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Core.Tests.Auth;

public abstract class UserServiceTests
{
    private static readonly Guid ClubId = Guid.NewGuid();
    private const string ExternalAuthId = "firebase-uid-123";
    private const string Email = "test@example.com";
    private const string DisplayName = "Test User";

    protected readonly AppDbContext Context;
    protected readonly UserService Sut;
    protected readonly Mock<IClubRepository> ClubRepositoryMock = new();

    protected UserServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Context = new AppDbContext(options);
        Sut = new UserService(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            new UserRepository(Context, TimeProvider.System),
            new RoleRepository(Context),
            ClubRepositoryMock.Object,
            new TeamRepository(Context),
            Mock.Of<StarterKit.Core.Storage.Interfaces.IBlobStorageService>(),
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            CreateSetupTokenRepoMock(),
            Mock.Of<ISetupEmailService>(),
            Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
            Options.Create(new StarterKit.Core.Configuration.UserServiceOptions()),
            Mock.Of<IUserBulkUploadExcelParserService>(),
            Mock.Of<IUserExportExcelService>()
        );
    }

    private static IUserSetupTokenRepository CreateSetupTokenRepoMock()
    {
        var mock = new Mock<IUserSetupTokenRepository>();
        mock.Setup(r =>
                r.GetSetupStatusBulkAsync(
                    It.IsAny<IReadOnlyCollection<Guid>>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new Dictionary<Guid, bool>());
        return mock.Object;
    }

    protected async Task SeedAthleteRole()
    {
        Context.Roles.Add(
            new RoleEntity
            {
                Id = Guid.NewGuid(),
                Name = "Athlete",
                IsDefault = true,
            }
        );
        await Context.SaveChangesAsync();
    }

    protected async Task<UserEntity> SeedUser(
        string externalAuthId = ExternalAuthId,
        Guid? clubId = null
    )
    {
        var entity = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = externalAuthId,
            ClubId = clubId ?? ClubId,
            Email = Email,
            DisplayName = DisplayName,
            CreatedAt = DateTime.UtcNow,
        };
        Context.Users.Add(entity);
        await Context.SaveChangesAsync();
        return entity;
    }

    public sealed class GetOrCreateAsync_WhenUserExists : UserServiceTests
    {
        [Fact]
        public async Task ReturnsExistingUser()
        {
            var existing = await SeedUser();

            var result = await Sut.GetOrCreateAsync(ExternalAuthId, Email, DisplayName, ClubId);

            result.Id.Should().Be(existing.Id);
            result.Email.Should().Be(Email);
        }
    }

    public sealed class GetOrCreateAsync_WhenNoDefaultRoleExists : UserServiceTests
    {
        [Fact]
        public async Task SkipsRoleAssignment_WhenNoDefaultRole()
        {
            // Do not seed any role — FindDefaultRoleAsync will return null
            var result = await Sut.GetOrCreateAsync(ExternalAuthId, Email, DisplayName, ClubId);

            var assignments = await Context
                .UserRoleAssignments.Where(ura => ura.UserId == result.Id)
                .ToListAsync();

            assignments.Should().BeEmpty();
        }
    }

    public sealed class GetOrCreateAsync_WhenUserDoesNotExist : UserServiceTests
    {
        [Fact]
        public async Task CreatesNewUser()
        {
            await SeedAthleteRole();

            var result = await Sut.GetOrCreateAsync(ExternalAuthId, Email, DisplayName, ClubId);

            result.Email.Should().Be(Email);
            result.ExternalAuthId.Should().Be(ExternalAuthId);
            result.ClubId.Should().Be(ClubId);
        }

        [Fact]
        public async Task AssignsDefaultAthleteRole()
        {
            await SeedAthleteRole();

            var result = await Sut.GetOrCreateAsync(ExternalAuthId, Email, DisplayName, ClubId);

            var assignments = await Context
                .UserRoleAssignments.Where(ura => ura.UserId == result.Id)
                .Include(ura => ura.Role)
                .ToListAsync();

            assignments.Should().ContainSingle().Which.Role.Name.Should().Be("Athlete");
        }
    }

    public sealed class GetByIdAsync : UserServiceTests
    {
        [Fact]
        public async Task ReturnsUser_WhenExists()
        {
            var existing = await SeedUser();

            var result = await Sut.GetByIdAsync(existing.Id);

            result.Should().NotBeNull();
            result!.Id.Should().Be(existing.Id);
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenNotFound()
        {
            var act = () => Sut.GetByIdAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    public sealed class GetByExternalAuthIdAsync : UserServiceTests
    {
        [Fact]
        public async Task ReturnsUser_WhenExists()
        {
            var existing = await SeedUser();

            var result = await Sut.GetByExternalAuthIdAsync(existing.ExternalAuthId);

            result.Should().NotBeNull();
            result!.Id.Should().Be(existing.Id);
        }

        [Fact]
        public async Task ReturnsNull_WhenNotFound()
        {
            var result = await Sut.GetByExternalAuthIdAsync("missing-auth-id");

            result.Should().BeNull();
        }
    }

    public sealed class AssignRoleAsync : UserServiceTests
    {
        [Fact]
        public async Task AssignsRole_WhenRoleExists()
        {
            var user = await SeedUser();
            await SeedAthleteRole();
            var adminRole = new RoleEntity { Id = Guid.NewGuid(), Name = "TenantAdmin" };
            Context.Roles.Add(adminRole);
            await Context.SaveChangesAsync();

            await Sut.AssignRoleAsync(user.Id, "TenantAdmin");

            var assignment = await Context.UserRoleAssignments.FirstOrDefaultAsync(ura =>
                ura.UserId == user.Id && ura.RoleId == adminRole.Id
            );
            assignment.Should().NotBeNull();
        }

        [Fact]
        public async Task ThrowsArgument_WhenRoleDoesNotExist()
        {
            var user = await SeedUser();

            var act = () => Sut.AssignRoleAsync(user.Id, "NonExistentRole");

            await act.Should().ThrowAsync<ArgumentException>().WithMessage("*NonExistentRole*");
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            await SeedAthleteRole();
            var missingUserId = Guid.NewGuid();

            var act = () => Sut.AssignRoleAsync(missingUserId, "Athlete");

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task DoesNotDuplicate_WhenAlreadyAssigned()
        {
            var user = await SeedUser();
            await SeedAthleteRole();
            var role = await Context.Roles.FirstAsync();

            // Assign once
            await Sut.AssignRoleAsync(user.Id, "Athlete");
            // Assign again — should not throw or duplicate
            await Sut.AssignRoleAsync(user.Id, "Athlete");

            var count = await Context.UserRoleAssignments.CountAsync(ura =>
                ura.UserId == user.Id && ura.RoleId == role.Id
            );
            count.Should().Be(1);
        }
    }

    public sealed class UpdateLastLoginAsync : IDisposable
    {
        private readonly Mock<IUserRepository> _userRepoMock = new();
        private readonly UserService _sut;

        public UpdateLastLoginAsync()
        {
            _sut = new UserService(
                Mock.Of<IAuthClaimsService>(),
                Mock.Of<IAuthUserProvisioningService>(),
                TimeProvider.System,
                Mock.Of<ILogger<UserService>>(),
                _userRepoMock.Object,
                Mock.Of<IRoleRepository>(),
                Mock.Of<IClubRepository>(),
                Mock.Of<ITeamRepository>(),
                Mock.Of<StarterKit.Core.Storage.Interfaces.IBlobStorageService>(),
                Mock.Of<System.Net.Http.IHttpClientFactory>(),
                Mock.Of<IUserSetupTokenRepository>(),
                Mock.Of<ISetupEmailService>(),
                Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
                Options.Create(new StarterKit.Core.Configuration.UserServiceOptions()),
                Mock.Of<IUserBulkUploadExcelParserService>(),
                Mock.Of<IUserExportExcelService>()
            );
        }

        [Fact]
        public async Task DelegatesToRepository()
        {
            var userId = Guid.NewGuid();

            await _sut.UpdateLastLoginAsync(userId);

            _userRepoMock.Verify(
                r => r.UpdateLastLoginAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task DoesNotThrow_WhenUserNotFound()
        {
            // Repository silently does nothing for unknown users (no rows matched).
            _userRepoMock
                .Setup(r => r.UpdateLastLoginAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var act = () => _sut.UpdateLastLoginAsync(Guid.NewGuid());

            await act.Should().NotThrowAsync();
        }

        public void Dispose()
        {
            // No resources to dispose; satisfies xUnit fixture pattern.
        }
    }

    public sealed class ListAsync_TeamIdFilter : UserServiceTests
    {
        [Fact]
        public async Task ReturnsOnlyUsersInTeam()
        {
            var teamId = Guid.NewGuid();
            var userA = Guid.NewGuid();
            var userB = Guid.NewGuid();

            Context.Users.AddRange(
                new UserEntity
                {
                    Id = userA,
                    ExternalAuthId = "ext-1",
                    ClubId = ClubId,
                    Email = "a@test.com",
                    DisplayName = "A",
                    CreatedAt = DateTime.UtcNow,
                },
                new UserEntity
                {
                    Id = userB,
                    ExternalAuthId = "ext-2",
                    ClubId = ClubId,
                    Email = "b@test.com",
                    DisplayName = "B",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            Context.UserTeams.AddRange(
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = userA,
                    TeamId = teamId,
                },
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = userB,
                    TeamId = Guid.NewGuid(),
                }
            );
            await Context.SaveChangesAsync();

            var result = await Sut.ListAsync(
                new UserQuery { TeamId = teamId },
                CancellationToken.None
            );

            result.Items.Should().HaveCount(1);
            result.Items[0].Email.Should().Be("a@test.com");
        }

        [Fact]
        public async Task WhenNoTeamIdFilter_ReturnsAllUsers()
        {
            var userD = Guid.NewGuid();

            Context.Users.AddRange(
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ExternalAuthId = "ext-3",
                    ClubId = ClubId,
                    Email = "c@test.com",
                    DisplayName = "C",
                    CreatedAt = DateTime.UtcNow,
                },
                new UserEntity
                {
                    Id = userD,
                    ExternalAuthId = "ext-4",
                    ClubId = ClubId,
                    Email = "d@test.com",
                    DisplayName = "D",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            Context.UserTeams.Add(
                new UserTeam
                {
                    Id = Guid.NewGuid(),
                    UserId = userD,
                    TeamId = Guid.NewGuid(),
                }
            );
            await Context.SaveChangesAsync();

            var result = await Sut.ListAsync(new UserQuery(), CancellationToken.None);

            result.Items.Should().HaveCount(2);
        }
    }

    public sealed class SetActiveAsync : UserServiceTests
    {
        [Fact]
        public async Task SetsIsActive_False_WhenSuspending()
        {
            var user = await SeedUser();

            await Sut.SetActiveAsync(user.Id, isActive: false);

            var updated = await Context.Users.FindAsync(user.Id);
            updated!.IsActive.Should().BeFalse();
        }

        [Fact]
        public async Task SetsIsActive_True_WhenReactivating()
        {
            var user = await SeedUser();
            user.IsActive = false;
            await Context.SaveChangesAsync();

            await Sut.SetActiveAsync(user.Id, isActive: true);

            var updated = await Context.Users.FindAsync(user.Id);
            updated!.IsActive.Should().BeTrue();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            var act = () => Sut.SetActiveAsync(Guid.NewGuid(), isActive: false);

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    // Uses a mocked IUserRepository (rather than the shared InMemory-backed Sut) because
    // UpdateAthleteOnboardingProfileAsync uses ExecuteUpdateAsync, which the EF Core InMemory
    // provider does not support — verify the repository call contract instead.
    public sealed class UpdateProfileAsync_AthleteFields
    {
        private readonly Mock<IUserRepository> _userRepoMock = new();
        private readonly UserService _sut;
        private static readonly Guid TestUserId = Guid.NewGuid();

        public UpdateProfileAsync_AthleteFields()
        {
            _sut = new UserService(
                Mock.Of<IAuthClaimsService>(),
                Mock.Of<IAuthUserProvisioningService>(),
                TimeProvider.System,
                Mock.Of<ILogger<UserService>>(),
                _userRepoMock.Object,
                Mock.Of<IRoleRepository>(),
                Mock.Of<IClubRepository>(),
                Mock.Of<ITeamRepository>(),
                Mock.Of<StarterKit.Core.Storage.Interfaces.IBlobStorageService>(),
                Mock.Of<System.Net.Http.IHttpClientFactory>(),
                Mock.Of<IUserSetupTokenRepository>(),
                Mock.Of<ISetupEmailService>(),
                Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
                Options.Create(new StarterKit.Core.Configuration.UserServiceOptions()),
                Mock.Of<IUserBulkUploadExcelParserService>(),
                Mock.Of<IUserExportExcelService>()
            );
        }

        [Fact]
        public async Task UpdatesPositionAndJerseyNumber()
        {
            await _sut.UpdateProfileAsync(
                new UpdateProfileCommand
                {
                    UserId = TestUserId,
                    Position = PlayingPosition.OutsideHitter,
                    JerseyNumber = 12,
                }
            );

            _userRepoMock.Verify(
                r =>
                    r.UpdateAthleteOnboardingProfileAsync(
                        TestUserId,
                        PlayingPosition.OutsideHitter,
                        12,
                        null,
                        false,
                        null,
                        false,
                        false,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenJerseyNumberIsOutOfRange()
        {
            // MCP tool calls bypass the DTO's [Range] attribute (only enforced through
            // controller model validation), so the service itself must guard this.
            var act = () =>
                _sut.UpdateProfileAsync(
                    new UpdateProfileCommand { UserId = TestUserId, JerseyNumber = 100 }
                );

            await act.Should().ThrowAsync<ArgumentException>().WithParameterName("JerseyNumber");
        }

        [Fact]
        public async Task SetsOnboardingPhotos()
        {
            await _sut.UpdateProfileAsync(
                new UpdateProfileCommand
                {
                    UserId = TestUserId,
                    FullBodyPhotoBlobPath = "user-avatars/full-body-photo",
                    FacePhotoBlobPath = "user-avatars/face-photo",
                }
            );

            _userRepoMock.Verify(
                r =>
                    r.UpdateAthleteOnboardingProfileAsync(
                        TestUserId,
                        null,
                        null,
                        "user-avatars/full-body-photo",
                        false,
                        "user-avatars/face-photo",
                        false,
                        false,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task RemovesOnboardingPhotos_WhenRemoveFlagsSet()
        {
            await _sut.UpdateProfileAsync(
                new UpdateProfileCommand
                {
                    UserId = TestUserId,
                    RemoveFullBodyPhoto = true,
                    RemoveFacePhoto = true,
                }
            );

            _userRepoMock.Verify(
                r =>
                    r.UpdateAthleteOnboardingProfileAsync(
                        TestUserId,
                        null,
                        null,
                        null,
                        true,
                        null,
                        true,
                        false,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task SetsOnboardingCompletedAt_WhenCompleteOnboardingTrue()
        {
            await _sut.UpdateProfileAsync(
                new UpdateProfileCommand { UserId = TestUserId, CompleteOnboarding = true }
            );

            _userRepoMock.Verify(
                r =>
                    r.UpdateAthleteOnboardingProfileAsync(
                        TestUserId,
                        null,
                        null,
                        null,
                        false,
                        null,
                        false,
                        true,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task DoesNotCallAthleteFieldsUpdate_WhenCommandLeavesThemAllUnset()
        {
            await _sut.UpdateProfileAsync(
                new UpdateProfileCommand { UserId = TestUserId, DisplayName = "New Name" }
            );

            _userRepoMock.Verify(
                r =>
                    r.UpdateAthleteOnboardingProfileAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<PlayingPosition?>(),
                        It.IsAny<int?>(),
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }

    public sealed class LinkToClubAsync : UserServiceTests
    {
        private static readonly Guid TestClubId = Guid.NewGuid();

        private void SetupClubExists() =>
            ClubRepositoryMock
                .Setup(r => r.GetAsync(TestClubId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new StarterKit.Data.Clubs.Models.Club { Id = TestClubId, Name = "Test Co" }
                );

        private void SetupClubNotFound() =>
            ClubRepositoryMock
                .Setup(r => r.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("Club", Guid.NewGuid()));

        [Fact]
        public async Task AssignsRoleAndReturnsUser_WhenUserAndClubExist()
        {
            // Seed the user directly in TestClubId so the link flow finds the existing
            // record and returns it (no sibling created, same Id preserved).
            var user = await SeedUser(clubId: TestClubId);
            await SeedAthleteRole();
            var role = await Context.Roles.FirstAsync();
            SetupClubExists();

            var result = await Sut.LinkToClubAsync(user.Id, TestClubId, "Athlete");

            result.Id.Should().Be(user.Id);
            var assignment = await Context.UserRoleAssignments.FirstOrDefaultAsync(ura =>
                ura.UserId == user.Id && ura.RoleId == role.Id
            );
            assignment.Should().NotBeNull();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            await SeedAthleteRole();
            SetupClubExists();

            var act = () => Sut.LinkToClubAsync(Guid.NewGuid(), TestClubId, "Athlete");

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenClubDoesNotExist()
        {
            var user = await SeedUser();
            await SeedAthleteRole();
            SetupClubNotFound();

            var act = () => Sut.LinkToClubAsync(user.Id, Guid.NewGuid(), "Athlete");

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task CreatesSiblingRecord_WhenSourceUserInDifferentClub()
        {
            var sourceClubId = Guid.NewGuid();
            var sourceUser = await SeedUser(clubId: sourceClubId);
            await SeedAthleteRole();
            SetupClubExists();

            var result = await Sut.LinkToClubAsync(sourceUser.Id, TestClubId, "Athlete");

            // A new sibling record should have been created in the target club
            result.ClubId.Should().Be(TestClubId);
            result.Email.Should().Be(sourceUser.Email);
            result.Id.Should().NotBe(sourceUser.Id);
        }

        [Fact]
        public async Task DoesNotDuplicate_WhenSiblingAlreadyExists()
        {
            var sourceClubId = Guid.NewGuid();
            var sourceUser = await SeedUser(clubId: sourceClubId);
            await SeedAthleteRole();
            SetupClubExists();

            // First link — creates sibling
            await Sut.LinkToClubAsync(sourceUser.Id, TestClubId, "Athlete");
            var countBefore = Context.Users.Count(u => u.ClubId == TestClubId);

            // Second link — should be idempotent
            await Sut.LinkToClubAsync(sourceUser.Id, TestClubId, "Athlete");
            var countAfter = Context.Users.Count(u => u.ClubId == TestClubId);

            countAfter.Should().Be(countBefore);
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenSourceUserIsSoftDeleted()
        {
            var sourceUser = await SeedUser();
            await SeedAthleteRole();
            SetupClubExists();

            // Soft-delete the source user
            sourceUser.IsDeleted = true;
            sourceUser.DeletedAt = DateTime.UtcNow;
            await Context.SaveChangesAsync();

            var act = () => Sut.LinkToClubAsync(sourceUser.Id, TestClubId, "Athlete");

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenTargetClubMaxUsersReached()
        {
            var sourceUser = await SeedUser();
            await SeedAthleteRole();
            ClubRepositoryMock
                .Setup(r => r.GetAsync(TestClubId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new StarterKit.Data.Clubs.Models.Club
                    {
                        Id = TestClubId,
                        Name = "Test Co",
                        MaxAthletes = 0, // limit reached immediately
                    }
                );

            var act = () => Sut.LinkToClubAsync(sourceUser.Id, TestClubId, "Athlete");

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Theory]
        [InlineData("SuperAdmin")]
        [InlineData("ClubAdmin")]
        public async Task ThrowsConflict_WhenAdminRoleAssignedDuringLink(string adminRole)
        {
            var sourceUser = await SeedUser(clubId: Guid.NewGuid());
            // Seed the admin role so FindRoleByNameAsync resolves it before the guard fires
            Context.Roles.Add(
                new RoleEntity
                {
                    Id = Guid.NewGuid(),
                    Name = adminRole,
                    IsElevated = true,
                }
            );
            await Context.SaveChangesAsync();
            SetupClubExists();

            var act = () => Sut.LinkToClubAsync(sourceUser.Id, TestClubId, adminRole);

            var ex = await act.Should().ThrowAsync<ConflictException>();
            ex.Which.ErrorCode.Should().Be("admin-role-multi-club");
        }
    }

    public sealed class AdminUpdateUserAsync : UserServiceTests
    {
        private async Task<(UserEntity User, RoleEntity Role)> SeedUserWithRole()
        {
            var role = new RoleEntity { Id = Guid.NewGuid(), Name = "Athlete" };
            Context.Roles.Add(role);
            var user = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = "firebase-uid-update",
                ClubId = ClubId,
                Email = "update@example.com",
                DisplayName = "Update User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            Context.Users.Add(user);
            Context.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    UserId = user.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();
            return (user, role);
        }

        [Fact]
        public async Task UpdatesDisplayNameAndTeam()
        {
            var (user, _) = await SeedUserWithRole();
            var season = new Season
            {
                Id = Guid.NewGuid(),
                ClubId = ClubId,
                StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
                EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
                CreatedAt = DateTime.UtcNow,
            };
            Context.Seasons.Add(season);
            var newDept = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = season.Id,
                Name = "New Team",
                CreatedAt = DateTime.UtcNow,
            };
            Context.Teams.Add(newDept);
            await Context.SaveChangesAsync();
            var newDeptId = newDept.Id;

            var result = await Sut.AdminUpdateUserAsync(
                new UpdateUserCommand(
                    UserId: user.Id,
                    RoleName: "Athlete",
                    FirstName: "Updated",
                    LastName: "Name",
                    Email: "update@example.com",
                    PhoneNumber: null,
                    DateOfBirth: new DateOnly(2010, 1, 1),
                    TeamIds: [newDeptId]
                )
            );

            result.DisplayName.Should().Be("Updated Name");
            result.TeamIds.Should().Contain(newDeptId);
        }

        [Fact]
        public async Task ReplacesRole_WhenNewRoleProvided()
        {
            var (user, _) = await SeedUserWithRole();
            var adminRole = new RoleEntity { Id = Guid.NewGuid(), Name = "ClubAdmin" };
            Context.Roles.Add(adminRole);
            await Context.SaveChangesAsync();

            var result = await Sut.AdminUpdateUserAsync(
                new UpdateUserCommand(
                    UserId: user.Id,
                    RoleName: "ClubAdmin",
                    FirstName: "Update",
                    LastName: "User",
                    Email: "update@example.com",
                    PhoneNumber: null
                )
            );

            result.Roles.Should().ContainSingle().Which.Should().Be("ClubAdmin");
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            await SeedAthleteRole();

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    new UpdateUserCommand(
                        UserId: Guid.NewGuid(),
                        RoleName: "Athlete",
                        FirstName: "No",
                        LastName: "One",
                        Email: "missing@example.com",
                        PhoneNumber: null
                    )
                );

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenEmailConflictsWithOtherUser()
        {
            var (user, _) = await SeedUserWithRole();
            // Seed another user with the conflicting email
            Context.Users.Add(
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ExternalAuthId = "firebase-uid-conflict",
                    ClubId = ClubId,
                    Email = "taken@example.com",
                    DisplayName = "Conflict User",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    new UpdateUserCommand(
                        UserId: user.Id,
                        RoleName: "Athlete",
                        FirstName: "Update",
                        LastName: "User",
                        Email: "taken@example.com",
                        PhoneNumber: null
                    )
                );

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenPhoneConflictsWithOtherUser()
        {
            var (user, _) = await SeedUserWithRole();
            Context.Users.Add(
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ExternalAuthId = "firebase-uid-phone-conflict",
                    ClubId = ClubId,
                    Email = "other@example.com",
                    PhoneNumber = "+27821234567",
                    DisplayName = "Phone User",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    new UpdateUserCommand(
                        UserId: user.Id,
                        RoleName: "Athlete",
                        FirstName: "Update",
                        LastName: "User",
                        Email: null,
                        PhoneNumber: "+27821234567"
                    )
                );

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenRoleDoesNotExist()
        {
            var (user, _) = await SeedUserWithRole();

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    new UpdateUserCommand(
                        UserId: user.Id,
                        RoleName: "NonExistentRole",
                        FirstName: "Update",
                        LastName: "User",
                        Email: "update@example.com",
                        PhoneNumber: null
                    )
                );

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenAdminRoleAssignedToSharedUser()
        {
            // Seed the user in two clubs sharing the same ExternalAuthId
            var sharedAuthId = "firebase-uid-shared";
            var otherClubId = Guid.NewGuid();
            var adminRole = new RoleEntity
            {
                Id = Guid.NewGuid(),
                Name = "ClubAdmin",
                IsElevated = true,
            };
            Context.Roles.Add(adminRole);

            var userInThisClub = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = sharedAuthId,
                ClubId = Guid.NewGuid(), // any club
                Email = "shared@example.com",
                DisplayName = "Shared User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            var userInOtherClub = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = sharedAuthId, // same auth id = linked identity
                ClubId = otherClubId,
                Email = "shared@example.com",
                DisplayName = "Shared User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            Context.Users.AddRange(userInThisClub, userInOtherClub);
            Context.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    UserId = userInThisClub.Id,
                    RoleId = adminRole.Id,
                    AssignedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    new UpdateUserCommand(
                        UserId: userInThisClub.Id,
                        RoleName: "ClubAdmin",
                        FirstName: "Shared",
                        LastName: "User",
                        Email: "shared@example.com",
                        PhoneNumber: null
                    )
                );

            var ex = await act.Should().ThrowAsync<ConflictException>();
            ex.Which.ErrorCode.Should().Be("admin-role-multi-club");
        }
    }

    public sealed class DeleteUserAsync : UserServiceTests
    {
        [Fact]
        public async Task SoftDeletesUser_WhenUserExists()
        {
            var user = await SeedUser();

            await Sut.DeleteUserAsync(user.Id);

            // After soft-delete the user should no longer be returned by the
            // filtered query, confirming the delete was applied.
            var found = await Context.Users.FindAsync(user.Id);
            found.Should().BeNull();
        }

        [Fact]
        public async Task RemovesRoleAssignments_BeforeDeleting()
        {
            var user = await SeedUser();
            await SeedAthleteRole();
            var role = await Context.Roles.FirstAsync();
            Context.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    UserId = user.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            await Sut.DeleteUserAsync(user.Id);

            var assignments = Context.UserRoleAssignments.Count(a => a.UserId == user.Id);
            assignments.Should().Be(0);
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            var act = () => Sut.DeleteUserAsync(Guid.NewGuid());

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    public sealed class ChangePasswordAsync : UserServiceTests
    {
        private const string ValidPassword = "Test1!";

        [Fact]
        public async Task ThrowsConflict_WhenAuthMethodIsGoogle()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.Google;
            await Context.SaveChangesAsync();

            var act = () => Sut.ChangePasswordAsync(user.Id, ValidPassword);

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenAuthMethodIsMicrosoft()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.Microsoft365;
            await Context.SaveChangesAsync();

            var act = () => Sut.ChangePasswordAsync(user.Id, ValidPassword);

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            var act = () => Sut.ChangePasswordAsync(Guid.NewGuid(), ValidPassword);

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenPasswordTooWeak()
        {
            var user = await SeedUser(); // Credentials by default (enum value 0)

            var act = () => Sut.ChangePasswordAsync(user.Id, "weak");

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CompletesSuccessfully_ForCredentialsUser()
        {
            var user = await SeedUser();
            // AuthMethod defaults to Credentials (value 0) — no explicit set needed.

            await Sut.Invoking(s => s.ChangePasswordAsync(user.Id, ValidPassword))
                .Should()
                .NotThrowAsync();
        }

        [Fact]
        public async Task CompletesSuccessfully_ForCustomAuthUser()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.CustomAuthentication;
            await Context.SaveChangesAsync();

            await Sut.Invoking(s => s.ChangePasswordAsync(user.Id, ValidPassword))
                .Should()
                .NotThrowAsync();
        }
    }

    public sealed class AdminChangePasswordAsync : UserServiceTests
    {
        private const string ValidPassword = "Test1!";

        [Fact]
        public async Task ThrowsConflict_WhenAuthMethodIsGoogle()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.Google;
            await Context.SaveChangesAsync();

            var act = () => Sut.AdminChangePasswordAsync(user.Id, ValidPassword);

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsConflict_WhenAuthMethodIsMicrosoft()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.Microsoft365;
            await Context.SaveChangesAsync();

            var act = () => Sut.AdminChangePasswordAsync(user.Id, ValidPassword);

            await act.Should().ThrowAsync<ConflictException>();
        }

        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenUserDoesNotExist()
        {
            var act = () => Sut.AdminChangePasswordAsync(Guid.NewGuid(), ValidPassword);

            await act.Should().ThrowAsync<EntityNotFoundException>();
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenPasswordIsEmpty()
        {
            var user = await SeedUser();

            var act = () => Sut.AdminChangePasswordAsync(user.Id, "   ");

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenPasswordTooWeak()
        {
            var user = await SeedUser();

            var act = () => Sut.AdminChangePasswordAsync(user.Id, "weak");

            await act.Should().ThrowAsync<ArgumentException>();
        }

        [Fact]
        public async Task CompletesSuccessfully_ForCredentialsUser()
        {
            var user = await SeedUser();

            await Sut.Invoking(s => s.AdminChangePasswordAsync(user.Id, ValidPassword))
                .Should()
                .NotThrowAsync();
        }

        [Fact]
        public async Task CompletesSuccessfully_ForCustomAuthUser()
        {
            var user = await SeedUser();
            user.AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.CustomAuthentication;
            await Context.SaveChangesAsync();

            await Sut.Invoking(s => s.AdminChangePasswordAsync(user.Id, ValidPassword))
                .Should()
                .NotThrowAsync();
        }
    }

    public sealed class RequestPasswordResetAsync : IDisposable
    {
        private static readonly Guid ClubId = Guid.NewGuid();
        private readonly AppDbContext _context;
        private readonly Mock<ISetupEmailService> _emailServiceMock = new();
        private readonly UserService _sut;

        public RequestPasswordResetAsync()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            var setupTokenMock = new Mock<IUserSetupTokenRepository>();
            setupTokenMock
                .Setup(r =>
                    r.GetSetupStatusBulkAsync(
                        It.IsAny<IReadOnlyCollection<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new Dictionary<Guid, bool>());

            _sut = new UserService(
                Mock.Of<IAuthClaimsService>(),
                Mock.Of<IAuthUserProvisioningService>(),
                TimeProvider.System,
                Mock.Of<ILogger<UserService>>(),
                new UserRepository(_context, TimeProvider.System),
                new RoleRepository(_context),
                Mock.Of<IClubRepository>(),
                Mock.Of<ITeamRepository>(),
                Mock.Of<StarterKit.Core.Storage.Interfaces.IBlobStorageService>(),
                Mock.Of<System.Net.Http.IHttpClientFactory>(),
                setupTokenMock.Object,
                _emailServiceMock.Object,
                Options.Create(
                    new AccountSetupOptions
                    {
                        PortalBaseUrl = "http://localhost:3000",
                        MobileBaseUrl = "starterkit-mobile-dev://",
                    }
                ),
                Options.Create(new StarterKit.Core.Configuration.UserServiceOptions()),
                Mock.Of<IUserBulkUploadExcelParserService>(),
                Mock.Of<IUserExportExcelService>()
            );
        }

        private async Task<StarterKit.Data.Persistence.Entities.UserEntity> SeedUser(
            StarterKit.Data.Clubs.Enums.AuthenticationMethod authMethod,
            string email = "user@example.com"
        )
        {
            var entity = new StarterKit.Data.Persistence.Entities.UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = "firebase-uid-456",
                ClubId = ClubId,
                Email = email,
                DisplayName = "Reset User",
                AuthMethod = authMethod,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Users.Add(entity);
            await _context.SaveChangesAsync();
            return entity;
        }

        /// <summary>
        /// Seeds a Credentials user who already completed setup (required for password reset)
        /// and assigns a role with the given <c>IsPortalRole</c>/<c>RequiresOnboarding</c> flags.
        /// </summary>
        private async Task<StarterKit.Data.Persistence.Entities.UserEntity> SeedUserWithRole(
            bool isPortalRole,
            bool requiresOnboarding,
            string email
        )
        {
            var role = new StarterKit.Data.Persistence.Entities.RoleEntity
            {
                Id = Guid.NewGuid(),
                Name = "TestRole",
                IsPortalRole = isPortalRole,
                RequiresOnboarding = requiresOnboarding,
            };
            _context.Roles.Add(role);

            var entity = new StarterKit.Data.Persistence.Entities.UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = "firebase-uid-789",
                ClubId = ClubId,
                Email = email,
                DisplayName = "Reset User",
                AuthMethod = StarterKit.Data.Clubs.Enums.AuthenticationMethod.Credentials,
                LastLoginAt = DateTime.UtcNow.AddDays(-1),
                CreatedAt = DateTime.UtcNow.AddDays(-2),
            };
            _context.Users.Add(entity);
            await _context.SaveChangesAsync();

            _context.UserRoleAssignments.Add(
                new StarterKit.Data.Persistence.Entities.UserRoleAssignmentEntity
                {
                    UserId = entity.Id,
                    RoleId = role.Id,
                    AssignedAt = DateTime.UtcNow,
                }
            );
            await _context.SaveChangesAsync();

            return entity;
        }

        [Fact]
        public async Task ReturnsNull_WhenUserDoesNotExist()
        {
            var result = await _sut.RequestPasswordResetAsync("ghost@example.com");

            result.Should().BeNull();
        }

        [Fact]
        public async Task ReturnsNull_AndSendsOAuthNotification_ForGoogleUser()
        {
            await SeedUser(
                StarterKit.Data.Clubs.Enums.AuthenticationMethod.Google,
                "google@example.com"
            );
            _emailServiceMock
                .Setup(s =>
                    s.SendOAuthProviderResetNotificationAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<StarterKit.Data.Clubs.Enums.AuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var result = await _sut.RequestPasswordResetAsync("google@example.com");

            result.Should().BeNull();
            _emailServiceMock.Verify(
                s =>
                    s.SendOAuthProviderResetNotificationAsync(
                        "google@example.com",
                        It.IsAny<string>(),
                        StarterKit.Data.Clubs.Enums.AuthenticationMethod.Google,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task ReturnsNull_AndSendsOAuthNotification_ForMicrosoftUser()
        {
            await SeedUser(
                StarterKit.Data.Clubs.Enums.AuthenticationMethod.Microsoft365,
                "ms@example.com"
            );
            _emailServiceMock
                .Setup(s =>
                    s.SendOAuthProviderResetNotificationAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<StarterKit.Data.Clubs.Enums.AuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var result = await _sut.RequestPasswordResetAsync("ms@example.com");

            result.Should().BeNull();
            _emailServiceMock.Verify(
                s =>
                    s.SendOAuthProviderResetNotificationAsync(
                        "ms@example.com",
                        It.IsAny<string>(),
                        StarterKit.Data.Clubs.Enums.AuthenticationMethod.Microsoft365,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task ReturnsNull_AndDoesNotSendEmail_ForCustomAuthUser()
        {
            await SeedUser(
                StarterKit.Data.Clubs.Enums.AuthenticationMethod.CustomAuthentication,
                "custom@customauth.starterkitapp.internal"
            );

            var result = await _sut.RequestPasswordResetAsync(
                "custom@customauth.starterkitapp.internal"
            );

            result.Should().BeNull();
            _emailServiceMock.Verify(
                s =>
                    s.SendOAuthProviderResetNotificationAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<StarterKit.Data.Clubs.Enums.AuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        // Regression tests: a role that requires onboarding (e.g. Director, which is
        // *also* a portal role) must always get the mobile link — onboarding only runs in the
        // mobile app, and the web portal's setup/reset pages have no path into the wizard.
        [Fact]
        public async Task SendsMobileLink_WhenRoleIsPortalRoleButRequiresOnboarding()
        {
            await SeedUserWithRole(
                isPortalRole: true,
                requiresOnboarding: true,
                "director@example.com"
            );

            var result = await _sut.RequestPasswordResetAsync(
                "director@example.com",
                returnLinkForDev: true
            );

            result.Should().StartWith("starterkit-mobile-dev://mobile-setup-account?token=");
        }

        [Fact]
        public async Task SendsPortalLink_WhenRoleIsPortalRoleAndDoesNotRequireOnboarding()
        {
            await SeedUserWithRole(
                isPortalRole: true,
                requiresOnboarding: false,
                "clubadmin@example.com"
            );

            var result = await _sut.RequestPasswordResetAsync(
                "clubadmin@example.com",
                returnLinkForDev: true
            );

            result.Should().StartWith("http://admin.localhost:3000/setup-account?token=");
        }

        [Fact]
        public async Task SendsMobileLink_WhenRoleIsMobileOnlyAndRequiresOnboarding()
        {
            await SeedUserWithRole(
                isPortalRole: false,
                requiresOnboarding: true,
                "athlete@example.com"
            );

            var result = await _sut.RequestPasswordResetAsync(
                "athlete@example.com",
                returnLinkForDev: true
            );

            result.Should().StartWith("starterkit-mobile-dev://mobile-setup-account?token=");
        }

        public void Dispose() => _context.Dispose();
    }

    public sealed class GetLinkedOrganisationsAsync_Tests : UserServiceTests
    {
        [Fact]
        public async Task ReturnsAllOrganisations_WhenUserLinkedToMultiple()
        {
            var clubA = new Club { Id = Guid.NewGuid(), Name = "Club A" };
            var clubB = new Club { Id = Guid.NewGuid(), Name = "Club B" };
            Context.Clubs.AddRange(clubA, clubB);
            await Context.SaveChangesAsync();

            await SeedUser("shared-uid", clubA.Id);
            await SeedUser("shared-uid", clubB.Id);

            var result = await Sut.GetLinkedOrganisationsAsync("shared-uid");

            result.Should().HaveCount(2);
            result.Select(o => o.ClubName).Should().Contain("Club A").And.Contain("Club B");
        }

        [Fact]
        public async Task ReturnsSingleOrganisation_WhenUserLinkedToOne()
        {
            var club = new Club { Id = Guid.NewGuid(), Name = "Solo Org" };
            Context.Clubs.Add(club);
            await Context.SaveChangesAsync();

            await SeedUser("single-uid", club.Id);

            var result = await Sut.GetLinkedOrganisationsAsync("single-uid");

            result.Should().HaveCount(1);
            result[0].ClubName.Should().Be("Solo Org");
            result[0].ClubId.Should().Be(club.Id);
        }

        [Fact]
        public async Task ReturnsEmpty_WhenNoUserWithUid()
        {
            var result = await Sut.GetLinkedOrganisationsAsync("non-existent-uid");

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesDeletedUsers()
        {
            var club = new Club { Id = Guid.NewGuid(), Name = "Active Co" };
            Context.Clubs.Add(club);
            await Context.SaveChangesAsync();

            var user = await SeedUser("del-uid", club.Id);
            user.IsDeleted = true;
            await Context.SaveChangesAsync();

            var result = await Sut.GetLinkedOrganisationsAsync("del-uid");

            result.Should().BeEmpty();
        }

        [Fact]
        public async Task ExcludesInactiveUsers()
        {
            var club = new Club { Id = Guid.NewGuid(), Name = "Active Co" };
            Context.Clubs.Add(club);
            await Context.SaveChangesAsync();

            var user = await SeedUser("inactive-uid", club.Id);
            user.IsActive = false;
            await Context.SaveChangesAsync();

            var result = await Sut.GetLinkedOrganisationsAsync("inactive-uid");

            result.Should().BeEmpty();
        }
    }

    public sealed class ListAsync_SetupStatusFilter : UserServiceTests
    {
        private async Task<UserEntity> SeedUserWithSetupToken(
            bool expired = false,
            bool invalidated = false,
            bool used = false
        )
        {
            var user = new UserEntity
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = Guid.NewGuid().ToString(),
                ClubId = ClubId,
                Email = $"{Guid.NewGuid()}@test.com",
                DisplayName = "Test User",
                CreatedAt = DateTime.UtcNow,
            };
            Context.Users.Add(user);
            Context.UserSetupTokens.Add(
                new UserSetupTokenEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    TokenHash = Guid.NewGuid().ToString("N"),
                    TempPasswordHash = Guid.NewGuid().ToString("N"),
                    Purpose = SetupTokenPurpose.AccountSetup,
                    ExpiresAt = expired
                        ? DateTime.UtcNow.AddHours(-24)
                        : DateTime.UtcNow.AddHours(24),
                    UsedAt = used ? DateTime.UtcNow : null,
                    IsInvalidated = invalidated,
                    CreatedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();
            return user;
        }

        [Fact]
        public async Task SetupStatus_PendingSetup_ReturnsOnlyUserWithValidToken()
        {
            var pending = await SeedUserWithSetupToken();
            await SeedUserWithSetupToken(expired: true);
            await SeedUser();

            var result = await Sut.ListAsync(
                new UserQuery { SetupStatus = SetupStatus.PendingSetup },
                CancellationToken.None
            );

            result.Items.Should().ContainSingle().Which.Id.Should().Be(pending.Id);
        }

        [Fact]
        public async Task SetupStatus_SetupExpired_ReturnsOnlyUserWithExpiredToken()
        {
            await SeedUserWithSetupToken();
            var expired = await SeedUserWithSetupToken(expired: true);
            await SeedUser();

            var result = await Sut.ListAsync(
                new UserQuery { SetupStatus = SetupStatus.SetupExpired },
                CancellationToken.None
            );

            result.Items.Should().ContainSingle().Which.Id.Should().Be(expired.Id);
        }

        [Fact]
        public async Task SetupStatus_Null_ReturnsAllUsers()
        {
            await SeedUserWithSetupToken();
            await SeedUserWithSetupToken(expired: true);
            await SeedUser();

            var result = await Sut.ListAsync(
                new UserQuery { SetupStatus = null },
                CancellationToken.None
            );

            result.Items.Should().HaveCount(3);
        }
    }

    public sealed class BuildPortalUrl_WhenHostIsADomain : UserServiceTests
    {
        [Fact]
        public void BuildPortalUrl_WhenNoClubSubdomain_PrependsAdmin()
        {
            var result = UserService.BuildPortalUrl("http://localhost:3000", clubSubdomain: null);

            result.Should().Be("http://admin.localhost:3000");
        }

        [Fact]
        public void BuildPortalUrl_WhenClubSubdomainProvided_ReplacesFirstHostSegment()
        {
            var result = UserService.BuildPortalUrl(
                "https://admin.starterkit.app",
                clubSubdomain: "acme"
            );

            result.Should().Be("https://acme.starterkit.app");
        }
    }

    public sealed class BuildPortalUrl_WhenHostIsAnIpAddress : UserServiceTests
    {
        // Regression test: dotted-quad IPv4 octets were previously treated as domain
        // labels, mangling a LAN dev address like http://192.168.1.5:3000 into the unreachable
        // "http://admin.168.1.5:3000" — a phone opening the setup-account email link over LAN
        // could never resolve it. IP hosts have no concept of a subdomain, so they must pass
        // through unchanged regardless of whether a club subdomain was given.
        [Fact]
        public void BuildPortalUrl_WhenIPv4Host_ReturnsUnchanged()
        {
            var result = UserService.BuildPortalUrl("http://192.168.1.5:3000", clubSubdomain: null);

            result.Should().Be("http://192.168.1.5:3000");
        }

        [Fact]
        public void BuildPortalUrl_WhenIPv4HostAndClubSubdomainProvided_StillReturnsUnchanged()
        {
            var result = UserService.BuildPortalUrl(
                "http://192.168.1.5:3000",
                clubSubdomain: "acme"
            );

            result.Should().Be("http://192.168.1.5:3000");
        }

        [Fact]
        public void BuildPortalUrl_WhenIPv6Host_ReturnsUnchanged()
        {
            var result = UserService.BuildPortalUrl("http://[::1]:3000", clubSubdomain: null);

            result.Should().Be("http://[::1]:3000");
        }

        [Fact]
        public void BuildPortalUrl_WhenTrailingSlash_TrimsIt()
        {
            var result = UserService.BuildPortalUrl(
                "http://192.168.1.5:3000/",
                clubSubdomain: null
            );

            result.Should().Be("http://192.168.1.5:3000");
        }
    }
}
