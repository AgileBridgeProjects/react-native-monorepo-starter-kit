using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Users.Enums;
using StarterKit.MobileApi.Tests.Infrastructure;

namespace StarterKit.MobileApi.Tests.Users.Controllers;

public abstract class UsersControllerTests : MobileApiIntegrationTestBase
{
    protected static readonly Guid TestUserId = Guid.NewGuid();

    protected UsersControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(
        User? profileUser = null,
        Action<IServiceCollection>? extraServices = null,
        bool isCoach = false,
        Mock<IUserService>? userServiceMock = null
    )
    {
        return CreateClientWithAuth(services =>
        {
            var sessionMock = new Mock<ICurrentSession>();
            sessionMock.Setup(s => s.UserId).Returns(TestUserId);
            sessionMock.Setup(s => s.ClubIdOrDefault).Returns(TestClubId);
            sessionMock.Setup(s => s.IsInRole("Coach")).Returns(isCoach);
            services.AddScoped<ICurrentSession>(_ => sessionMock.Object);

            var user =
                profileUser
                ?? new User
                {
                    Id = TestUserId,
                    DisplayName = "Test User",
                    Email = "test@example.com",
                    AvatarUrl = null,
                };

            var userSvcMock = userServiceMock ?? new Mock<IUserService>();
            userSvcMock
                .Setup(s => s.GetProfileAsync(TestUserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            userSvcMock
                .Setup(s =>
                    s.UpdateProfileAsync(
                        It.Is<UpdateProfileCommand>(c => c.UserId == TestUserId),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);
            services.AddScoped<IUserService>(_ => userSvcMock.Object);

            var clubSvcMock = new Mock<IClubService>();
            clubSvcMock
                .Setup(s => s.FindByIdAsync(TestClubId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new StarterKit.Data.Clubs.Models.Club { Id = TestClubId, Name = "Acme" }
                );
            services.AddScoped<IClubService>(_ => clubSvcMock.Object);

            extraServices?.Invoke(services);
        });
    }

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

    // ── GET /api/users/me/profile ────────────────────────────────────────────

    public sealed class GetProfile_Returns200 : UsersControllerTests
    {
        public GetProfile_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetProfile_WhenAuthenticated_Returns200WithProfile()
        {
            var client = CreateClient();

            var response = await client.GetAsync("/api/users/me/profile");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("displayName").GetString().Should().Be("Test User");
            body.GetProperty("email").GetString().Should().Be("test@example.com");
            body.GetProperty("clubName").GetString().Should().Be("Acme");
            body.GetProperty("isCoach").GetBoolean().Should().BeFalse();
        }

        [Theory]
        [InlineData(true)]
        [InlineData(false)]
        public async Task GetProfile_ReflectsCallersCoachRole(bool isCoach)
        {
            var client = CreateClient(isCoach: isCoach);

            var response = await client.GetAsync("/api/users/me/profile");

            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("isCoach").GetBoolean().Should().Be(isCoach);
        }

        [Fact]
        public async Task GetProfile_WhenUserHasAnAthleteRoleRequiringOnboarding_ReturnsOnboardingRoleAthlete()
        {
            var client = CreateClient(
                new User
                {
                    Id = TestUserId,
                    DisplayName = "Test Athlete",
                    Email = "athlete@example.com",
                    OnboardingRole = "Athlete",
                }
            );

            var response = await client.GetAsync("/api/users/me/profile");

            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("onboardingRole").GetString().Should().Be("Athlete");
        }

        [Fact]
        public async Task GetProfile_WhenUserHasNoRoleRequiringOnboarding_ReturnsOnboardingRoleNull()
        {
            var client = CreateClient();

            var response = await client.GetAsync("/api/users/me/profile");

            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetProperty("onboardingRole").ValueKind.Should().Be(JsonValueKind.Null);
        }
    }

    public sealed class GetProfile_Returns401 : UsersControllerTests
    {
        public GetProfile_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetProfile_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.GetAsync("/api/users/me/profile");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── PATCH /api/users/me/profile ──────────────────────────────────────────

    public sealed class UpdateProfile_Returns204 : UsersControllerTests
    {
        public UpdateProfile_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdateProfile_WithValidDisplayName_Returns204()
        {
            var client = CreateClient();

            var response = await client.PatchAsJsonAsync(
                "/api/users/me/profile",
                new { displayName = "New Name" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    public sealed class UpdateProfile_Returns400 : UsersControllerTests
    {
        public UpdateProfile_Returns400(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdateProfile_WithSingleCharName_Returns400()
        {
            var client = CreateClient();

            var response = await client.PatchAsJsonAsync(
                "/api/users/me/profile",
                new { displayName = "A" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class UpdateProfile_Returns401 : UsersControllerTests
    {
        public UpdateProfile_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdateProfile_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.PatchAsJsonAsync(
                "/api/users/me/profile",
                new { displayName = "New Name" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class UpdateProfile_AthleteFields_Returns204 : UsersControllerTests
    {
        public UpdateProfile_AthleteFields_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdateProfile_WithPositionJerseyAndCompleteOnboarding_Returns204()
        {
            var userServiceMock = new Mock<IUserService>();
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.PatchAsJsonAsync(
                "/api/users/me/profile",
                new
                {
                    position = "OutsideHitter",
                    jerseyNumber = 12,
                    completeOnboarding = true,
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            userServiceMock.Verify(
                s =>
                    s.UpdateProfileAsync(
                        It.Is<UpdateProfileCommand>(c =>
                            c.UserId == TestUserId
                            && c.Position == PlayingPosition.OutsideHitter
                            && c.JerseyNumber == 12
                            && c.CompleteOnboarding == true
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── GET /api/users/me/linked-athletes ───────────────────────────

    public sealed class ListLinkedAthletes : UsersControllerTests
    {
        public ListLinkedAthletes(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ListLinkedAthletes_WhenParentHasLinks_Returns200WithAthletes()
        {
            var athleteId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.ListLinkedAthletesAsync(TestUserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([
                    new LinkedAthlete
                    {
                        AthleteUserId = athleteId,
                        DisplayName = "Julia Smith",
                        TeamName = "U14 Texas Slam",
                        Position = PlayingPosition.MiddleBlocker,
                        JerseyNumber = 10,
                        PhotoUrl = "https://blob.example/face.jpg",
                        Relationship = GuardianRelationship.Mother,
                    },
                ]);
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.GetAsync("/api/users/me/linked-athletes");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(1);
            var athlete = body[0];
            athlete.GetProperty("athleteUserId").GetGuid().Should().Be(athleteId);
            athlete.GetProperty("displayName").GetString().Should().Be("Julia Smith");
            athlete.GetProperty("teamName").GetString().Should().Be("U14 Texas Slam");
            athlete.GetProperty("position").GetString().Should().Be("MiddleBlocker");
            athlete.GetProperty("jerseyNumber").GetInt32().Should().Be(10);
            athlete.GetProperty("relationship").GetString().Should().Be("Mother");
        }

        [Fact]
        public async Task ListLinkedAthletes_WhenParentHasNoLinks_Returns200WithEmptyArray()
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.ListLinkedAthletesAsync(TestUserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.GetAsync("/api/users/me/linked-athletes");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(0);
        }

        [Fact]
        public async Task ListLinkedAthletes_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.GetAsync("/api/users/me/linked-athletes");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── PUT /api/users/me/linked-athletes/relationships ─────────────

    public sealed class SetGuardianRelationships : UsersControllerTests
    {
        public SetGuardianRelationships(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SetRelationships_WithOneEntryPerAthlete_Returns204AndPassesEveryEntry()
        {
            var firstAthleteId = Guid.NewGuid();
            var secondAthleteId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.PutAsJsonAsync(
                "/api/users/me/linked-athletes/relationships",
                new
                {
                    relationships = new[]
                    {
                        new { athleteUserId = firstAthleteId, relationship = "Mother" },
                        new { athleteUserId = secondAthleteId, relationship = "Guardian" },
                    },
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            userServiceMock.Verify(
                s =>
                    s.SetGuardianRelationshipsAsync(
                        It.Is<SetGuardianRelationshipsCommand>(c =>
                            c.GuardianUserId == TestUserId
                            && c.Relationships.Count == 2
                            && c.Relationships[0].AthleteUserId == firstAthleteId
                            && c.Relationships[0].Relationship == GuardianRelationship.Mother
                            && c.Relationships[1].AthleteUserId == secondAthleteId
                            && c.Relationships[1].Relationship == GuardianRelationship.Guardian
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task SetRelationships_WithEmptyList_Returns400()
        {
            var client = CreateClient();

            var response = await client.PutAsJsonAsync(
                "/api/users/me/linked-athletes/relationships",
                new { relationships = Array.Empty<object>() }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SetRelationships_WithEmptyAthleteId_Returns400()
        {
            var client = CreateClient();

            var response = await client.PutAsJsonAsync(
                "/api/users/me/linked-athletes/relationships",
                new
                {
                    relationships = new[]
                    {
                        new { athleteUserId = Guid.Empty, relationship = "Other" },
                    },
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task SetRelationships_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.PutAsJsonAsync(
                "/api/users/me/linked-athletes/relationships",
                new
                {
                    relationships = new[]
                    {
                        new { athleteUserId = Guid.NewGuid(), relationship = "Father" },
                    },
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/users/me/linked-teams ──────────────────────────────

    public sealed class ListLinkedTeams : UsersControllerTests
    {
        public ListLinkedTeams(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ListLinkedTeams_WhenCoachHasLinks_Returns200WithTeams()
        {
            var teamId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.ListLinkedTeamsAsync(TestUserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([
                    new LinkedTeam
                    {
                        TeamId = teamId,
                        Name = "U14 Texas Slam",
                        AgeGroup = AgeGroup.U14,
                        LogoUrl = "https://blob.example/logo.jpg",
                    },
                ]);
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.GetAsync("/api/users/me/linked-teams");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(1);
            var team = body[0];
            team.GetProperty("teamId").GetGuid().Should().Be(teamId);
            team.GetProperty("name").GetString().Should().Be("U14 Texas Slam");
            team.GetProperty("ageGroup").GetString().Should().Be("U14");
            team.GetProperty("logoUrl").GetString().Should().Be("https://blob.example/logo.jpg");
        }

        [Fact]
        public async Task ListLinkedTeams_WhenCoachHasNoLinks_Returns200WithEmptyArray()
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.ListLinkedTeamsAsync(TestUserId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);
            var client = CreateClient(userServiceMock: userServiceMock);

            var response = await client.GetAsync("/api/users/me/linked-teams");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            body.GetArrayLength().Should().Be(0);
        }

        [Fact]
        public async Task ListLinkedTeams_WhenUnauthenticated_Returns401()
        {
            var client = CreateUnauthenticatedClient();

            var response = await client.GetAsync("/api/users/me/linked-teams");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
