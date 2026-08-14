using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Services;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Repositories;
using StarterKit.Data.Seasons.Models;
using StarterKit.Data.Teams.Models;
using StarterKit.Data.Teams.Repositories;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Core.Tests.Auth;

/// <summary>
/// Tests for the the identity split edit-mode parity behavior added to <see cref="UserService.AdminUpdateUserAsync"/>:
/// replacing Team Assignment / Linked Athlete(s) links, the Athlete DOB requirement, and
/// Parent/Guardian email resolution — mirrors <see cref="AdminCreateUserServiceTests"/>'s
/// equivalent create-mode coverage.
/// </summary>
public abstract class AdminUpdateUserServiceTests
{
    protected static readonly Guid ClubId = Guid.NewGuid();

    protected readonly AppDbContext Context;
    protected readonly UserService Sut;
    protected readonly Mock<IClubRepository> ClubRepositoryMock = new();

    protected AdminUpdateUserServiceTests()
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
            Options.Create(new UserServiceOptions()),
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

    protected async Task SeedRoleAsync(string roleName) => await SeedRoleIfMissingAsync(roleName);

    private async Task<RoleEntity> SeedRoleIfMissingAsync(string roleName)
    {
        var existing = await Context.Roles.FirstOrDefaultAsync(r => r.Name == roleName);
        if (existing is not null)
            return existing;

        var role = new RoleEntity { Id = Guid.NewGuid(), Name = roleName };
        Context.Roles.Add(role);
        await Context.SaveChangesAsync();
        return role;
    }

    protected async Task<UserEntity> SeedUserToUpdateAsync(string roleName)
    {
        var role = await SeedRoleIfMissingAsync(roleName);

        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = Guid.NewGuid().ToString(),
            ClubId = ClubId,
            Email = $"{Guid.NewGuid()}@test.com",
            DisplayName = "Existing User",
            AuthMethod = AuthenticationMethod.Credentials,
            CreatedAt = DateTime.UtcNow,
        };
        Context.Users.Add(user);
        await Context.SaveChangesAsync();

