using Bogus;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Core.PushNotifications.Services;
using StarterKit.Data.DeviceTokens.Enums;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.Data.DeviceTokens.Models;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.Data.PushNotifications.Models;

namespace StarterKit.Core.Tests.PushNotifications.Services;

public abstract class PushNotificationsServiceTests
{
    private static readonly Faker Faker = new();

    private readonly Mock<IPushNotificationRepository> _repoMock = new();
    private readonly Mock<IDeviceTokenRepository> _deviceTokenMock = new();
    private readonly Mock<INotificationBroadcaster> _broadcasterMock = new();

    protected IPushNotificationsService Sut =>
        new PushNotificationsService(
            _repoMock.Object,
            _deviceTokenMock.Object,
            [],
            _broadcasterMock.Object,
            TimeProvider.System,
            Mock.Of<ILogger<PushNotificationsService>>()
        );

    protected void SetupCreateReturns(Guid id) =>
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<PushNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(id);

    protected void SetupNoDeviceTokens() =>
        _deviceTokenMock
            .Setup(r =>
                r.GetByUserIdsAsync(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync([]);

    protected void VerifyBroadcast(Guid userId, Times times) =>
        _broadcasterMock.Verify(
            b =>
                b.BroadcastAsync(
                    userId,
                    It.IsAny<PushNotificationType>(),
                    It.IsAny<CancellationToken>()
                ),
            times
        );

    // ─── CreateAndDeliverAsync ───────────────────────────────────────────────

    public sealed class CreateAndDeliverAsync_BroadcastsToUser : PushNotificationsServiceTests
    {
        [Fact]
        public async Task CreateAndDeliverAsync_AfterCreatingNotification_BroadcastsToUser()
        {
            var userId = Guid.NewGuid();
            SetupCreateReturns(Guid.NewGuid());
            SetupNoDeviceTokens();

            await Sut.CreateAndDeliverAsync(
                userId,
                PushNotificationType.NewContent,
                Faker.Lorem.Word(),
                Faker.Lorem.Sentence()
            );

            VerifyBroadcast(userId, Times.Once());
        }

        [Fact]
        public async Task CreateAndDeliverAsync_WhenBroadcastFails_DoesNotThrow()
        {
            var userId = Guid.NewGuid();
            SetupCreateReturns(Guid.NewGuid());
            SetupNoDeviceTokens();
            _broadcasterMock
                .Setup(b =>
                    b.BroadcastAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<PushNotificationType>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("SignalR unavailable"));

            var act = () =>
                Sut.CreateAndDeliverAsync(
                    userId,
                    PushNotificationType.NewContent,
                    Faker.Lorem.Word(),
                    Faker.Lorem.Sentence()
                );

            await act.Should().NotThrowAsync();
        }
    }

    // ─── CreateAsync ─────────────────────────────────────────────────────────

    public sealed class CreateAsync_StoresNotification : PushNotificationsServiceTests
    {
        [Fact]
        public async Task CreateAsync_ReturnsIdFromRepository()
        {
            var expectedId = Guid.NewGuid();
            SetupCreateReturns(expectedId);

            var result = await Sut.CreateAsync(
                Guid.NewGuid(),
                PushNotificationType.NewContent,
                "Title",
                "Body"
            );

            result.Should().Be(expectedId);
        }
    }

    // ─── DeliverTransientBulkAsync ───────────────────────────────────────────

    public sealed class DeliverTransientBulkAsync_Tests : PushNotificationsServiceTests
    {
        private readonly Mock<IPushSender> _senderMock = new();
        private IPushNotificationsService BulkSut =>
            new PushNotificationsService(
                _repoMock.Object,
                _deviceTokenMock.Object,
                [_senderMock.Object],
                _broadcasterMock.Object,
                TimeProvider.System,
                Mock.Of<ILogger<PushNotificationsService>>()
            );

        public DeliverTransientBulkAsync_Tests() =>
            _senderMock.Setup(s => s.Platform).Returns(PushPlatform.iOS);

        [Fact]
        public async Task WhenNoNotifications_DoesNotQueryDeviceTokens()
        {
            await BulkSut.DeliverTransientBulkAsync([], PushNotificationType.WeeklyNudge);

            _deviceTokenMock.Verify(
                r =>
                    r.GetByUserIdsAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task FetchesDeviceTokensOnceForTheWholeBatch_NotOncePerUser()
        {
            var userA = Guid.NewGuid();
            var userB = Guid.NewGuid();
            SetupNoDeviceTokens();

            await BulkSut.DeliverTransientBulkAsync(
                [(userA, "Title A", "Body A"), (userB, "Title B", "Body B")],
                PushNotificationType.WeeklyNudge
            );

            _deviceTokenMock.Verify(
                r =>
                    r.GetByUserIdsAsync(
                        It.Is<IReadOnlyList<Guid>>(ids =>
                            ids.Count == 2 && ids.Contains(userA) && ids.Contains(userB)
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task DeliversEachNotificationToItsOwnRecipientWithTheirOwnTitleAndBody()
        {
            var userA = Guid.NewGuid();
            var userB = Guid.NewGuid();
            _deviceTokenMock
                .Setup(r =>
                    r.GetByUserIdsAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([
                    new DeviceToken
                    {
                        UserId = userA,
                        Platform = PushPlatform.iOS,
                        Token = "token-a",
                    },
                    new DeviceToken
                    {
                        UserId = userB,
                        Platform = PushPlatform.iOS,
                        Token = "token-b",
                    },
                ]);

            await BulkSut.DeliverTransientBulkAsync(
                [(userA, "Title A", "Body A"), (userB, "Title B", "Body B")],
                PushNotificationType.WeeklyNudge
            );

            _senderMock.Verify(
                s =>
                    s.SendAsync(
                        "token-a",
                        It.Is<PushPayload>(p => p.Title == "Title A" && p.Body == "Body A"),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
            _senderMock.Verify(
                s =>
                    s.SendAsync(
                        "token-b",
                        It.Is<PushPayload>(p => p.Title == "Title B" && p.Body == "Body B"),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenOneUsersSendFails_StillSendsToOtherUsers()
        {
            var failingUser = Guid.NewGuid();
            var succeedingUser = Guid.NewGuid();
            _deviceTokenMock
                .Setup(r =>
                    r.GetByUserIdsAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([
                    new DeviceToken
                    {
                        UserId = failingUser,
                        Platform = PushPlatform.iOS,
                        Token = "failing-token",
                    },
                    new DeviceToken
                    {
                        UserId = succeedingUser,
                        Platform = PushPlatform.iOS,
                        Token = "succeeding-token",
                    },
                ]);
            _senderMock
                .Setup(s =>
                    s.SendAsync(
                        "failing-token",
                        It.IsAny<PushPayload>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("send failed"));

            var act = () =>
                BulkSut.DeliverTransientBulkAsync(
                    [(failingUser, "Title", "Body"), (succeedingUser, "Title", "Body")],
                    PushNotificationType.WeeklyNudge
                );

            await act.Should().NotThrowAsync();
            _senderMock.Verify(
                s =>
                    s.SendAsync(
                        "succeeding-token",
                        It.IsAny<PushPayload>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task WhenAUserHasNoDeviceTokens_SkipsThemWithoutError()
        {
            var userWithNoTokens = Guid.NewGuid();
            SetupNoDeviceTokens();

            var act = () =>
                BulkSut.DeliverTransientBulkAsync(
                    [(userWithNoTokens, "Title", "Body")],
                    PushNotificationType.WeeklyNudge
                );

            await act.Should().NotThrowAsync();
            _senderMock.Verify(
                s =>
                    s.SendAsync(
                        It.IsAny<string>(),
                        It.IsAny<PushPayload>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }
}
