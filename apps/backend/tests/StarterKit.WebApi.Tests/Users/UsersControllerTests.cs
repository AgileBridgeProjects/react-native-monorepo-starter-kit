using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Notifications.Options;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Tests.Users;

public abstract class UsersControllerTests : WebApiIntegrationTestBase
{
    protected UsersControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock, bool? emailEnabled = null)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
            if (emailEnabled.HasValue)
            {
                // EmailOptions uses init-only properties; replace the singleton directly.
                services.AddSingleton<IOptions<EmailOptions>>(
                    Options.Create(
                        new EmailOptions
                        {
                            Enabled = emailEnabled.Value,
                            ApiKey = "re_test-placeholder",
                            FromEmail = "test@example.com",
                            FromName = "StarterKit Test",
                        }
                    )
                );
            }
        });
    }

    // ── GET /api/users ───────────────────────────────────────────────────────

    public sealed class List_HappyPath : UsersControllerTests
    {
        public List_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_WhenTeamIdProvided_ForwardsToService()
        {
            var teamId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.ListAsync(
                        It.Is<UserQuery>(q => q.TeamId == teamId),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new PagedResult<User>
                    {
                        Items = [],
                        TotalCount = 0,
                        Page = 1,
                        PageSize = 20,
                    }
                );

            var client = CreateClient(userServiceMock);

            var response = await client.GetAsync($"/api/users?ClubId={TestClubId}&TeamId={teamId}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            userServiceMock.Verify(
                s =>
                    s.ListAsync(
                        It.Is<UserQuery>(q => q.TeamId == teamId),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── POST /api/users/{id}/link-club ────────────────────────────────────

    public sealed class LinkToClub_Returns200 : UsersControllerTests
    {
        public LinkToClub_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task LinkToClub_WhenUserAndClubExist_Returns200()
        {
            var userId = Guid.NewGuid();
            var clubId = Guid.NewGuid();
            var updatedUser = new User
            {
                Id = userId,
                Email = Faker.Internet.Email(),
                DisplayName = Faker.Name.FullName(),
                ClubId = clubId,
                ExternalAuthId = "firebase-uid",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = ["Athlete"],
            };

            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.LinkToClubAsync(userId, clubId, "Athlete", It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(updatedUser);

            var client = CreateClient(userServiceMock);
            var response = await client.PostAsJsonAsync(
                $"/api/users/{userId}/link-club",
                new LinkUserToClubRequest { ClubId = clubId, Role = "Athlete" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            userServiceMock.Verify(
                s => s.LinkToClubAsync(userId, clubId, "Athlete", It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class LinkToClub_Returns404 : UsersControllerTests
    {
        public LinkToClub_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Theory]
        [InlineData("user")]
        [InlineData("club")]
        public async Task LinkToClub_WhenNotFound_Returns404(string missingEntity)
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.LinkToClubAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException(missingEntity, Guid.NewGuid()));

            var client = CreateClient(userServiceMock);
            var response = await client.PostAsJsonAsync(
                $"/api/users/{Guid.NewGuid()}/link-club",
                new LinkUserToClubRequest { ClubId = Guid.NewGuid(), Role = "Athlete" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/users/{id}/roles ────────────────────────────────────────────

    public sealed class AssignRole_Returns200 : UsersControllerTests
    {
        public AssignRole_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task AssignRole_WhenUserExistsAndRoleIsValid_Returns200WithUpdatedUser()
        {
            var userId = Guid.NewGuid();
            var updatedUser = new User
            {
                Id = userId,
                Email = Faker.Internet.Email(),
                DisplayName = Faker.Name.FullName(),
                ClubId = TestClubId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = ["Athlete", "ClubAdmin"],
            };

            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.AssignRoleAsync(userId, "ClubAdmin", It.IsAny<CancellationToken>()))
                .ReturnsAsync(updatedUser);

            var client = CreateClient(userServiceMock);
            var response = await client.PostAsJsonAsync(
                $"/api/users/{userId}/roles",
                new AssignRoleRequest { Role = "ClubAdmin" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<UserResponse>(JsonOptions);
            body!.Roles.Should().Contain("ClubAdmin");
            userServiceMock.Verify(
                s => s.AssignRoleAsync(userId, "ClubAdmin", It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class AssignRole_Returns404 : UsersControllerTests
    {
        public AssignRole_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task AssignRole_WhenUserDoesNotExist_Returns404()
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.AssignRoleAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException(nameof(User), Guid.NewGuid()));

            var client = CreateClient(userServiceMock);
            var response = await client.PostAsJsonAsync(
                $"/api/users/{Guid.NewGuid()}/roles",
                new AssignRoleRequest { Role = "ClubAdmin" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class AssignRole_Returns400 : UsersControllerTests
    {
        public AssignRole_Returns400(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task AssignRole_WhenRoleDoesNotExist_Returns400()
        {
            var userId = Guid.NewGuid();
            var user = new User
            {
                Id = userId,
                Email = Faker.Internet.Email(),
                DisplayName = Faker.Name.FullName(),
                ClubId = TestClubId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = [],
            };

            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.AssignRoleAsync(userId, "NonExistentRole", It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(
                    new ArgumentException(
                        "Role 'NonExistentRole' does not exist in the database.",
                        "roleName"
                    )
                );

            var client = CreateClient(userServiceMock);
            var response = await client.PostAsJsonAsync(
                $"/api/users/{userId}/roles",
                new AssignRoleRequest { Role = "NonExistentRole" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    // ── PATCH /api/users/{id}/status ─────────────────────────────────────────

    public sealed class SetActive_Returns204 : UsersControllerTests
    {
        public SetActive_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SetActive_WhenUserExists_Returns204()
        {
            var userId = Guid.NewGuid();
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s => s.SetActiveAsync(userId, false, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(userServiceMock);
            var response = await client.PatchAsJsonAsync(
                $"/api/users/{userId}/status",
                new { IsActive = false }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    public sealed class SetActive_Returns404 : UsersControllerTests
    {
        public SetActive_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SetActive_WhenUserDoesNotExist_Returns404()
        {
            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.SetActiveAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException(nameof(User), Guid.NewGuid()));

            var client = CreateClient(userServiceMock);
            var response = await client.PatchAsJsonAsync(
                $"/api/users/{Guid.NewGuid()}/status",
                new { IsActive = false }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class SetActive_Returns401 : UsersControllerTests
    {
        public SetActive_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task SetActive_WithoutAuth_Returns401()
        {
            var client = Factory.CreateClient();
            var response = await client.PatchAsJsonAsync(
                $"/api/users/{Guid.NewGuid()}/status",
                new { IsActive = false }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── POST /api/users/{id}/resend-setup — email-provider link suppression ──

    public sealed class ResendSetup_ReturnsSetupLink_WhenEmailDisabled : UsersControllerTests
    {
        public ResendSetup_ReturnsSetupLink_WhenEmailDisabled(
            WebApplicationFactory<Program> factory
        )
            : base(factory) { }

        [Fact]
        public async Task ResendSetup_WhenEmailDisabled_ReturnsLinkInResponse()
        {
            var userId = Guid.NewGuid();
            const string link = "https://example.com/setup?token=abc";

            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.ResendSetupLinkAsync(userId, It.IsAny<bool>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(link);

            // Explicitly disable email delivery so the link is included in the response.
            var client = CreateClient(userServiceMock, emailEnabled: false);
            var response = await client.PostAsync($"/api/users/{userId}/resend-setup", null);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ResendSetupResponse>(JsonOptions);
            body!.SetupLink.Should().Be(link);
        }
    }

    public sealed class ResendSetup_ReturnsLink_WhenEmailEnabled : UsersControllerTests
    {
        public ResendSetup_ReturnsLink_WhenEmailEnabled(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task ResendSetup_WhenEmailEnabled_ReturnsLink()
        {
            var userId = Guid.NewGuid();
            const string link = "https://example.com/setup?token=abc";

            var userServiceMock = new Mock<IUserService>();
            userServiceMock
                .Setup(s =>
                    s.ResendSetupLinkAsync(userId, It.IsAny<bool>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(link);

            // Email:Enabled = true → link is still returned to authorized admins.
            var client = CreateClient(userServiceMock, emailEnabled: true);
            var response = await client.PostAsync($"/api/users/{userId}/resend-setup", null);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ResendSetupResponse>(JsonOptions);
            body!.SetupLink.Should().Be(link);
        }
    }
}
