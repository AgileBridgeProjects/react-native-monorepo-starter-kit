using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;
using StarterKit.Core.Configuration;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Resources;
using StarterKit.Core.Services;
using StarterKit.Core.Storage;
using StarterKit.Core.Storage.Interfaces;
using StarterKit.Core.Users.Interfaces.Services;
using StarterKit.Data.AccountSetup.Interfaces.Repositories;
using StarterKit.Data.Clubs.Interfaces.Repositories;
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

/// <summary>
/// Avatar/photo/team-logo upload validation and orchestration, moved into
/// <see cref="UserService"/> from the MobileApi controller (the identity split post-review hardening —
/// business logic belongs in Core, not the controller).
/// </summary>
public class ImageUploadServiceTests
{
    private readonly Mock<IBlobStorageService> _blobServiceMock = new();
    private readonly UserService _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public ImageUploadServiceTests()
    {
        _sut = new UserService(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            TimeProvider.System,
            Mock.Of<ILogger<UserService>>(),
            Mock.Of<IUserRepository>(),
            Mock.Of<IRoleRepository>(),
            Mock.Of<IClubRepository>(),
            Mock.Of<ITeamRepository>(),
            _blobServiceMock.Object,
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            Mock.Of<IUserSetupTokenRepository>(),
            Mock.Of<ISetupEmailService>(),
            Options.Create(new AccountSetupOptions { PortalBaseUrl = "http://localhost:3000" }),
            Options.Create(new UserServiceOptions()),
            Mock.Of<IUserBulkUploadExcelParserService>(),
            Mock.Of<IUserExportExcelService>()
        );
    }

    private static async Task<UploadedFile> BuildJpegAsync(long? contentLengthOverride = null)
    {
        using var image = new Image<Rgba32>(2, 2);
        using var stream = new MemoryStream();
        await image.SaveAsync(stream, new JpegEncoder());
        var bytes = stream.ToArray();

        return new UploadedFile(
            "photo.jpg",
            "image/jpeg",
            contentLengthOverride ?? bytes.Length,
            new MemoryStream(bytes)
        );
    }

    [Fact]
    public async Task UploadAvatarAsync_WhenFileIsValid_UploadsAndReturnsPathAndUrl()
    {
        var file = await BuildJpegAsync();
        _blobServiceMock
            .Setup(s =>
                s.UploadAsync(
                    BlobContainerName.UserAvatars,
                    It.IsAny<string>(),
                    file,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync($"{BlobContainerName.UserAvatars}/{_userId}/avatar.jpg");
        _blobServiceMock
            .Setup(s => s.ResolveStoredPathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://blob.example/avatar.jpg?sas");

        var (storedPath, url) = await _sut.UploadAvatarAsync(_userId, file);

        storedPath.Should().Be($"{BlobContainerName.UserAvatars}/{_userId}/avatar.jpg");
        url.Should().Be("https://blob.example/avatar.jpg?sas");
    }

    [Fact]
    public async Task UploadAvatarAsync_WhenFileIsEmpty_ThrowsArgumentException()
    {
        var file = await BuildJpegAsync(contentLengthOverride: 0);

        var act = () => _sut.UploadAvatarAsync(_userId, file);

        await act.Should().ThrowAsync<ArgumentException>();
        _blobServiceMock.Verify(
            s =>
                s.UploadAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<UploadedFile>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task UploadAvatarAsync_WhenFileExceedsMaxSize_ThrowsArgumentException()
    {
        var file = new UploadedFile(
            "big.jpg",
            "image/jpeg",
            6 * 1024 * 1024, // over the 5 MiB avatar cap
            new MemoryStream([0xFF, 0xD8, 0xFF])
        );

        var act = () => _sut.UploadAvatarAsync(_userId, file);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UploadAvatarAsync_WhenContentTypeNotAllowed_ThrowsArgumentException()
    {
        var file = new UploadedFile(
            "doc.pdf",
            "application/pdf",
            100,
            new MemoryStream([0x25, 0x50, 0x44, 0x46])
        );

        var act = () => _sut.UploadAvatarAsync(_userId, file);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task UploadAvatarAsync_WhenBytesDoNotMatchDeclaredContentType_ThrowsArgumentException()
    {
        // Declares JPEG but the bytes are plain text — a spoofed Content-Type header.
        var file = new UploadedFile(
            "fake.jpg",
            "image/jpeg",
            11,
            new MemoryStream("not an image"u8.ToArray())
        );

        var act = () => _sut.UploadAvatarAsync(_userId, file);

        await act.Should().ThrowAsync<ArgumentException>();
        _blobServiceMock.Verify(
            s =>
                s.UploadAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<UploadedFile>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task UploadTeamLogoImageAsync_WhenFileIsValid_UploadsToClubLogosContainer()
    {
        var teamId = Guid.NewGuid();
        var file = await BuildJpegAsync();
        _blobServiceMock
            .Setup(s =>
                s.UploadAsync(
                    BlobContainerName.ClubLogos,
                    It.IsAny<string>(),
                    file,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync($"{BlobContainerName.ClubLogos}/{teamId}/logo.jpg");
        _blobServiceMock
            .Setup(s => s.ResolveStoredPathAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://blob.example/logo.jpg?sas");

        var (storedPath, _) = await _sut.UploadTeamLogoImageAsync(teamId, file);

        storedPath.Should().Be($"{BlobContainerName.ClubLogos}/{teamId}/logo.jpg");
        _blobServiceMock.Verify(
            s =>
                s.UploadAsync(
                    BlobContainerName.ClubLogos,
                    It.IsAny<string>(),
                    file,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }
}
