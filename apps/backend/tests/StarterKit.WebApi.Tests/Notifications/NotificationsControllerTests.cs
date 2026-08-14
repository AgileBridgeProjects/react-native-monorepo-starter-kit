using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Notifications;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Enums;
using StarterKit.Core.Notifications.Exceptions;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.WebApi.Notifications.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Notifications;

public abstract class NotificationsControllerTests : WebApiIntegrationTestBase
{
    protected NotificationsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<ICommunicationsService> serviceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<ICommunicationsService>(_ => serviceMock.Object);
        });
    }

    // ── POST /api/notifications/send-email ───────────────────────────────────

    public sealed class SendEmail_HappyPath : NotificationsControllerTests
    {
        public SendEmail_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendEmailAsync_ValidRequest_Returns200WithResult()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<ICommunicationsService>();
            serviceMock
                .Setup(s =>
                    s.SendEmailAsync(
                        It.Is<SendEmailCommand>(c =>
                            c.ClubIds.Contains(clubId)
                            && c.Subject == "Hello Team"
                            && c.Message == "Important update!"
                        ),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new DispatchResult(10, 10, 0));

            var client = CreateClient(serviceMock);

            var request = new SendEmailRequest(
                ClubIds: [clubId],
                TeamIds: null,
                Subject: "Hello Team",
                Message: "Important update!",
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-email",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<SendEmailResponse>(JsonOptions);
            body!.TotalRecipients.Should().Be(10);
            body.Delivered.Should().Be(10);
            body.Failed.Should().Be(0);
        }
    }

    public sealed class SendEmail_MissingRequiredFields : NotificationsControllerTests
    {
        public SendEmail_MissingRequiredFields(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendEmailAsync_EmptySubject_Returns400()
        {
            var client = CreateClientWithAuth();

            var request = new SendEmailRequest(
                ClubIds: [Guid.NewGuid()],
                TeamIds: null,
                Subject: "",
                Message: "Some message",
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-email",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SendEmailAsync_EmptyMessage_Returns400()
        {
            var client = CreateClientWithAuth();

            var request = new SendEmailRequest(
                ClubIds: [Guid.NewGuid()],
                TeamIds: null,
                Subject: "Subject",
                Message: "",
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-email",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class SendEmail_WithAttachments : NotificationsControllerTests
    {
        public SendEmail_WithAttachments(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendEmailAsync_WithAttachments_ForwardsAttachmentsToService()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<ICommunicationsService>();
            serviceMock
                .Setup(s =>
                    s.SendEmailAsync(
                        It.Is<SendEmailCommand>(c =>
                            c.Attachments != null
                            && c.Attachments.Count == 1
                            && c.Attachments[0].FileName == "report.pdf"
                        ),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new DispatchResult(5, 5, 0));

            var client = CreateClient(serviceMock);

            var request = new SendEmailRequest(
                ClubIds: [clubId],
                TeamIds: null,
                Subject: "Report",
                Message: "Please find the attached report.",
                Attachments: [new AttachmentRequest("application/pdf", "report.pdf", "dGVzdA==")]
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-email",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            serviceMock.Verify(
                s =>
                    s.SendEmailAsync(
                        It.Is<SendEmailCommand>(c =>
                            c.Attachments != null && c.Attachments[0].FileName == "report.pdf"
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── POST /api/notifications/send-sms ─────────────────────────────────────

    public sealed class SendSms_HappyPath : NotificationsControllerTests
    {
        public SendSms_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendSmsAsync_ValidRequest_Returns200WithResult()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<ICommunicationsService>();
            serviceMock
                .Setup(s =>
                    s.SendSmsAsync(
                        It.Is<SendSmsCommand>(c =>
                            c.ClubIds.Contains(clubId) && c.Message == "Important SMS update!"
                        ),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new DispatchResult(8, 8, 0));

            var client = CreateClient(serviceMock);

            var request = new SendSmsRequest(
                ClubIds: [clubId],
                TeamIds: null,
                Message: "Important SMS update!"
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-sms",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<SendSmsResponse>(JsonOptions);
            body!.TotalRecipients.Should().Be(8);
            body.Delivered.Should().Be(8);
            body.Failed.Should().Be(0);
        }
    }

    public sealed class SendSms_MissingRequiredFields : NotificationsControllerTests
    {
        public SendSms_MissingRequiredFields(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendSmsAsync_EmptyMessage_Returns400()
        {
            var client = CreateClientWithAuth();

            var request = new SendSmsRequest(ClubIds: [Guid.NewGuid()], TeamIds: null, Message: "");

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-sms",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SendSmsAsync_MessageOver160Characters_Returns400()
        {
            var client = CreateClientWithAuth();

            var request = new SendSmsRequest(
                ClubIds: [Guid.NewGuid()],
                TeamIds: null,
                Message: new string('x', SmsLimits.MaxMessageLength + 1)
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-sms",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class SendSms_DomainExceptions : NotificationsControllerTests
    {
        public SendSms_DomainExceptions(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendSmsAsync_NoEligibleRecipients_Returns400()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<ICommunicationsService>();
            serviceMock
                .Setup(s =>
                    s.SendSmsAsync(It.IsAny<SendSmsCommand>(), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(new NoEligibleRecipientsException(NotificationChannel.Sms));

            var client = CreateClient(serviceMock);

            var request = new SendSmsRequest(
                ClubIds: [clubId],
                TeamIds: null,
                Message: "Valid message"
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/send-sms",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
