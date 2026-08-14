using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.MobileApi.Dev;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.Dev.Controllers;

public abstract class DevBootstrapControllerTests : MobileApiIntegrationTestBase
{
    protected DevBootstrapControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IDevBootstrapService> serviceMock)
    {
        return Factory
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Development");
                builder.UseSetting("Anthropic:ApiKey", "test-key");
                // Use "#" sentinel so Program.cs keeps Hangfire on in-memory storage.
                // The real connection string is not needed — IDevBootstrapService is mocked.
                builder.UseSetting("ConnectionStrings:DefaultConnection", "#");
                builder.UseSetting("Firebase:Enabled", "false");
                builder.ConfigureServices(services =>
                {
                    services.AddScoped<IDevBootstrapService>(_ => serviceMock.Object);
                });
            })
            .CreateClient();
    }

    public sealed class BootstrapPhone_Returns200 : DevBootstrapControllerTests
    {
        public BootstrapPhone_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task BootstrapPhone_WithBearerToken_Returns200WithLinkedUser()
        {
            var userId = Guid.NewGuid();
            var clubId = Guid.NewGuid();
            var serviceMock = new Mock<IDevBootstrapService>();
            serviceMock
                .Setup(s => s.BootstrapPhoneUserAsync("test-token", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new DevBootstrapResult(userId, clubId));

            var client = CreateClient(serviceMock);
            client.DefaultRequestHeaders.Authorization = new("Bearer", "test-token");

            var response = await client.PostAsJsonAsync("/api/dev/bootstrap-phone", new { });

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("userId").GetGuid().Should().Be(userId);
            body.GetProperty("clubId").GetGuid().Should().Be(clubId);
        }
    }

    public sealed class BootstrapPhone_Returns400 : DevBootstrapControllerTests
    {
        public BootstrapPhone_Returns400(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task BootstrapPhone_WithoutAuthorizationHeader_Returns400()
        {
            var serviceMock = new Mock<IDevBootstrapService>();
            var client = CreateClient(serviceMock);

            var response = await client.PostAsJsonAsync("/api/dev/bootstrap-phone", new { });

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            serviceMock.Verify(
                s => s.BootstrapPhoneUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }
}
