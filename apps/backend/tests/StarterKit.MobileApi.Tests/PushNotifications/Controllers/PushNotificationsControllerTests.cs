using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Data.PushNotifications.Enums;
using StarterKit.Data.PushNotifications.Interfaces.Repositories;
using StarterKit.Data.PushNotifications.Models;
using StarterKit.MobileApi.PushNotifications.DTOs;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.PushNotifications.Controllers;

public abstract class PushNotificationsControllerTests : MobileApiIntegrationTestBase
{
    protected static readonly Guid TestUserId = Guid.Empty;

    protected PushNotificationsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IPushNotificationRepository> repoMock)
    {
        var client = CreateClientWithAuth(services =>
        {
            services.AddScoped<IPushNotificationRepository>(_ => repoMock.Object);
        });
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, TestUserId.ToString());
        return client;
    }

    private static PushNotification BuildNotification(bool isRead = false, Guid? userId = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId ?? TestUserId,
            NotificationType = PushNotificationType.NewContent,
            Title = "New game assigned",
            Body = "You have a new game to play",
            IsRead = isRead,
            CreatedAt = DateTime.UtcNow,
        };

    // ─── GET /api/push-notifications ──────────────────────────────────────────

    public sealed class GetNotifications_ReturnsPagedList : PushNotificationsControllerTests
    {
        public GetNotifications_ReturnsPagedList(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200WithPaginatedNotifications()
        {
            var notification = BuildNotification();
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.ListAsync(TestUserId, 1, 20, It.IsAny<CancellationToken>()))
                .ReturnsAsync(((IReadOnlyList<PushNotification>)[notification], 1, 1));

            var client = CreateClient(mock);
            var response = await client.GetAsync("/api/push-notifications");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var dto = await response.Content.ReadFromJsonAsync<PushNotificationListResponse>();
            dto.Should().NotBeNull();
            dto!.TotalCount.Should().Be(1);
            dto.UnreadCount.Should().Be(1);
            dto.Items.Should().HaveCount(1);
            dto.Items![0].Title.Should().Be(notification.Title);
        }

        [Fact]
        public async Task Returns401WhenNotAuthenticated()
        {
            var client = Factory.CreateClient();
            var response = await client.GetAsync("/api/push-notifications");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ─── PATCH /api/push-notifications/{id}/read ──────────────────────────────

    public sealed class MarkRead_ValidId : PushNotificationsControllerTests
    {
        public MarkRead_ValidId(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns204WhenNotificationBelongsToUser()
        {
            var notification = BuildNotification();
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(notification.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(notification);
            mock.Setup(r =>
                    r.MarkReadAsync(notification.Id, TestUserId, It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.PatchAsync(
                $"/api/push-notifications/{notification.Id}/read",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task Returns404WhenNotificationNotFound()
        {
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((PushNotification?)null);

            var client = CreateClient(mock);
            var response = await client.PatchAsync(
                $"/api/push-notifications/{Guid.NewGuid()}/read",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Returns404WhenNotificationBelongsToDifferentUser()
        {
            var notification = BuildNotification(userId: Guid.NewGuid());
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(notification.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(notification);

            var client = CreateClient(mock);
            var response = await client.PatchAsync(
                $"/api/push-notifications/{notification.Id}/read",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── PATCH /api/push-notifications/read-all ───────────────────────────────

    public sealed class MarkAllRead : PushNotificationsControllerTests
    {
        public MarkAllRead(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns204()
        {
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.MarkAllReadAsync(TestUserId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.PatchAsync("/api/push-notifications/read-all", null);

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    // ─── PATCH /api/push-notifications/{id}/seen ──────────────────────────────

    public sealed class MarkSeen_ValidId : PushNotificationsControllerTests
    {
        public MarkSeen_ValidId(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns204WhenNotificationBelongsToUser()
        {
            var notification = BuildNotification();
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(notification.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(notification);
            mock.Setup(r =>
                    r.MarkSeenAsync(notification.Id, TestUserId, It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.PatchAsync(
                $"/api/push-notifications/{notification.Id}/seen",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task Returns404WhenNotFound()
        {
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((PushNotification?)null);

            var client = CreateClient(mock);
            var response = await client.PatchAsync(
                $"/api/push-notifications/{Guid.NewGuid()}/seen",
                null
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ─── GET /api/push-notifications/{id} ─────────────────────────────────────

    public sealed class GetById : PushNotificationsControllerTests
    {
        public GetById(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200WithNotificationBelongingToUser()
        {
            var notification = BuildNotification();
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(notification.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(notification);

            var client = CreateClient(mock);
            var response = await client.GetAsync($"/api/push-notifications/{notification.Id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var dto = await response.Content.ReadFromJsonAsync<PushNotificationResponse>();
            dto.Should().NotBeNull();
            dto!.Id.Should().Be(notification.Id);
            dto.Title.Should().Be(notification.Title);
            dto.Body.Should().Be(notification.Body);
        }

        [Fact]
        public async Task Returns401WhenNotAuthenticated()
        {
            var client = Factory.CreateClient();
            var response = await client.GetAsync($"/api/push-notifications/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Returns404WhenNotificationNotFound()
        {
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((PushNotification?)null);

            var client = CreateClient(mock);
            var response = await client.GetAsync($"/api/push-notifications/{Guid.NewGuid()}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }

        [Fact]
        public async Task Returns404WhenNotificationBelongsToDifferentUser()
        {
            var notification = BuildNotification(userId: Guid.NewGuid());
            var mock = new Mock<IPushNotificationRepository>();
            mock.Setup(r => r.FindByIdAsync(notification.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(notification);

            var client = CreateClient(mock);
            var response = await client.GetAsync($"/api/push-notifications/{notification.Id}");
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
