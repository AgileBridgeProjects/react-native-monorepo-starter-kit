using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Services;
using StarterKit.Core.Users.DTOs;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Repositories;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Teams.Repositories;
using StarterKit.Data.Users.Enums;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Core.Tests.Auth;

public abstract class AdminCreateUserServiceTests
{
    protected static readonly Guid ClubId = Guid.NewGuid();

    protected readonly AppDbContext Context;
    protected readonly UserService Sut;
    protected readonly Mock<IClubRepository> ClubRepositoryMock = new();
    protected readonly Mock<IAuthUserProvisioningService> FirebaseProvisioningMock = new();

    protected AdminCreateUserServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Context = new AppDbContext(options);

        FirebaseProvisioningMock
            .Setup(f =>
                f.CreateUserByEmailAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync("firebase-uid-new");

        FirebaseProvisioningMock
            .Setup(f =>
                f.CreateUserByPhoneAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync("firebase-uid-phone");

        Sut = new UserService(
            Mock.Of<IAuthClaimsService>(),
            FirebaseProvisioningMock.Object,
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            new UserRepository(Context, TimeProvider.System),
            new RoleRepository(Context),
            ClubRepositoryMock.Object,
            new TeamRepository(Context),
            Mock.Of<StarterKit.Core.Storage.Interfaces.IBlobStorageService>(),
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            CreateSetupTokenRepoMock(),
            CreateSetupEmailServiceMock(),
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

    private static IUserSetupTokenRepository CreateSetupTokenRepoMock()
    {
        var mock = new Mock<IUserSetupTokenRepository>();
        mock.Setup(r => r.AddAsync(It.IsAny<UserSetupTokenEntity>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        mock.Setup(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        mock.Setup(r =>
                r.InvalidateAllForUserAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<SetupTokenPurpose>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        return mock.Object;
    }

    private static ISetupEmailService CreateSetupEmailServiceMock()
    {
        var mock = new Mock<ISetupEmailService>();
        mock.Setup(s =>
                s.SendSetupLinkAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        mock.Setup(s =>
                s.SendPasswordResetLinkAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(Task.CompletedTask);
        return mock.Object;
    }

    protected void SetupClub(int? maxUsers = null) =>
        ClubRepositoryMock
            .Setup(c => c.GetAsync(ClubId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new Club
                {
                    Id = ClubId,
                    Name = "Test Club",
                    MaxAthletes = maxUsers,
                }
            );

    protected async Task SeedRoleAsync(string roleName = "Coach")
    {
        Context.Roles.Add(new RoleEntity { Id = Guid.NewGuid(), Name = roleName });
        await Context.SaveChangesAsync();
    }

    protected async Task<Guid> SeedTeamAsync()
    {
        var season = new Season
        {
            Id = Guid.NewGuid(),
            ClubId = ClubId,
            StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
            EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
            CreatedAt = DateTime.UtcNow,
        };
        Context.Seasons.Add(season);

        var team = new Team
        {
            Id = Guid.NewGuid(),
            SeasonId = season.Id,
            Name = "Team A",
            CreatedAt = DateTime.UtcNow,
        };
        Context.Teams.Add(team);

        await Context.SaveChangesAsync();
        return team.Id;
    }

    /// <summary>Seeds a Team belonging to a different club than <see cref="ClubId"/>.</summary>
    protected async Task<Guid> SeedTeamInOtherClubAsync()
    {
        var otherClubId = Guid.NewGuid();
        var season = new Season
        {
            Id = Guid.NewGuid(),
            ClubId = otherClubId,
            StartDate = new DateOnly(DateTime.UtcNow.Year, 1, 1),
            EndDate = new DateOnly(DateTime.UtcNow.Year, 12, 31),
            CreatedAt = DateTime.UtcNow,
        };
        Context.Seasons.Add(season);

        var team = new Team
        {
            Id = Guid.NewGuid(),
            SeasonId = season.Id,
            Name = "Other Club Team",
            CreatedAt = DateTime.UtcNow,
        };
        Context.Teams.Add(team);

        await Context.SaveChangesAsync();
        return team.Id;
    }

    /// <summary>Seeds a user belonging to a different club than <see cref="ClubId"/>.</summary>
    protected async Task<UserEntity> SeedUserInOtherClubAsync(string? roleName = null)
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = Guid.NewGuid().ToString(),
            ClubId = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = "Other Club User",
            CreatedAt = DateTime.UtcNow,
        };
        Context.Users.Add(user);
        await Context.SaveChangesAsync();

        if (roleName is not null)
        {
            var role =
                await Context.Roles.FirstOrDefaultAsync(r => r.Name == roleName)
                ?? throw new InvalidOperationException(
                    $"Role '{roleName}' must be seeded before calling SeedUserInOtherClubAsync with a role."
                );
            Context.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = role.Id,
                }
            );
            await Context.SaveChangesAsync();
        }

        return user;
    }

    protected async Task<UserEntity> SeedDependentUserAsync(string? roleName = null)
    {
        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = Guid.NewGuid().ToString(),
            ClubId = ClubId,
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = "Dependent Athlete",
            CreatedAt = DateTime.UtcNow,
        };
        Context.Users.Add(user);
        await Context.SaveChangesAsync();

        if (roleName is not null)
        {
            var role =
                await Context.Roles.FirstOrDefaultAsync(r => r.Name == roleName)
                ?? throw new InvalidOperationException(
                    $"Role '{roleName}' must be seeded before calling SeedDependentUserAsync with a role."
                );
            Context.UserRoleAssignments.Add(
                new UserRoleAssignmentEntity
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = role.Id,
                }
            );
            await Context.SaveChangesAsync();
        }

        return user;
    }

    protected AdminCreateUserCommand MakeCommand(
        string? email = "new@example.com",
        string? phone = null,
        AuthenticationMethod method = AuthenticationMethod.Credentials,
        string roleName = "Coach"
    ) =>
        new(
            ClubId: ClubId,
            RoleName: roleName,
            FirstName: "Test",
            LastName: "User",
            AuthMethod: method,
            Email: email,
            PhoneNumber: phone
        );

    // ── happy path ────────────────────────────────────────────────────────────

    public sealed class AdminCreate_CreatesUserWithRole : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task CreatesUserAndAssignsRole()
        {
            SetupClub();
            await SeedRoleAsync();

            var (result, _) = await Sut.AdminCreateUserAsync(MakeCommand());

            result.Email.Should().Be("new@example.com");
            result.DisplayName.Should().Be("Test User");
            result.Roles.Should().Contain("Coach");

            var dbUser = await Context.Users.SingleAsync(u => u.Id == result.Id);
            dbUser.ExternalAuthId.Should().Be("firebase-uid-new");
        }

        [Fact]
        public async Task MobileRoleUser_SetupLinkUsesMobileSchemeAndMobilePath()
        {
            SetupClub();
            await SeedRoleAsync(); // "Coach" — a mobile (non-portal) role

            var (_, setupLink) = await Sut.AdminCreateUserAsync(MakeCommand());

            // Mobile users get the /mobile-setup-account path (distinct from the portal's
            // /setup-account), and a custom-scheme base ("starterkit-mobile-dev://") must be
            // appended as-is — TrimEnd must not collapse the "://" into a single slash.
            setupLink.Should().StartWith("starterkit-mobile-dev://mobile-setup-account?token=");
            setupLink.Should().NotContain("starterkit-mobile-dev:/mobile-setup-account");
        }

        [Fact]
        public async Task CallsFirebaseProvisioningForCredentialsEmail()
        {
            SetupClub();
            await SeedRoleAsync();

            await Sut.AdminCreateUserAsync(MakeCommand());

            FirebaseProvisioningMock.Verify(
                f =>
                    f.CreateUserByEmailAsync(
                        "new@example.com",
                        "Test User",
                        AuthenticationMethod.Credentials,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task CallsFirebaseProvisioningForMicrosoft365Club()
        {
            SetupClub();
            await SeedRoleAsync();

            await Sut.AdminCreateUserAsync(
                MakeCommand(email: "sso@corp.com", method: AuthenticationMethod.Microsoft365)
            );

            FirebaseProvisioningMock.Verify(
                f =>
                    f.CreateUserByEmailAsync(
                        "sso@corp.com",
                        "Test User",
                        AuthenticationMethod.Microsoft365,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task CreatesUserByPhoneForCredentialsPhoneOnly()
        {
            SetupClub();
            await SeedRoleAsync();

            var (result, _) = await Sut.AdminCreateUserAsync(
                MakeCommand(email: null, phone: "+27821234567")
            );

            result.PhoneNumber.Should().Be("+27821234567");
            FirebaseProvisioningMock.Verify(
                f =>
                    f.CreateUserByPhoneAsync(
                        "+27821234567",
                        "Test User",
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── conflict cases ────────────────────────────────────────────────────────

    public sealed class AdminCreate_ConflictDuplicate : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task ThrowsConflict_WhenEmailAlreadyExists()
        {
            SetupClub();
            await SeedRoleAsync();

            Context.Users.Add(
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ClubId = ClubId,
                    Email = "new@example.com",
                    DisplayName = "Existing",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            var act = () => Sut.AdminCreateUserAsync(MakeCommand());
            await act.Should().ThrowAsync<ConflictException>();
        }
    }

    public sealed class AdminCreate_ClubNotFound : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task ThrowsEntityNotFoundException_WhenClubMissing()
        {
            ClubRepositoryMock
                .Setup(c => c.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((Club?)null);

            var act = () => Sut.AdminCreateUserAsync(MakeCommand());
            await act.Should().ThrowAsync<EntityNotFoundException>();
        }
    }

    public sealed class AdminCreate_UserLimitReached : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task ThrowsConflict_WhenMaxUsersExceeded()
        {
            SetupClub(maxUsers: 0); // limit is 0 → immediately exceeded

            var act = () => Sut.AdminCreateUserAsync(MakeCommand());
            await act.Should().ThrowAsync<ConflictException>();
        }
    }

    // ── CustomAuthentication ──────────────────────────────────────────────────

    public sealed class AdminCreate_CustomAuthentication : AdminCreateUserServiceTests
    {
        public AdminCreate_CustomAuthentication()
        {
            FirebaseProvisioningMock
                .Setup(f =>
                    f.CreateUserByUsernameAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync("firebase-uid-custom");
        }

        private AdminCreateUserCommand MakeCustomCommand(
            string username = "jdoe",
            string password = "P@ssword123"
        ) =>
            new(
                ClubId: ClubId,
                RoleName: "Coach",
                FirstName: "John",
                LastName: "Doe",
                AuthMethod: AuthenticationMethod.CustomAuthentication,
                Email: null,
                PhoneNumber: null,
                Username: username,
                Password: password
            );

        [Fact]
        public async Task CreatesUserWithUsername()
        {
            SetupClub();
            await SeedRoleAsync();

            var (result, setupLink) = await Sut.AdminCreateUserAsync(MakeCustomCommand());

            result.Username.Should().Be("jdoe");
            result.AuthMethod.Should().Be(AuthenticationMethod.CustomAuthentication);
            result.ExternalAuthId.Should().Be("firebase-uid-custom");
            setupLink.Should().BeNull();
        }

        [Fact]
        public async Task CallsCreateUserByUsernameAsync()
        {
            SetupClub();
            await SeedRoleAsync();

            await Sut.AdminCreateUserAsync(MakeCustomCommand());

            FirebaseProvisioningMock.Verify(
                f =>
                    f.CreateUserByUsernameAsync(
                        "jdoe",
                        "P@ssword123",
                        "John Doe",
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task ThrowsConflict_WhenUsernameAlreadyExists()
        {
            SetupClub();
            await SeedRoleAsync();

            Context.Users.Add(
                new UserEntity
                {
                    Id = Guid.NewGuid(),
                    ClubId = ClubId,
                    Username = "jdoe",
                    AuthMethod = AuthenticationMethod.CustomAuthentication,
                    DisplayName = "Existing Doe",
                    CreatedAt = DateTime.UtcNow,
                }
            );
            await Context.SaveChangesAsync();

            var act = () => Sut.AdminCreateUserAsync(MakeCustomCommand());
            await act.Should()
                .ThrowAsync<ConflictException>()
                .Where(e => e.ErrorCode == "username-conflict");
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenPasswordMissing()
        {
            SetupClub();
            await SeedRoleAsync();

            var act = () => Sut.AdminCreateUserAsync(MakeCustomCommand(password: ""));
            await act.Should().ThrowAsync<ArgumentException>();
        }
    }

    public sealed class AdminCreate_AthleteFields : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task ThrowsValidation_WhenAthleteMissingDateOfBirth()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(roleName: "Athlete");

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "date-of-birth-required");
        }

        [Fact]
        public async Task PersistsAthleteFields_WhenProvided()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                Position = PlayingPosition.OutsideHitter,
                JerseyNumber = 7,
            };

            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var dbUser = await Context.Users.SingleAsync(u => u.Id == result.Id);
            dbUser.DateOfBirth.Should().Be(new DateOnly(2012, 5, 1));
            dbUser.Position.Should().Be(PlayingPosition.OutsideHitter);
            dbUser.JerseyNumber.Should().Be(7);
        }

        [Fact]
        public async Task ThrowsValidation_WhenDateOfBirthIsInTheFuture()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(roleName: "Athlete") with
            {
                DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            };

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "date-of-birth-invalid");
        }

        [Fact]
        public async Task ThrowsArgumentException_WhenJerseyNumberIsOutOfRange()
        {
            // MCP tool calls bypass the DTO's [Range] attribute (only enforced through
            // controller model validation), so the service itself must guard this.
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                JerseyNumber = 100,
            };

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should().ThrowAsync<ArgumentException>().WithParameterName("JerseyNumber");
        }
    }

    public sealed class AdminCreate_TeamLinking : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task LinksUserToProvidedTeams()
        {
            SetupClub();
            await SeedRoleAsync("Coach");
            var teamId = await SeedTeamAsync();

            var command = MakeCommand(roleName: "Coach") with { TeamIds = [teamId] };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context.UserTeams.Where(x => x.UserId == result.Id).ToListAsync();
            links.Should().ContainSingle(x => x.TeamId == teamId);
        }

        [Fact]
        public async Task WhenNoTeamIdsProvided_CreatesNoLinks()
        {
            SetupClub();
            await SeedRoleAsync();

            var (result, _) = await Sut.AdminCreateUserAsync(MakeCommand());

            var links = await Context.UserTeams.Where(x => x.UserId == result.Id).ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task ThrowsValidation_WhenTeamBelongsToAnotherClub()
        {
            SetupClub();
            await SeedRoleAsync("Coach");
            var otherClubTeamId = await SeedTeamInOtherClubAsync();

            var command = MakeCommand(roleName: "Coach") with { TeamIds = [otherClubTeamId] };

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "team-not-in-club");
        }
    }

    public sealed class AdminCreate_GuardianLinking : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task LinksGuardianToProvidedDependents()
        {
            SetupClub();
            await SeedRoleAsync("Parent");
            await SeedRoleAsync("Athlete");
            var dependent = await SeedDependentUserAsync("Athlete");

            var command = MakeCommand(roleName: "Parent") with
            {
                DependentUserIds = [dependent.Id],
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.GuardianId == result.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.DependentId == dependent.Id);
        }

        [Fact]
        public async Task WhenNoDependentIdsProvided_CreatesNoLinks()
        {
            SetupClub();
            await SeedRoleAsync("Parent");

            var (result, _) = await Sut.AdminCreateUserAsync(MakeCommand(roleName: "Parent"));

            var links = await Context
                .UserGuardians.Where(x => x.GuardianId == result.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task ThrowsValidation_WhenDependentDoesNotHaveAthleteRole()
        {
            SetupClub();
            await SeedRoleAsync("Parent");
            await SeedRoleAsync("Coach");
            var nonAthleteDependent = await SeedDependentUserAsync("Coach");

            var command = MakeCommand(roleName: "Parent") with
            {
                DependentUserIds = [nonAthleteDependent.Id],
            };

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "dependent-invalid");
        }

        [Fact]
        public async Task ThrowsValidation_WhenDependentBelongsToAnotherClub()
        {
            SetupClub();
            await SeedRoleAsync("Parent");
            await SeedRoleAsync("Athlete");
            var otherClubAthlete = await SeedUserInOtherClubAsync("Athlete");

            var command = MakeCommand(roleName: "Parent") with
            {
                DependentUserIds = [otherClubAthlete.Id],
            };

            var act = () => Sut.AdminCreateUserAsync(command);

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "dependent-invalid");
        }
    }

    public sealed class AdminCreate_ParentGuardianEmailLinking : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task LinksGuardian_WhenParentGuardianEmailMatchesExistingParent()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            await SeedRoleAsync("Parent");
            var guardian = await SeedDependentUserAsync("Parent");

            var command = MakeCommand(email: "athlete@example.com", roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                ParentGuardianEmail = guardian.Email,
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == result.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.GuardianId == guardian.Id);
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenParentGuardianEmailIsNotProvided()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(email: "athlete2@example.com", roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == result.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenParentGuardianEmailDoesNotResolve()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var command = MakeCommand(email: "athlete3@example.com", roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                ParentGuardianEmail = "unknown-guardian@example.com",
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == result.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenResolvedExistingUserIsNotParentRole()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            await SeedRoleAsync("Coach");
            var nonParent = await SeedDependentUserAsync("Coach");

            var command = MakeCommand(email: "athlete4@example.com", roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                ParentGuardianEmail = nonParent.Email,
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == result.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenResolvedGuardianBelongsToAnotherClub()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            await SeedRoleAsync("Parent");
            var otherClubParent = await SeedUserInOtherClubAsync("Parent");

            var command = MakeCommand(email: "athlete5@example.com", roleName: "Athlete") with
            {
                DateOfBirth = new DateOnly(2012, 5, 1),
                ParentGuardianEmail = otherClubParent.Email,
            };
            var (result, _) = await Sut.AdminCreateUserAsync(command);

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == result.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }
    }

    protected BulkUploadValidUserDto MakeValidRow(
        string roleName = "Athlete",
        string? email = null,
        Guid? teamId = null,
        DateOnly? dateOfBirth = null,
        string? parentGuardianEmail = null,
        int rowNumber = 2
    ) =>
        new(
            RowNumber: rowNumber,
            FirstName: "Bulk",
            LastName: "User",
            Email: email ?? $"{Guid.NewGuid()}@example.com",
            PhoneNumber: null,
            CountryCode: null,
            AuthMethod: AuthenticationMethod.Credentials,
            RoleName: roleName,
            TeamName: null,
            TeamId: teamId,
            Username: null,
            DateOfBirth: dateOfBirth,
            ParentGuardianEmail: parentGuardianEmail
        );

    public sealed class ConfirmBulkUpload_TeamAndGuardianLinking : AdminCreateUserServiceTests
    {
        [Fact]
        public async Task LinksUserTeam_WhenRowHasTeamId()
        {
            SetupClub();
            await SeedRoleAsync("Coach");
            var teamId = await SeedTeamAsync();

            var row = MakeValidRow(roleName: "Coach", teamId: teamId);

            var result = await Sut.ConfirmBulkUploadAsync(ClubId, null, [row], null);

            result.CreatedCount.Should().Be(1);
            var createdUser = await Context.Users.SingleAsync(u => u.Email == row.Email);
            var links = await Context
                .UserTeams.Where(x => x.UserId == createdUser.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.TeamId == teamId);
        }

        [Fact]
        public async Task LinksGuardian_WhenParentGuardianEmailMatchesExistingUser()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            await SeedRoleAsync("Parent");
            var guardian = await SeedDependentUserAsync("Parent");

            var row = MakeValidRow(
                roleName: "Athlete",
                dateOfBirth: new DateOnly(2013, 3, 4),
                parentGuardianEmail: guardian.Email
            );

            var result = await Sut.ConfirmBulkUploadAsync(ClubId, null, [row], null);

            result.CreatedCount.Should().Be(1);
            var athlete = await Context.Users.SingleAsync(u => u.Email == row.Email);
            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.GuardianId == guardian.Id);
        }

        [Fact]
        public async Task LinksGuardian_WhenParentGuardianEmailMatchesRowCreatedEarlierInSameBatch()
        {
            SetupClub();
            await SeedRoleAsync("Parent");
            await SeedRoleAsync("Athlete");

            var parentEmail = $"{Guid.NewGuid()}@example.com";
            var parentRow = MakeValidRow(roleName: "Parent", email: parentEmail, rowNumber: 2);
            var athleteRow = MakeValidRow(
                roleName: "Athlete",
                dateOfBirth: new DateOnly(2014, 6, 1),
                parentGuardianEmail: parentEmail,
                rowNumber: 3
            );

            var result = await Sut.ConfirmBulkUploadAsync(
                ClubId,
                null,
                [parentRow, athleteRow],
                null
            );

            result.CreatedCount.Should().Be(2);
            var parent = await Context.Users.SingleAsync(u => u.Email == parentEmail);
            var athlete = await Context.Users.SingleAsync(u => u.Email == athleteRow.Email);
            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.GuardianId == parent.Id);
        }

        [Fact]
        public async Task ReturnsFailure_WhenAthleteRowMissingDateOfBirth()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");

            var row = MakeValidRow(roleName: "Athlete", dateOfBirth: null);

            var result = await Sut.ConfirmBulkUploadAsync(ClubId, null, [row], null);

            result.CreatedCount.Should().Be(0);
            result.FailedCount.Should().Be(1);
            result
                .Failures[0]
                .Errors.Should()
                .Contain("Date of birth is required for Athlete users.");
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenAthleteRowReferencesItsOwnEmail()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            var selfEmail = $"{Guid.NewGuid()}@example.com";

            var row = MakeValidRow(
                roleName: "Athlete",
                email: selfEmail,
                dateOfBirth: new DateOnly(2013, 3, 4),
                parentGuardianEmail: selfEmail
            );

            var result = await Sut.ConfirmBulkUploadAsync(ClubId, null, [row], null);

            result.CreatedCount.Should().Be(1);
            var athlete = await Context.Users.SingleAsync(u => u.Email == selfEmail);
            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenResolvedExistingUserIsNotParentRole()
        {
            SetupClub();
            await SeedRoleAsync("Athlete");
            await SeedRoleAsync("Coach");
            var nonParent = await SeedDependentUserAsync("Coach");

            var row = MakeValidRow(
                roleName: "Athlete",
                dateOfBirth: new DateOnly(2013, 3, 4),
                parentGuardianEmail: nonParent.Email
            );

            var result = await Sut.ConfirmBulkUploadAsync(ClubId, null, [row], null);

            result.CreatedCount.Should().Be(1);
            var athlete = await Context.Users.SingleAsync(u => u.Email == row.Email);
            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }
    }
}
