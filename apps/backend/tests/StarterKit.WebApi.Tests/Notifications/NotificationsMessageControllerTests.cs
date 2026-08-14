using System.Net;
using System.Net.Http.Json;
using Bogus;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Notifications.DTOs;
using StarterKit.Core.Notifications.Interfaces.Services;
using StarterKit.Data.Notifications.Enums;
using StarterKit.Data.Notifications.Models;
using StarterKit.WebApi.Notifications.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Notifications;

public abstract class NotificationsMessageControllerTests : WebApiIntegrationTestBase
{
    protected static readonly Faker TestFaker = new();

    protected NotificationsMessageControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(
        Mock<INotificationMessageService>? messageServiceMock = null,
        Mock<ICommunicationsService>? communicationsServiceMock = null
    )
    {
        return CreateClientWithAuth(services =>
        {
            if (messageServiceMock is not null)
                services.AddScoped<INotificationMessageService>(_ => messageServiceMock.Object);
            if (communicationsServiceMock is not null)
                services.AddScoped<ICommunicationsService>(_ => communicationsServiceMock.Object);
        });
    }

    protected static NotificationMessage BuildEntity(
        Guid? id = null,
        Guid? clubId = null,
        NotificationStatus status = NotificationStatus.Draft
    ) =>
        new()
        {
            Id = id ?? Guid.NewGuid(),
            Subject = TestFaker.Lorem.Sentence(3),
            Message = TestFaker.Lorem.Paragraph(),
            Channel = MessageChannel.Email,
            ClubId = clubId ?? Guid.NewGuid(),
            TeamId = null,
            Status = status,
            Attachments = [],
            CreatedAt = DateTime.UtcNow,
        };

    // ── GET /api/notifications/messages ──────────────────────────────────────

    public sealed class ListMessages : NotificationsMessageControllerTests
    {
        public ListMessages(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ListMessagesAsync_Returns200WithPagedList()
        {
            var clubId = Guid.NewGuid();
            var messages = new[] { BuildEntity(clubId: clubId), BuildEntity(clubId: clubId) };
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s =>
                    s.ListAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<int>(),
                        It.IsAny<int>(),
                        It.IsAny<NotificationStatus?>(),
                        It.IsAny<MessageChannel?>(),
                        It.IsAny<string?>(),
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new PagedResult<NotificationMessage>
                    {
                        Items = messages,
                        TotalCount = 2,
                        Page = 1,
                        PageSize = 25,
                    }
                );

            var client = CreateClient(messageServiceMock: serviceMock);

            var response = await client.GetAsync($"/api/notifications/messages?ClubId={clubId}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<NotificationMessageListResponse>(
                JsonOptions
            );
            body!.Items.Should().HaveCount(2);
            body.TotalCount.Should().Be(2);
        }
    }

    // ── GET /api/notifications/messages/{id} ─────────────────────────────────

    public sealed class GetMessage : NotificationsMessageControllerTests
    {
        public GetMessage(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMessageAsync_ExistingId_Returns200()
        {
            var entity = BuildEntity();
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s => s.GetAsync(entity.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(entity);

            var client = CreateClient(messageServiceMock: serviceMock);

            var response = await client.GetAsync($"/api/notifications/messages/{entity.Id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<NotificationMessageResponse>(
                JsonOptions
            );
            body!.Id.Should().Be(entity.Id);
            body.Subject.Should().Be(entity.Subject);
        }
    }

    // ── POST /api/notifications/messages ─────────────────────────────────────

    public sealed class CreateMessage : NotificationsMessageControllerTests
    {
        public CreateMessage(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task CreateMessageAsync_ValidRequest_Returns201()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s =>
                    s.CreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<MessageChannel>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<IReadOnlyList<AttachmentInput>?>(),
                        It.IsAny<AttachmentInput?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(BuildEntity(clubId: clubId));

            var client = CreateClient(messageServiceMock: serviceMock);

            var request = new CreateNotificationMessageRequest(
                Subject: "Test",
                Message: "Hello",
                Channel: MessageChannel.Email,
                ClubId: clubId,
                TeamId: null,
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/messages",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task CreateMessageAsync_EmptySubject_Returns400()
        {
            var client = CreateClient();

            var request = new CreateNotificationMessageRequest(
                Subject: "",
                Message: "Hello",
                Channel: MessageChannel.Email,
                ClubId: Guid.NewGuid(),
                TeamId: null,
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/messages",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task CreateMessageAsync_InAppChannel_Returns201()
        {
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s =>
                    s.CreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        MessageChannel.InApp,
                        It.IsAny<Guid>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<IReadOnlyList<AttachmentInput>?>(),
                        It.IsAny<AttachmentInput?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(BuildEntity(clubId: clubId));

            var client = CreateClient(messageServiceMock: serviceMock);

            var request = new CreateNotificationMessageRequest(
                Subject: "Notice",
                Message: "Open the app to read this notice.",
                Channel: MessageChannel.InApp,
                ClubId: clubId,
                TeamId: null,
                Attachments: null
            );

            var response = await client.PostAsJsonAsync(
                "/api/notifications/messages",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }
    }

    // ── PUT /api/notifications/messages/{id} ─────────────────────────────────

    public sealed class UpdateMessage : NotificationsMessageControllerTests
    {
        public UpdateMessage(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdateMessageAsync_ValidRequest_Returns200()
        {
            var entity = BuildEntity();
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        entity.Id,
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<MessageChannel>(),
                        It.IsAny<Guid>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<IReadOnlyList<AttachmentInput>?>(),
                        It.IsAny<AttachmentInput?>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(entity);

            var client = CreateClient(messageServiceMock: serviceMock);

            var request = new UpdateNotificationMessageRequest(
                Subject: "Updated",
                Message: "Updated body",
                Channel: MessageChannel.Email,
                ClubId: entity.ClubId,
                TeamId: null,
                Attachments: null
            );

            var response = await client.PutAsJsonAsync(
                $"/api/notifications/messages/{entity.Id}",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ── DELETE /api/notifications/messages/{id} ──────────────────────────────

    public sealed class DeleteMessage : NotificationsMessageControllerTests
    {
        public DeleteMessage(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task DeleteMessageAsync_Returns204()
        {
            var id = Guid.NewGuid();
            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s => s.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(messageServiceMock: serviceMock);

            var response = await client.DeleteAsync($"/api/notifications/messages/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    // ── POST /api/notifications/messages/{id}/send ───────────────────────────

    public sealed class SendMessage : NotificationsMessageControllerTests
    {
        public SendMessage(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SendMessageAsync_Returns202WithUpdatedEntity()
        {
            var entity = BuildEntity(status: NotificationStatus.Sending);
            entity.BackgroundJobId = "job-456";

            var serviceMock = new Mock<INotificationMessageService>();

            serviceMock
                .Setup(s =>
                    s.SendAsync(
                        entity.Id,
                        It.IsAny<IReadOnlyList<EmailAttachment>?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(entity);

            var client = CreateClient(messageServiceMock: serviceMock);

            var response = await client.PostAsJsonAsync(
                $"/api/notifications/messages/{entity.Id}/send",
                (SendNotificationRequest?)null,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Accepted);

            var body = await response.Content.ReadFromJsonAsync<NotificationMessageResponse>(
                JsonOptions
            );
            body!.Status.Should().Be(NotificationStatus.Sending);
        }
    }
}
