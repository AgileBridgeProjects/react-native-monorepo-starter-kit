using FluentAssertions;
using Microsoft.EntityFrameworkCore;
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
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Persistence;
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Roles.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Users.Repositories;

namespace StarterKit.Core.Tests.Users;

/// <summary>
/// Tests for the Firebase recovery paths in auth-method change
/// (AdminUpdateUserAsync when NewAuthMethod differs from the user's current method).
/// </summary>
public abstract class AuthMethodChangeServiceTests
{
    private static readonly Guid ClubId = Guid.NewGuid();

    protected readonly AppDbContext Context;
    protected readonly UserService Sut;
    protected readonly Mock<IAuthUserProvisioningService> FirebaseProvisioningMock = new();
    protected readonly Mock<IAuthClaimsService> FirebaseClaimsMock = new();

    protected AuthMethodChangeServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        Context = new AppDbContext(options);

        Sut = new UserService(
            FirebaseClaimsMock.Object,
            FirebaseProvisioningMock.Object,
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            new UserRepository(Context, TimeProvider.System),
            new RoleRepository(Context),
            Mock.Of<IClubRepository>(),
            Mock.Of<ITeamRepository>(),
            Mock.Of<IBlobStorageService>(),
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            Mock.Of<IUserSetupTokenRepository>(),
            Mock.Of<ISetupEmailService>(),
            Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
            Options.Create(new UserServiceOptions()),
            Mock.Of<IUserBulkUploadExcelParserService>(),
            Mock.Of<IUserExportExcelService>()
        );
    }

    /// <summary>Seeds a PhoneOtp user with a role so AdminUpdateUserAsync can find them.</summary>
    protected async Task<(UserEntity User, RoleEntity Role)> SeedPhoneOtpUserAsync()
    {
        var role = new RoleEntity { Id = Guid.NewGuid(), Name = "Athlete" };
        Context.Roles.Add(role);

        var user = new UserEntity
        {
            Id = Guid.NewGuid(),
            ExternalAuthId = "firebase-phone-uid",
            ClubId = ClubId,
            PhoneNumber = "+27821234567",
            DisplayName = "Test User",
            AuthMethod = AuthenticationMethod.PhoneOtp,
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

    // ── Firebase delete fails ─────────────────────────────────────────────────

    public sealed class FirebaseDeleteFails_CreateStillProceeds : AuthMethodChangeServiceTests
    {
        [Fact]
        public async Task AuthMethodChange_WhenFirebaseDeleteFails_StillCreatesNewFirebaseUser()
        {
            var (user, _) = await SeedPhoneOtpUserAsync();
            const string newUid = "firebase-email-uid";

            // Token revocation best-effort: set up so it doesn't interfere
            FirebaseClaimsMock
                .Setup(s =>
                    s.RevokeRefreshTokensAsync(user.ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            // Step 1: delete throws — idempotent, must be swallowed
            FirebaseProvisioningMock
                .Setup(s => s.DeleteUserAsync(user.ExternalAuthId, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Firebase: user not found"));

            // Step 2: create succeeds
            FirebaseProvisioningMock
                .Setup(s =>
                    s.CreateUserByEmailAsync(
                        "new@example.com",
                        It.IsAny<string>(),
                        AuthenticationMethod.Credentials,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(newUid);

            var command = new UpdateUserCommand(
                UserId: user.Id,
                RoleName: "Athlete",
                FirstName: "Test",
                LastName: "User",
                Email: "new@example.com",
                PhoneNumber: null,
                NewAuthMethod: AuthenticationMethod.Credentials,
                DateOfBirth: new DateOnly(2010, 1, 1)
            );

            // Delete failure is swallowed — should complete without exception
            await Sut.AdminUpdateUserAsync(command);

            // Create was still invoked despite the delete error
            FirebaseProvisioningMock.Verify(
                s =>
                    s.CreateUserByEmailAsync(
                        "new@example.com",
                        It.IsAny<string>(),
                        AuthenticationMethod.Credentials,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── Firebase create fails ─────────────────────────────────────────────────

    public sealed class FirebaseCreateFails_ExceptionPropagates : AuthMethodChangeServiceTests
    {
        [Fact]
        public async Task AuthMethodChange_WhenFirebaseCreateFails_ExceptionPropagates()
        {
            var (user, _) = await SeedPhoneOtpUserAsync();

            FirebaseClaimsMock
                .Setup(s =>
                    s.RevokeRefreshTokensAsync(user.ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            FirebaseProvisioningMock
                .Setup(s => s.DeleteUserAsync(user.ExternalAuthId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Step 2: create fails — old user is already deleted, user is temporarily locked out
            FirebaseProvisioningMock
                .Setup(s =>
                    s.CreateUserByEmailAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<AuthenticationMethod>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("Firebase: create failed"));

            var command = new UpdateUserCommand(
                UserId: user.Id,
                RoleName: "Athlete",
                FirstName: "Test",
                LastName: "User",
                Email: "new@example.com",
                PhoneNumber: null,
                NewAuthMethod: AuthenticationMethod.Credentials,
                DateOfBirth: new DateOnly(2010, 1, 1)
            );

            var act = () => Sut.AdminUpdateUserAsync(command);

            // Exception propagates so the caller knows the operation needs retry
            await act.Should().ThrowAsync<InvalidOperationException>();
        }
    }
}
