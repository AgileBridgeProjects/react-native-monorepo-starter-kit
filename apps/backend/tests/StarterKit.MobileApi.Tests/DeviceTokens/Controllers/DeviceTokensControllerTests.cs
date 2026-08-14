using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Data.DeviceTokens.Interfaces.Repositories;
using StarterKit.MobileApi.DeviceTokens.DTOs;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.DeviceTokens.Controllers;

public abstract class DeviceTokensControllerTests : MobileApiIntegrationTestBase
{
    protected static readonly Guid TestUserId = Guid.Empty;

    protected DeviceTokensControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IDeviceTokenRepository> repoMock)
    {
        var client = CreateClientWithAuth(services =>
        {
            services.AddScoped<IDeviceTokenRepository>(_ => repoMock.Object);
        });
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, TestUserId.ToString());
        return client;
    }

    // ─── POST /api/device-tokens ──────────────────────────────────────────────

    public sealed class Register_ValidRequest : DeviceTokensControllerTests
    {
        public Register_ValidRequest(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns204ForIosPlatform()
        {
            var mock = new Mock<IDeviceTokenRepository>();
            mock.Setup(r =>
                    r.UpsertAsync(
                        TestUserId,
                        Data.DeviceTokens.Enums.PushPlatform.iOS,
                        "test-token-ios",
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/device-tokens",
                new RegisterDeviceTokenRequest { Platform = "iOS", Token = "test-token-ios" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task Returns204ForAndroidPlatform()
        {
            var mock = new Mock<IDeviceTokenRepository>();
            mock.Setup(r =>
                    r.UpsertAsync(
                        TestUserId,
                        Data.DeviceTokens.Enums.PushPlatform.Android,
                        "test-token-android",
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/device-tokens",
                new RegisterDeviceTokenRequest
                {
                    Platform = "Android",
                    Token = "test-token-android",
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        [Fact]
        public async Task Returns400ForInvalidPlatform()
        {
            var mock = new Mock<IDeviceTokenRepository>();
            var client = CreateClient(mock);

            var response = await client.PostAsJsonAsync(
                "/api/device-tokens",
                new RegisterDeviceTokenRequest { Platform = "WindowsPhone", Token = "some-token" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Returns401WhenNotAuthenticated()
        {
            var client = Factory.CreateClient();
            var response = await client.PostAsJsonAsync(
                "/api/device-tokens",
                new RegisterDeviceTokenRequest { Platform = "iOS", Token = "token" }
            );
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
