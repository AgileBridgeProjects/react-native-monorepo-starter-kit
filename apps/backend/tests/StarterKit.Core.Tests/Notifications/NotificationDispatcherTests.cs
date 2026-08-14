using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Core.Notifications.Services;
using StarterKit.Core.Tests.Notifications.Helpers;

namespace StarterKit.Core.Tests.Notifications;

public abstract class NotificationDispatcherTests
{
    protected readonly Mock<IEmailSender> EmailSenderMock = new();
    protected readonly Mock<ISmsSender> SmsSenderMock = new();
    protected readonly NotificationDispatcher Sut;

    protected NotificationDispatcherTests()
    {
        Sut = new NotificationDispatcher(
            EmailSenderMock.Object,
            SmsSenderMock.Object,
            NullLogger<NotificationDispatcher>.Instance
        );
    }

    // ── concrete notification stubs ──────────────────────────────────────────

    private sealed class EmailOnlyNotification : Notification
    {
        public override NotificationChannel SupportedChannels => NotificationChannel.Email;

        public override EmailPayload BuildEmail() => NotificationTestHelpers.FakeEmailPayload();
    }

    private sealed class SmsOnlyNotification : Notification
    {
        public override NotificationChannel SupportedChannels => NotificationChannel.Sms;

        public override SmsPayload BuildSms() => NotificationTestHelpers.FakeSmsPayload();
    }

    private sealed class DualChannelNotification : Notification
    {
        public override NotificationChannel SupportedChannels => NotificationChannel.All;

        public override EmailPayload BuildEmail() => NotificationTestHelpers.FakeEmailPayload();

        public override SmsPayload BuildSms() => NotificationTestHelpers.FakeSmsPayload();
    }

    // ── channel routing — default (no override) ──────────────────────────────

    public sealed class WhenEmailOnlyNotificationSentWithFullRecipient : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_EmailOnly_CallsEmailSenderOnce()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new EmailOnlyNotification(), recipient);

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), recipient.Email!, default),
                Times.Once
            );
        }

        [Fact]
        public async Task SendAsync_EmailOnly_NeverCallsSmsSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new EmailOnlyNotification(), recipient);

            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
        }
    }

    public sealed class WhenSmsOnlyNotificationSentWithFullRecipient : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_SmsOnly_CallsSmsSenderOnce()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new SmsOnlyNotification(), recipient);

            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), recipient.PhoneNumber!, default),
                Times.Once
            );
        }

        [Fact]
        public async Task SendAsync_SmsOnly_NeverCallsEmailSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new SmsOnlyNotification(), recipient);

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
        }
    }

    public sealed class WhenDualChannelNotificationSentWithFullRecipient
        : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_DualChannel_CallsBothSenders()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new DualChannelNotification(), recipient);

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), recipient.Email!, default),
                Times.Once
            );
            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), recipient.PhoneNumber!, default),
                Times.Once
            );
        }
    }

    // ── call-site channel override ────────────────────────────────────────────

    public sealed class WhenDualChannelNotificationOverriddenToEmailOnly
        : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_EmailOverride_CallsOnlyEmailSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(
                new DualChannelNotification(),
                recipient,
                NotificationChannel.Email
            );

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default),
                Times.Once
            );
            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
        }
    }

    public sealed class WhenDualChannelNotificationOverriddenToSmsOnly : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_SmsOverride_CallsOnlySmsSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new DualChannelNotification(), recipient, NotificationChannel.Sms);

            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default),
                Times.Once
            );
            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
        }
    }

    public sealed class WhenEmailOnlyNotificationOverriddenToSmsOnly : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_IntersectionEmpty_CallsNoSenders()
        {
            // Email-only notification requested on SMS-only channel — intersection is None
            var recipient = NotificationTestHelpers.FakeRecipient(withEmail: true, withPhone: true);
            await Sut.SendAsync(new EmailOnlyNotification(), recipient, NotificationChannel.Sms);

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
        }
    }

    // ── null recipient fields ─────────────────────────────────────────────────

    public sealed class WhenRecipientHasNoEmail : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_DualChannel_NoEmail_SkipsEmailSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(
                withEmail: false,
                withPhone: true
            );
            await Sut.SendAsync(new DualChannelNotification(), recipient);

            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), recipient.PhoneNumber!, default),
                Times.Once
            );
        }
    }

    public sealed class WhenRecipientHasNoPhoneNumber : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_DualChannel_NoPhone_SkipsSmsSender()
        {
            var recipient = NotificationTestHelpers.FakeRecipient(
                withEmail: true,
                withPhone: false
            );
            await Sut.SendAsync(new DualChannelNotification(), recipient);

            SmsSenderMock.Verify(
                x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default),
                Times.Never
            );
            EmailSenderMock.Verify(
                x => x.SendAsync(It.IsAny<EmailPayload>(), recipient.Email!, default),
                Times.Once
            );
        }
    }

    // ── exception propagation ─────────────────────────────────────────────────

    public sealed class WhenSenderThrows : NotificationDispatcherTests
    {
        [Fact]
        public async Task SendAsync_EmailSenderThrows_PropagatesException()
        {
            EmailSenderMock
                .Setup(x => x.SendAsync(It.IsAny<EmailPayload>(), It.IsAny<string>(), default))
                .ThrowsAsync(new InvalidOperationException("Resend API down"));

            var recipient = NotificationTestHelpers.FakeRecipient(
                withEmail: true,
                withPhone: false
            );
            var act = () => Sut.SendAsync(new EmailOnlyNotification(), recipient);

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Resend*");
        }

        [Fact]
        public async Task SendAsync_SmsSenderThrows_PropagatesException()
        {
            SmsSenderMock
                .Setup(x => x.SendAsync(It.IsAny<SmsPayload>(), It.IsAny<string>(), default))
                .ThrowsAsync(new InvalidOperationException("Twilio API down"));

            var recipient = NotificationTestHelpers.FakeRecipient(
                withEmail: false,
                withPhone: true
            );
            var act = () => Sut.SendAsync(new SmsOnlyNotification(), recipient);

            await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*Twilio*");
        }
    }
}
