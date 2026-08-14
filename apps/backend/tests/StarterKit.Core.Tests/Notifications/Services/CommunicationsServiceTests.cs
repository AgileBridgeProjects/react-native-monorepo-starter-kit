using Bogus;
using FluentAssertions;
using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;
using StarterKit.Core.Notifications.Exceptions;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Options;
using StarterKit.Core.Notifications.Services;
using StarterKit.Core.PushNotifications.Interfaces;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.Users.Interfaces.Repositories;

namespace StarterKit.Core.Tests.Notifications.Services;

public abstract class CommunicationsServiceTests
{
    private readonly Mock<IUserRepository> _userRepositoryMock = new();
    private readonly Mock<INotificationDispatcher> _dispatcherMock = new();
    private readonly Mock<IBackgroundJobClient> _backgroundJobClientMock = new();
    protected readonly ICommunicationsService Sut;
    protected static readonly Faker Faker = new();

    protected CommunicationsServiceTests()
    {
        _backgroundJobClientMock
            .Setup(c => c.Create(It.IsAny<Job>(), It.IsAny<IState>()))
            .Returns("job-id");

        Sut = new CommunicationsService(
            _userRepositoryMock.Object,
            _dispatcherMock.Object,
            _backgroundJobClientMock.Object,
            Options.Create(new CommunicationsOptions()),
            Mock.Of<ILogger<CommunicationsService>>()
        );
    }

    protected Mock<IUserRepository> UserRepositoryMock => _userRepositoryMock;
    protected Mock<INotificationDispatcher> DispatcherMock => _dispatcherMock;
    protected Mock<IBackgroundJobClient> BackgroundJobClientMock => _backgroundJobClientMock;

