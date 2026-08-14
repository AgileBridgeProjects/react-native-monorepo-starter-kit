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
using StarterKit.Data.Persistence.Entities;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

public abstract class RemoveAvatarServiceTests
{
    protected readonly Mock<IUserRepository> UserRepositoryMock = new();
    protected readonly Mock<IBlobStorageService> BlobServiceMock = new();
    protected readonly UserService Sut;

    protected RemoveAvatarServiceTests()
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

    // ── RemoveAvatarAsync ─────────────────────────────────────────────────────

    public sealed class RemoveAvatar_WhenUserNotFound : RemoveAvatarServiceTests
    {
        [Fact]
        public async Task RemoveAvatarAsync_WhenUserDoesNotExist_ThrowsEntityNotFoundException()
        {
            var userId = Guid.NewGuid();
            UserRepositoryMock
                .Setup(r => r.FindByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync((UserEntity?)null);

            var act = () => Sut.RemoveAvatarAsync(userId);

            await act.Should().ThrowAsync<EntityNotFoundException>();
            BlobServiceMock.Verify(
                s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class RemoveAvatar_WhenUserHasAvatar : RemoveAvatarServiceTests
    {
        [Fact]
        public async Task RemoveAvatarAsync_WhenAvatarExists_DeletesBlobAndClearsDbRef()
        {
            var userId = Guid.NewGuid();
            const string avatarUrl = "https://example.com/avatar.jpg";
            var user = new UserEntity { Id = userId, AvatarUrl = avatarUrl };

            UserRepositoryMock
                .Setup(r => r.FindByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            BlobServiceMock
                .Setup(s => s.DeleteAsync(avatarUrl, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);
            UserRepositoryMock
                .Setup(r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.RemoveAvatarAsync(userId);

            BlobServiceMock.Verify(
                s => s.DeleteAsync(avatarUrl, It.IsAny<CancellationToken>()),
                Times.Once
            );
            UserRepositoryMock.Verify(
                r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class RemoveAvatar_WhenBlobDeleteFails : RemoveAvatarServiceTests
    {
        [Fact]
        public async Task RemoveAvatarAsync_WhenBlobDeleteFails_StillClearsDbRef()
        {
            var userId = Guid.NewGuid();
            const string avatarUrl = "https://example.com/avatar.jpg";
            var user = new UserEntity { Id = userId, AvatarUrl = avatarUrl };

            UserRepositoryMock
                .Setup(r => r.FindByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            BlobServiceMock
                .Setup(s => s.DeleteAsync(avatarUrl, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Blob storage unreachable"));
            UserRepositoryMock
                .Setup(r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            // Best-effort: blob failure must NOT propagate
            await Sut.RemoveAvatarAsync(userId);

            UserRepositoryMock.Verify(
                r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class RemoveAvatar_WhenNoAvatarSet : RemoveAvatarServiceTests
    {
        [Fact]
        public async Task RemoveAvatarAsync_WhenNoAvatarSet_SkipsBlobDeleteAndClearsRef()
        {
            var userId = Guid.NewGuid();
            var user = new UserEntity { Id = userId, AvatarUrl = null };

            UserRepositoryMock
                .Setup(r => r.FindByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            UserRepositoryMock
                .Setup(r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            await Sut.RemoveAvatarAsync(userId);

            BlobServiceMock.Verify(
                s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
            UserRepositoryMock.Verify(
                r => r.UpdateAvatarUrlAsync(userId, null, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }
}
