using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Users;

public abstract class DeleteUserTests : WebApiIntegrationTestBase
{
    protected DeleteUserTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
        });

    // ── DELETE /api/users/{id} ───────────────────────────────────────────────

    public sealed class Delete_Returns204 : DeleteUserTests
    {
        public Delete_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WhenUserExists_Returns204()
        {
            var userId = Guid.NewGuid();
            var mock = new Mock<IUserService>();
            mock.Setup(s => s.DeleteUserAsync(userId, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.DeleteAsync($"/api/users/{userId}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            mock.Verify(s => s.DeleteUserAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
        }
    }

    public sealed class Delete_Returns404 : DeleteUserTests
    {
        public Delete_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WhenUserNotFound_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s => s.DeleteUserAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("User", Guid.NewGuid()));

            var client = CreateClient(mock);
            var response = await client.DeleteAsync($"/api/users/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