    protected void SetupEmails(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        params string[] emails
    )
    {
        UserRepositoryMock
            .Setup(r =>
                r.ListActiveEmailsByClubOrTeamAsync(
                    It.Is<IReadOnlyList<Guid>>(c => c.SequenceEqual(clubIds)),
                    It.Is<IReadOnlyList<Guid>>(d => d.SequenceEqual(teamIds)),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(emails.ToList());
    }

    protected void SetupPhones(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        params string[] phones
    )
    {
        UserRepositoryMock
            .Setup(r =>
                r.ListActivePhonesByClubOrTeamAsync(
                    It.Is<IReadOnlyList<Guid>>(c => c.SequenceEqual(clubIds)),
                    It.Is<IReadOnlyList<Guid>>(d => d.SequenceEqual(teamIds)),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(phones.ToList());
    }

    protected void SetupUserIds(
        IReadOnlyList<Guid> clubIds,
        IReadOnlyList<Guid> teamIds,
        params Guid[] userIds
    )
    {
        UserRepositoryMock
            .Setup(r =>
                r.ListActiveUserIdsByClubOrTeamAsync(
                    It.Is<IReadOnlyList<Guid>>(c => c.SequenceEqual(clubIds)),
                    It.Is<IReadOnlyList<Guid>>(d => d.SequenceEqual(teamIds)),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(userIds.ToList());
    }

    // ── Validation ───────────────────────────────────────────────────────────

    public sealed class Validation : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendEmailAsync_NoClubOrTeam_ThrowsInvalidRecipientsException()
        {
            var command = new SendEmailCommand(
                ClubIds: [],
                TeamIds: [],
                Subject: "Test",
                Message: "Hello"
            );

            var act = () => Sut.SendEmailAsync(command);

            await act.Should().ThrowAsync<InvalidRecipientsException>();
        }

        [Fact]
        public async Task SendEmailAsync_EmptyMessage_ThrowsEmptyMessageException()
        {
            var command = new SendEmailCommand(
                ClubIds: [Guid.NewGuid()],
                TeamIds: [],
                Subject: "Subject",
                Message: ""
            );

            var act = () => Sut.SendEmailAsync(command);

            await act.Should().ThrowAsync<EmptyMessageException>();
        }

        [Fact]
        public async Task SendEmailAsync_NoEligibleRecipients_ThrowsNoEligibleRecipientsException()
        {
            var clubId = Guid.NewGuid();
            SetupEmails([clubId], []); // empty list

            var command = new SendEmailCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Subject",
                Message: "Hello"
            );

            var act = () => Sut.SendEmailAsync(command);

            await act.Should()
                .ThrowAsync<NoEligibleRecipientsException>()
                .Where(e => e.Channel == NotificationChannel.Email);
        }
    }

    // ── Happy Path ───────────────────────────────────────────────────────────

    public sealed class HappyPath : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendEmailAsync_SendsToAllActiveUsersInClub()
        {
            var clubId = Guid.NewGuid();
            var emails = new[] { Faker.Internet.Email(), Faker.Internet.Email() };
            SetupEmails([clubId], [], emails);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendEmailCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Hello",
                Message: "<p>Content</p>"
            );

            var result = await Sut.SendEmailAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(2);
            result.Failed.Should().Be(0);
        }

        [Fact]
        public async Task SendEmailAsync_SendsToTeamRecipients()
        {
            var teamId = Guid.NewGuid();
            var emails = new[] { Faker.Internet.Email(), Faker.Internet.Email() };
            SetupEmails([], [teamId], emails);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendEmailCommand(
                ClubIds: [],
                TeamIds: [teamId],
                Subject: "Team Update",
                Message: "Info"
            );

            var result = await Sut.SendEmailAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(2);
        }
    }

    // ── Failure Scenarios ────────────────────────────────────────────────────

    public sealed class FailureScenarios : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendEmailAsync_DispatcherThrows_CountsAsFailed()
        {
            var clubId = Guid.NewGuid();
            var emails = new[]
            {
                Faker.Internet.Email(),
                Faker.Internet.Email(),
                Faker.Internet.Email(),
            };
            SetupEmails([clubId], [], emails);

            var callCount = 0;
            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(() =>
                {
                    if (Interlocked.Increment(ref callCount) == 2)
                        return Task.FromException(new InvalidOperationException("SMTP failure"));
                    return Task.CompletedTask;
                });

            var command = new SendEmailCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Test",
                Message: "Content"
            );

            var result = await Sut.SendEmailAsync(command);

            result.TotalRecipients.Should().Be(3);
            result.Delivered.Should().Be(2);
            result.Failed.Should().Be(1);
        }

        [Fact]
        public async Task SendEmailAsync_AllFail_ReturnsAllFailed()
        {
            var clubId = Guid.NewGuid();
            var emails = new[] { Faker.Internet.Email(), Faker.Internet.Email() };
            SetupEmails([clubId], [], emails);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("Service unavailable"));

            var command = new SendEmailCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Test",
                Message: "Content"
            );

