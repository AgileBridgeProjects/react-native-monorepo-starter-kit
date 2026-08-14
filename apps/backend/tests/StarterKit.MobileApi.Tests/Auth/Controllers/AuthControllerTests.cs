using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Auth.DTOs;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.Auth.Controllers;

public abstract class AuthControllerTests : MobileApiIntegrationTestBase
{
    protected AuthControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    /// <summary>
    /// Authenticated client with a mocked <see cref="ICurrentSession"/> returning
    /// <paramref name="clubId"/>. Pass <c>null</c> to simulate an unlinked account.
    /// Optionally provide a <paramref name="club"/> to mock the club lookup.
    /// </summary>
    protected HttpClient CreateClient(
        Guid? clubId,
        StarterKit.Data.Clubs.Models.Club? club = null,
        string? resolvedLogoUrl = null,
        IReadOnlySet<string>? permissions = null
    )
    {
        return CreateClientWithAuth(services =>
        {
            var sessionMock = new Mock<ICurrentSession>();
            sessionMock.Setup(s => s.ClubIdOrDefault).Returns(clubId);
            services.AddScoped<ICurrentSession>(_ => sessionMock.Object);

            var clubSvcMock = new Mock<IClubService>();
            clubSvcMock
                .Setup(s => s.FindByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(club);
            clubSvcMock
                .Setup(s =>
                    s.ResolveLogoSasUrlAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(resolvedLogoUrl);
            services.AddScoped<IClubService>(_ => clubSvcMock.Object);

            var userSvcMock = new Mock<IUserService>();
            userSvcMock
                .Setup(s =>
                    s.GetUserPermissionsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(permissions ?? new HashSet<string>());
            services.AddScoped<IUserService>(_ => userSvcMock.Object);
        });
    }

    /// <summary>
    /// Unauthenticated client — no <see cref="TestAuthHandler"/> registered.
    /// Requests will be rejected by the real authentication middleware.
    /// </summary>
    protected HttpClient CreateUnauthenticatedClient()
    {
        return Factory
            .WithWebHostBuilder(builder =>
            {
                builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                builder.UseSetting("Anthropic:ApiKey", "test-key");
                builder.UseSetting(
                    "ConnectionStrings:DefaultConnection",
                    "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
                );
                builder.UseSetting("Firebase:Enabled", "false");
            })
            .CreateClient();
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────────

    public sealed class GetMe_Returns200 : AuthControllerTests
    {
        public GetMe_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMe_WhenAuthenticated_Returns200WithClubId()
        {
            var clubId = Guid.NewGuid();
            var client = CreateClient(clubId);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("clubId").GetGuid().Should().Be(clubId);
        }
    }

    public sealed class GetMe_ReturnsPermissions : AuthControllerTests
    {
        public GetMe_ReturnsPermissions(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMe_WhenAuthenticated_ReturnsCallersPermissions()
        {
            var clubId = Guid.NewGuid();
            var client = CreateClient(
                clubId,
                permissions: new HashSet<string> { StarterKitPermissions.Profile.View }
            );

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("permissions")
                .EnumerateArray()
                .Select(p => p.GetString())
                .Should()
                .ContainSingle(p => p == StarterKitPermissions.Profile.View);
        }
    }

    public sealed class GetMe_WhenClubHasLogo : AuthControllerTests
    {
        public GetMe_WhenClubHasLogo(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMe_WhenClubHasLogo_ReturnsNameAndResolvedLogoUrl()
        {
            var clubId = Guid.NewGuid();
            var club = new StarterKit.Data.Clubs.Models.Club
            {
                Id = clubId,
                Name = "Acme Corp",
                LogoUrl = "club-images/acme.png",
            };
            var client = CreateClient(
                clubId,
                club,
                resolvedLogoUrl: "https://blob.test/acme.png?sas=token"
            );

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("clubName").GetString().Should().Be("Acme Corp");
            body.GetProperty("clubLogoUrl")
                .GetString()
                .Should()
                .Be("https://blob.test/acme.png?sas=token");
        }
    }

    public sealed class GetMe_Returns403 : AuthControllerTests
    {
        public GetMe_Returns403(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMe_WhenNoClubMapped_Returns403()
        {
            var client = CreateClient(clubId: null);

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    public sealed class GetMe_Returns401 : AuthControllerTests
    {
        public GetMe_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetMe_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.GetAsync("/api/auth/me");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/auth/me/organisations ───────────────────────────────────────

    public sealed class GetOrganisations_Returns200 : AuthControllerTests
    {
        public GetOrganisations_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private HttpClient CreateClientWithOrgs(IReadOnlyList<LinkedOrganisation> orgs)
        {
            return CreateClientWithAuth(services =>
            {
                var sessionMock = new Mock<ICurrentSession>();
                sessionMock.Setup(s => s.ClubIdOrDefault).Returns(Guid.NewGuid());
                sessionMock.Setup(s => s.FirebaseUid).Returns("firebase-uid-multi");
                services.AddScoped<ICurrentSession>(_ => sessionMock.Object);

                var userSvcMock = new Mock<IUserService>();
                userSvcMock
                    .Setup(s =>
                        s.GetLinkedOrganisationsAsync(
                            "firebase-uid-multi",
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .ReturnsAsync(orgs);
                services.AddScoped<IUserService>(_ => userSvcMock.Object);

                var clubSvcMock = new Mock<IClubService>();
                services.AddScoped<IClubService>(_ => clubSvcMock.Object);
            });
        }

        [Fact]
        public async Task ReturnsOrganisationsList_WhenMultipleLinked()
        {
            var clubAId = Guid.NewGuid();
            var clubBId = Guid.NewGuid();
            var orgs = new List<LinkedOrganisation>
            {
                new(clubAId, "Acme Corp", "https://blob.test/logos/acme.png?sas=token"),
                new(clubBId, "Beta Inc", null),
            };
            var client = CreateClientWithOrgs(orgs);

            var response = await client.GetAsync("/api/auth/me/organisations");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(2);
            body[0].GetProperty("clubId").GetGuid().Should().Be(clubAId);
            body[0].GetProperty("clubName").GetString().Should().Be("Acme Corp");
            body[0].GetProperty("clubLogoUrl").GetString().Should().Contain("sas=token");
            body[1].GetProperty("clubId").GetGuid().Should().Be(clubBId);
            body[1].GetProperty("clubLogoUrl").ValueKind.Should().Be(JsonValueKind.Null);
        }

        [Fact]
        public async Task ReturnsEmptyArray_WhenUserBelongsToNoOrgs()
        {
            var client = CreateClientWithOrgs([]);

            var response = await client.GetAsync("/api/auth/me/organisations");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(0);
        }
    }

    public sealed class GetOrganisations_Returns401_WhenFirebaseUidMissing : AuthControllerTests
    {
        public GetOrganisations_Returns401_WhenFirebaseUidMissing(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task ReturnsUnauthorized()
        {
            var userSvcMock = new Mock<IUserService>();

            var client = CreateClientWithAuth(services =>
            {
                var sessionMock = new Mock<ICurrentSession>();
                sessionMock.Setup(s => s.ClubIdOrDefault).Returns(Guid.NewGuid());
                sessionMock.Setup(s => s.FirebaseUid).Returns((string?)null);
                services.AddScoped<ICurrentSession>(_ => sessionMock.Object);

                services.AddScoped<IUserService>(_ => userSvcMock.Object);
                services.AddScoped<IClubService>(_ => Mock.Of<IClubService>());
            });

            var response = await client.GetAsync("/api/auth/me/organisations");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            userSvcMock.Verify(
                s =>
                    s.GetLinkedOrganisationsAsync(
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }
}
