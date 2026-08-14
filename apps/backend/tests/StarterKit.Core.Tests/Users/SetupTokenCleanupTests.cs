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
using StarterKit.Data.Roles.Interfaces.Repositories;
using StarterKit.Data.Teams.Interfaces.Repositories;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Users;

/// <summary>
/// Unit tests for <see cref="UserService.CleanupSetupTokensAsync"/>.
/// Verifies the service computes the correct cutoff date and delegates to the repository.
/// </summary>
public abstract class SetupTokenCleanupTests
{
    protected static readonly DateTimeOffset DefaultNow = new(2026, 5, 20, 12, 0, 0, TimeSpan.Zero);

    protected readonly Mock<IUserSetupTokenRepository> SetupTokenRepoMock = new();
    protected readonly UserService Sut;

    protected SetupTokenCleanupTests()
    {
        Sut = BuildSut(tokenRetentionDays: 90, fixedNow: DefaultNow);
    }

    protected UserService BuildSut(int tokenRetentionDays, DateTimeOffset fixedNow) =>
        new(
            Mock.Of<IAuthClaimsService>(),
            Mock.Of<IAuthUserProvisioningService>(),
            new FixedTimeProvider(fixedNow),
            Mock.Of<ILogger<UserService>>(),
            Mock.Of<IUserRepository>(),
            Mock.Of<IRoleRepository>(),
            Mock.Of<IClubRepository>(),
            Mock.Of<ITeamRepository>(),
            Mock.Of<IBlobStorageService>(),
            Mock.Of<System.Net.Http.IHttpClientFactory>(),
            SetupTokenRepoMock.Object,
            Mock.Of<ISetupEmailService>(),
            Options.Create(
                new AccountSetupOptions
                {
                    PortalBaseUrl = "http://localhost:3000",
                    TokenRetentionDays = tokenRetentionDays,
                }
            ),
            Options.Create(new StarterKit.Core.Configuration.UserServiceOptions()),
            Mock.Of<IUserBulkUploadExcelParserService>(),
            Mock.Of<IUserExportExcelService>()
        );

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    public sealed class CleanupSetupTokensAsync : SetupTokenCleanupTests
    {
        [Fact]
        public async Task CallsDeleteWithCorrectCutoffDate()
        {
            // Arrange
            var expectedCutoff = DefaultNow.UtcDateTime.AddDays(-90);

            SetupTokenRepoMock
                .Setup(r =>
                    r.DeleteOlderThanAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(3);

            // Act
            await Sut.CleanupSetupTokensAsync();

            // Assert — cutoff must be exactly utcNow minus the configured retention days
            SetupTokenRepoMock.Verify(
                r => r.DeleteOlderThanAsync(expectedCutoff, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task UsesConfiguredRetentionDays()
        {
            // Arrange — 30-day retention instead of the default 90
            var sut30 = BuildSut(tokenRetentionDays: 30, fixedNow: DefaultNow);
            var expectedCutoff = DefaultNow.UtcDateTime.AddDays(-30);

            SetupTokenRepoMock
                .Setup(r =>
                    r.DeleteOlderThanAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(0);

            // Act
            await sut30.CleanupSetupTokensAsync();

            // Assert
            SetupTokenRepoMock.Verify(
                r => r.DeleteOlderThanAsync(expectedCutoff, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task CompletesWithoutThrowing_WhenNothingDeleted()
        {
            SetupTokenRepoMock
                .Setup(r =>
                    r.DeleteOlderThanAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(0);

            await Sut.Invoking(s => s.CleanupSetupTokensAsync()).Should().NotThrowAsync();
        }
    }
}