        Context.UserRoleAssignments.Add(
            new UserRoleAssignmentEntity
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                RoleId = role.Id,
            }
        );
        await Context.SaveChangesAsync();

        return user;
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
            Name = $"Team {Guid.NewGuid()}",
            CreatedAt = DateTime.UtcNow,
        };
        Context.Teams.Add(team);

        await Context.SaveChangesAsync();
        return team.Id;
    }

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
            var role = await SeedRoleIfMissingAsync(roleName);
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
            var role = await SeedRoleIfMissingAsync(roleName);
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

    protected static UpdateUserCommand MakeCommand(
        UserEntity user,
        string roleName,
        DateOnly? dateOfBirth = null,
        IReadOnlyList<Guid>? teamIds = null,
        IReadOnlyList<Guid>? dependentUserIds = null,
        string? parentGuardianEmail = null,
        int? jerseyNumber = null
    ) =>
        new(
            UserId: user.Id,
            RoleName: roleName,
            FirstName: "Test",
            LastName: "User",
            Email: user.Email,
            PhoneNumber: null,
            DateOfBirth: dateOfBirth,
            JerseyNumber: jerseyNumber,
            TeamIds: teamIds,
            DependentUserIds: dependentUserIds,
            ParentGuardianEmail: parentGuardianEmail
        );

    public sealed class AdminUpdate_TeamLinking : AdminUpdateUserServiceTests
    {
        [Fact]
        public async Task ReplaceUserTeamsAsync_WhenNoExistingLinks_AddsGivenTeam()
        {
            var user = await SeedUserToUpdateAsync("Coach");
            var teamId = await SeedTeamAsync();

            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [teamId]));

            var links = await Context.UserTeams.Where(x => x.UserId == user.Id).ToListAsync();
            links.Should().ContainSingle(x => x.TeamId == teamId);
        }

        [Fact]
        public async Task ReplaceUserTeamsAsync_WhenTeamRemovedFromList_UnlinksIt()
        {
            var user = await SeedUserToUpdateAsync("Coach");
            var teamA = await SeedTeamAsync();
            var teamB = await SeedTeamAsync();
            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [teamA, teamB]));

            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [teamA]));

            var links = await Context.UserTeams.Where(x => x.UserId == user.Id).ToListAsync();
            links.Should().ContainSingle(x => x.TeamId == teamA);
        }

        [Fact]
        public async Task WhenTeamIdsNotProvided_LeavesExistingLinksUnchanged()
        {
            var user = await SeedUserToUpdateAsync("Coach");
            var teamId = await SeedTeamAsync();
            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [teamId]));

            // TeamIds omitted (null) — per UpdateUserCommand contract, null means "leave unchanged."
            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach"));

            var links = await Context.UserTeams.Where(x => x.UserId == user.Id).ToListAsync();
            links.Should().ContainSingle(x => x.TeamId == teamId);
        }

        [Fact]
        public async Task WhenTeamIdsIsEmptyList_ClearsAllLinks()
        {
            var user = await SeedUserToUpdateAsync("Coach");
            var teamId = await SeedTeamAsync();
            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [teamId]));

            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: []));

            var links = await Context.UserTeams.Where(x => x.UserId == user.Id).ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task ThrowsValidation_WhenTeamBelongsToAnotherClub()
        {
            var user = await SeedUserToUpdateAsync("Coach");
            var otherClubTeamId = await SeedTeamInOtherClubAsync();

            var act = () =>
                Sut.AdminUpdateUserAsync(MakeCommand(user, "Coach", teamIds: [otherClubTeamId]));

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "team-not-in-club");
        }
    }

    public sealed class AdminUpdate_GuardianLinking : AdminUpdateUserServiceTests
    {
        [Fact]
        public async Task ReplaceGuardianLinksAsync_WhenNoExistingLinks_AddsGivenDependent()
        {
            var user = await SeedUserToUpdateAsync("Parent");
            var dependent = await SeedDependentUserAsync("Athlete");

            await Sut.AdminUpdateUserAsync(
                MakeCommand(user, "Parent", dependentUserIds: [dependent.Id])
            );

            var links = await Context
                .UserGuardians.Where(x => x.GuardianId == user.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.DependentId == dependent.Id);
        }

        [Fact]
        public async Task ReplaceGuardianLinksAsync_WhenDependentRemovedFromList_UnlinksIt()
        {
            var user = await SeedUserToUpdateAsync("Parent");
            var dependentA = await SeedDependentUserAsync("Athlete");
            var dependentB = await SeedDependentUserAsync("Athlete");
            await Sut.AdminUpdateUserAsync(
                MakeCommand(user, "Parent", dependentUserIds: [dependentA.Id, dependentB.Id])
            );

            await Sut.AdminUpdateUserAsync(
                MakeCommand(user, "Parent", dependentUserIds: [dependentA.Id])
            );

            var links = await Context
                .UserGuardians.Where(x => x.GuardianId == user.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.DependentId == dependentA.Id);
        }

        [Fact]
        public async Task WhenDependentUserIdsIsEmptyList_ClearsAllLinks()
        {
            var user = await SeedUserToUpdateAsync("Parent");
            var dependent = await SeedDependentUserAsync("Athlete");
            await Sut.AdminUpdateUserAsync(
                MakeCommand(user, "Parent", dependentUserIds: [dependent.Id])
            );

            await Sut.AdminUpdateUserAsync(MakeCommand(user, "Parent", dependentUserIds: []));

            var links = await Context
                .UserGuardians.Where(x => x.GuardianId == user.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }

        [Fact]
        public async Task ThrowsValidation_WhenDependentDoesNotHaveAthleteRole()
        {
            var user = await SeedUserToUpdateAsync("Parent");
            var nonAthleteDependent = await SeedDependentUserAsync("Coach");

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    MakeCommand(user, "Parent", dependentUserIds: [nonAthleteDependent.Id])
                );

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "dependent-invalid");
        }

        [Fact]
        public async Task ThrowsValidation_WhenDependentBelongsToAnotherClub()
        {
            var user = await SeedUserToUpdateAsync("Parent");
            var otherClubAthlete = await SeedUserInOtherClubAsync("Athlete");

            var act = () =>
                Sut.AdminUpdateUserAsync(
                    MakeCommand(user, "Parent", dependentUserIds: [otherClubAthlete.Id])
                );

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "dependent-invalid");
        }
    }

    public sealed class AdminUpdate_ParentGuardianEmailLinking : AdminUpdateUserServiceTests
    {
        [Fact]
        public async Task LinksGuardian_WhenParentGuardianEmailMatchesExistingParent()
        {
            var athlete = await SeedUserToUpdateAsync("Athlete");
            var guardian = await SeedDependentUserAsync("Parent");

            await Sut.AdminUpdateUserAsync(
                MakeCommand(
                    athlete,
                    "Athlete",
                    dateOfBirth: new DateOnly(2012, 5, 1),
                    parentGuardianEmail: guardian.Email
                )
            );

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().ContainSingle(x => x.GuardianId == guardian.Id);
        }

        [Fact]
        public async Task DoesNotLinkGuardian_WhenParentGuardianEmailIsNotProvided()
        {
            var athlete = await SeedUserToUpdateAsync("Athlete");

            await Sut.AdminUpdateUserAsync(
                MakeCommand(athlete, "Athlete", dateOfBirth: new DateOnly(2012, 5, 1))
            );

            var links = await Context
                .UserGuardians.Where(x => x.DependentId == athlete.Id)
                .ToListAsync();
            links.Should().BeEmpty();
        }
    }

    public sealed class AdminUpdate_AthleteDateOfBirthValidation : AdminUpdateUserServiceTests
    {
        [Fact]
        public async Task ThrowsValidation_WhenAthleteRoleAndDateOfBirthMissing()
        {
            var athlete = await SeedUserToUpdateAsync("Athlete");

            var act = () => Sut.AdminUpdateUserAsync(MakeCommand(athlete, "Athlete"));

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "date-of-birth-required");
        }

        [Fact]
        public async Task ThrowsValidation_WhenAthleteRoleAndDateOfBirthIsInTheFuture()
        {
            var athlete = await SeedUserToUpdateAsync("Athlete");
            var futureDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

            var act = () =>
                Sut.AdminUpdateUserAsync(MakeCommand(athlete, "Athlete", dateOfBirth: futureDate));

            await act.Should()
                .ThrowAsync<ValidationException>()
                .Where(e => e.ErrorCode == "date-of-birth-invalid");
        }

        [Fact]
        public async Task Succeeds_WhenAthleteRoleAndDateOfBirthProvided()
        {
            var athlete = await SeedUserToUpdateAsync("Athlete");

            var result = await Sut.AdminUpdateUserAsync(
                MakeCommand(athlete, "Athlete", dateOfBirth: new DateOnly(2012, 5, 1))
            );

            result.DateOfBirth.Should().Be(new DateOnly(2012, 5, 1));
        }

        [Fact]
        public async Task DoesNotRequireDateOfBirth_ForNonAthleteRoles()
        {
            // Director rather than Coach/Parent — those two carry their own non-empty-link
            // invariant (CoachTeamLinkRule/ParentLinkRule) that's unrelated to what this test
            // is checking.
            var director = await SeedUserToUpdateAsync("Director");

            var result = await Sut.AdminUpdateUserAsync(MakeCommand(director, "Director"));

            result.Should().NotBeNull();
        }
    }

    public sealed class AdminUpdate_JerseyNumberRange : AdminUpdateUserServiceTests
    {
        [Fact]
        public async Task ThrowsArgumentException_WhenJerseyNumberIsOutOfRange()
        {
            // MCP tool calls bypass the DTO's [Range] attribute (only enforced through
            // controller model validation), so the service itself must guard this.
            var director = await SeedUserToUpdateAsync("Director");

            var act = () =>
                Sut.AdminUpdateUserAsync(MakeCommand(director, "Director", jerseyNumber: 100));

            await act.Should().ThrowAsync<ArgumentException>().WithParameterName("JerseyNumber");
        }
    }
}