            var result = await Sut.SendEmailAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(0);
            result.Failed.Should().Be(2);
        }
    }

    // ── Deduplication ────────────────────────────────────────────────────────

    public sealed class Deduplication : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendEmailAsync_DeduplicationHandledByRepository()
        {
            // Deduplication now happens at the DB level (DISTINCT) via
            // ListActiveEmailsByClubOrTeamAsync, so we just verify
            // that whatever the repo returns is dispatched correctly.
            var clubId = Guid.NewGuid();
            var teamId = Guid.NewGuid();
            var email = Faker.Internet.Email();

            UserRepositoryMock
                .Setup(r =>
                    r.ListActiveEmailsByClubOrTeamAsync(
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<IReadOnlyList<Guid>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new List<string> { email });

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendEmailCommand(
                ClubIds: [clubId],
                TeamIds: [teamId],
                Subject: "Test",
                Message: "Content"
            );

            var result = await Sut.SendEmailAsync(command);

            result.TotalRecipients.Should().Be(1);
            result.Delivered.Should().Be(1);

            DispatcherMock.Verify(
                d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── SMS Validation ───────────────────────────────────────────────────────

    public sealed class SmsValidation : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendSmsAsync_NoClubOrTeam_ThrowsInvalidRecipientsException()
        {
            var command = new SendSmsCommand(ClubIds: [], TeamIds: [], Message: "Hello");

            var act = () => Sut.SendSmsAsync(command);

            await act.Should().ThrowAsync<InvalidRecipientsException>();
        }

        [Fact]
        public async Task SendSmsAsync_EmptyMessage_ThrowsEmptyMessageException()
        {
            var command = new SendSmsCommand(ClubIds: [Guid.NewGuid()], TeamIds: [], Message: "");

            var act = () => Sut.SendSmsAsync(command);

            await act.Should().ThrowAsync<EmptyMessageException>();
        }

        [Fact]
        public async Task SendSmsAsync_MessageTooLong_ThrowsSmsMessageTooLongException()
        {
            var command = new SendSmsCommand(
                ClubIds: [Guid.NewGuid()],
                TeamIds: [],
                Message: new string('x', SmsLimits.MaxMessageLength + 1)
            );

            var act = () => Sut.SendSmsAsync(command);

            await act.Should()
                .ThrowAsync<SmsMessageTooLongException>()
                .Where(e =>
                    e.ActualLength == SmsLimits.MaxMessageLength + 1
                    && e.MaxLength == SmsLimits.MaxMessageLength
                );
        }

        [Fact]
        public async Task SendSmsAsync_NoEligibleRecipients_ThrowsNoEligibleRecipientsException()
        {
            var clubId = Guid.NewGuid();
            SetupPhones([clubId], []); // empty list

            var command = new SendSmsCommand(ClubIds: [clubId], TeamIds: [], Message: "Hello");

            var act = () => Sut.SendSmsAsync(command);

            await act.Should()
                .ThrowAsync<NoEligibleRecipientsException>()
                .Where(e => e.Channel == NotificationChannel.Sms);
        }
    }

    // ── SMS Happy Path ───────────────────────────────────────────────────────

    public sealed class SmsHappyPath : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendSmsAsync_SendsToAllActiveUsersInClub()
        {
            var clubId = Guid.NewGuid();
            var phones = new[]
            {
                Faker.Phone.PhoneNumber("+27#########"),
                Faker.Phone.PhoneNumber("+27#########"),
            };
            SetupPhones([clubId], [], phones);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendSmsCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Message: "Important update"
            );

            var result = await Sut.SendSmsAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(2);
            result.Failed.Should().Be(0);
        }

        [Fact]
        public async Task SendSmsAsync_SendsToTeamRecipients()
        {
            var teamId = Guid.NewGuid();
            var phones = new[]
            {
                Faker.Phone.PhoneNumber("+27#########"),
                Faker.Phone.PhoneNumber("+27#########"),
            };
            SetupPhones([], [teamId], phones);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendSmsCommand(
                ClubIds: [],
                TeamIds: [teamId],
                Message: "Team update"
            );

            var result = await Sut.SendSmsAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(2);
        }

        [Fact]
        public async Task SendSmsAsync_DispatchesWithPhoneNumberOnRecipient()
        {
            var clubId = Guid.NewGuid();
            var phone = "+27821234567";
            SetupPhones([clubId], [], phone);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.Is<NotificationRecipient>(r =>
                            r.PhoneNumber == phone && r.Email == null
                        ),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var command = new SendSmsCommand(ClubIds: [clubId], TeamIds: [], Message: "Test");

            await Sut.SendSmsAsync(command);

            DispatcherMock.Verify(
                d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.Is<NotificationRecipient>(r =>
                            r.PhoneNumber == phone && r.Email == null
                        ),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── SMS Failure Scenarios ────────────────────────────────────────────────

    public sealed class SmsFailureScenarios : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendSmsAsync_DispatcherThrows_CountsAsFailed()
        {
            var clubId = Guid.NewGuid();
            var phones = new[]
            {
                Faker.Phone.PhoneNumber("+27#########"),
                Faker.Phone.PhoneNumber("+27#########"),
                Faker.Phone.PhoneNumber("+27#########"),
            };
            SetupPhones([clubId], [], phones);

            var callCount = 0;
            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(() =>
                {
                    if (Interlocked.Increment(ref callCount) == 2)
                        return Task.FromException(new InvalidOperationException("Twilio failure"));
                    return Task.CompletedTask;
                });

            var command = new SendSmsCommand(ClubIds: [clubId], TeamIds: [], Message: "Content");

            var result = await Sut.SendSmsAsync(command);

            result.TotalRecipients.Should().Be(3);
            result.Delivered.Should().Be(2);
            result.Failed.Should().Be(1);
        }

        [Fact]
        public async Task SendSmsAsync_AllFail_ReturnsAllFailed()
        {
            var clubId = Guid.NewGuid();
            var phones = new[]
            {
                Faker.Phone.PhoneNumber("+27#########"),
                Faker.Phone.PhoneNumber("+27#########"),
            };
            SetupPhones([clubId], [], phones);

            DispatcherMock
                .Setup(d =>
                    d.SendAsync(
                        It.IsAny<Notification>(),
                        It.IsAny<NotificationRecipient>(),
                        It.IsAny<NotificationChannel?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new InvalidOperationException("Service unavailable"));

            var command = new SendSmsCommand(ClubIds: [clubId], TeamIds: [], Message: "Content");

            var result = await Sut.SendSmsAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(0);
            result.Failed.Should().Be(2);
        }
    }

    // ── In-App Validation ───────────────────────────────────────────────────

    public sealed class InAppValidation : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendInAppAsync_NoClubOrTeam_ThrowsInvalidRecipientsException()
        {
            var command = new SendInAppCommand(
                ClubIds: [],
                TeamIds: [],
                Subject: "Subject",
                Message: "Hello"
            );

            var act = () => Sut.SendInAppAsync(command);

            await act.Should().ThrowAsync<InvalidRecipientsException>();
        }

        [Fact]
        public async Task SendInAppAsync_EmptyMessage_ThrowsEmptyMessageException()
        {
            var command = new SendInAppCommand(
                ClubIds: [Guid.NewGuid()],
                TeamIds: [],
                Subject: "Subject",
                Message: ""
            );

            var act = () => Sut.SendInAppAsync(command);

            await act.Should().ThrowAsync<EmptyMessageException>();
        }

        [Fact]
        public async Task SendInAppAsync_NoEligibleRecipients_ThrowsNoEligibleRecipientsException()
        {
            var clubId = Guid.NewGuid();
            SetupUserIds([clubId], []);

            var command = new SendInAppCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Subject",
                Message: "Hello"
            );

            var act = () => Sut.SendInAppAsync(command);

            await act.Should()
                .ThrowAsync<NoEligibleRecipientsException>()
                .Where(e => e.Channel == NotificationChannel.InApp);
        }
    }

    // ── In-App Happy Path ───────────────────────────────────────────────────

    public sealed class InAppHappyPath : CommunicationsServiceTests
    {
        [Fact]
        public async Task SendInAppAsync_QueuesJobAndReportsAllDelivered()
        {
            var clubId = Guid.NewGuid();
            var userIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
            SetupUserIds([clubId], [], userIds);

            var command = new SendInAppCommand(
                ClubIds: [clubId],
                TeamIds: [],
                Subject: "Important update",
                Message: "Please read this update."
            );

            var result = await Sut.SendInAppAsync(command);

            result.TotalRecipients.Should().Be(2);
            result.Delivered.Should().Be(2);
            result.Failed.Should().Be(0);

            BackgroundJobClientMock.Verify(
                c =>
                    c.Create(
                        It.Is<Job>(job =>
                            job.Type == typeof(IContentAssignedDispatchJob)
                            && job.Method.Name == nameof(IContentAssignedDispatchJob.ExecuteAsync)
                            && job.Args[0].Equals(PushNotificationType.AdminMessage)
                            && job.Args[1].Equals(command.Subject)
                            && job.Args[2].Equals(command.Message)
                            && ((IReadOnlyList<Guid>)job.Args[3]).SequenceEqual(userIds)
                        ),
                        It.IsAny<IState>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task SendInAppAsync_TeamRecipients_QueuesJobAndReportsAllDelivered()
        {
            var teamId = Guid.NewGuid();
            SetupUserIds([], [teamId], Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

            var command = new SendInAppCommand(
                ClubIds: [],
                TeamIds: [teamId],
                Subject: "Dept update",
                Message: "Hello team."
            );

            var result = await Sut.SendInAppAsync(command);

            result.TotalRecipients.Should().Be(3);
            result.Delivered.Should().Be(3);
            result.Failed.Should().Be(0);

            BackgroundJobClientMock.Verify(
                c => c.Create(It.IsAny<Job>(), It.IsAny<IState>()),
                Times.Once
            );
        }
    }
}
