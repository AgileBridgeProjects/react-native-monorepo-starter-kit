using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.WebApi.Clubs.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Clubs;

public abstract class ClubsControllerTests : WebApiIntegrationTestBase
{
    protected ClubsControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IClubService> clubServiceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IClubService>(_ => clubServiceMock.Object);
        });
    }

    protected HttpClient CreateAnonymousClient()
    {
        return Factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddScoped<IClubService>(_ => new Mock<IClubService>().Object);
                });
            })
            .CreateClient();
    }

    // ── GET /api/clubs/upload-constraints ────────────────────────────────

    public sealed class GetUploadConstraints : ClubsControllerTests
    {
        public GetUploadConstraints(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetUploadConstraints_Returns200WithConfiguredValues()
        {
            // No service interaction — the endpoint reads from IOptionsMonitor<LogoUploadOptions>
            var mock = new Mock<IClubService>();
            var client = CreateClient(mock);

            var response = await client.GetAsync("/api/clubs/upload-constraints");

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            var body = await response.Content.ReadFromJsonAsync<UploadConstraintsResponse>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!
                .AllowedContentTypes.Should()
                .BeEquivalentTo([
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                    "image/gif",
                    "image/bmp",
                    "image/svg+xml",
                ]);
            body.MaxFileSizeBytes.Should().Be(10 * 1024 * 1024);
        }

        [Fact]
        public async Task GetUploadConstraints_AllowsAnonymousAccess()
        {
            // The frontend needs to fetch constraints before any auth-gated action, so the
            // endpoint must succeed even without an Authorization header. We use the raw
            // Factory.CreateClient() here (no TestAuthHandler wiring) to prove this.
            var mock = new Mock<IClubService>();
            using var anonymousClient = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                    builder.ConfigureServices(services =>
                    {
                        services.AddScoped<IClubService>(_ => mock.Object);
                    });
                })
                .CreateClient();

            var response = await anonymousClient.GetAsync("/api/clubs/upload-constraints");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ── POST /api/clubs/images ──────────────────────────────────────────

    public sealed class UploadLogo : ClubsControllerTests
    {
        public UploadLogo(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UploadLogoAsync_WhenUploadIsValid_Returns200WithStoredPath()
        {
            var clubMock = new Mock<IClubService>();
            clubMock
                .Setup(s =>
                    s.UploadLogoAsync(
                        It.IsAny<StarterKit.Core.Resources.UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync("club-images/logo.png");
            var client = CreateClient(clubMock);
            using var content = new MultipartFormDataContent();
            using var image = new ByteArrayContent([1, 2, 3]);
            image.Headers.ContentType = new("image/png");
            content.Add(image, "file", "logo.png");

            var response = await client.PostAsync("/api/clubs/images", content);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<UploadClubLogoResponse>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!.LogoUrl.Should().Be("club-images/logo.png");
        }

        [Fact]
        public async Task UploadLogoAsync_WhenUnauthenticated_Returns401()
        {
            using var client = CreateAnonymousClient();
            using var content = new MultipartFormDataContent();
            using var image = new ByteArrayContent([1, 2, 3]);
            image.Headers.ContentType = new("image/png");
            content.Add(image, "file", "logo.png");

            var response = await client.PostAsync("/api/clubs/images", content);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
