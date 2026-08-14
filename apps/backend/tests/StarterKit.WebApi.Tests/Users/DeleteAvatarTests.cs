using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Users;

public abstract class DeleteAvatarTests : WebApiIntegrationTestBase
{
    protected DeleteAvatarTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
        });

    // ── DELETE /api/users/{id}/avatar ────────────────────────────────────────

    public sealed class DeleteAvatar_Returns204 : DeleteAvatarTests
    {
        public DeleteAvatar_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task DeleteAvatar_WhenUserExists_Returns204()
        {
            var userId = Guid.NewGuid();
            var mock = new Mock<IUserService>();
            mock.Setup(s => s.RemoveAvatarAsync(userId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.DeleteAsync($"/api/users/{userId}/avatar");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            mock.Verify(
                s => s.RemoveAvatarAsync(userId, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class DeleteAvatar_Returns404 : DeleteAvatarTests
    {
        public DeleteAvatar_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task DeleteAvatar_WhenUserNotFound_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s => s.RemoveAvatarAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("User", Guid.NewGuid()));

            var client = CreateClient(mock);
            var response = await client.DeleteAsync($"/api/users/{Guid.NewGuid()}/avatar");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class DeleteAvatar_Returns401 : DeleteAvatarTests
    {
        public DeleteAvatar_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task DeleteAvatar_WithoutAuth_Returns401()
        {
            var client = Factory.CreateClient();
            var response = await client.DeleteAsync($"/api/users/{Guid.NewGuid()}/avatar");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
