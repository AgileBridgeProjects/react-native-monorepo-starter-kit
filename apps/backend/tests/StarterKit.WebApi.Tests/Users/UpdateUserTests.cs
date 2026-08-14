using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Tests.Users;

public abstract class UpdateUserTests : WebApiIntegrationTestBase
{
    protected UpdateUserTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
        });

    // ── PUT /api/users/{id} ──────────────────────────────────────────────────

    public sealed class Update_Returns200 : UpdateUserTests
    {
        public Update_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenValidRequest_Returns200WithUserResponse()
        {
            var userId = Guid.NewGuid();
            var request = new UpdateUserRequest
            {
                RoleName = "ClubAdmin",
                FirstName = "Updated",
                LastName = "User",
                Email = "updated@example.com",
            };

            var updatedUser = new User
            {
                Id = userId,
                ClubId = TestClubId,
                Email = "updated@example.com",
                DisplayName = "Updated User",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = ["ClubAdmin"],
            };

            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(updatedUser);

            var client = CreateClient(mock);
            var response = await client.PutAsJsonAsync($"/api/users/{userId}", request);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<UserResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.DisplayName.Should().Be("Updated User");
            body.Roles.Should().Contain("ClubAdmin");
        }
    }

    public sealed class Update_Returns404 : UpdateUserTests
    {
        public Update_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenUserNotFound_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException("User", Guid.NewGuid()));

            var client = CreateClient(mock);
            var request = new UpdateUserRequest
            {
                RoleName = "Athlete",
                FirstName = "Missing",
                LastName = "User",
                Email = "missing@example.com",
            };

            var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class Update_Returns409_EmailConflict : UpdateUserTests
    {
        public Update_Returns409_EmailConflict(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenEmailConflict_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException(
                        "A user with this email already exists in this club.",
                        errorCode: "email-conflict"
                    )
                );

            var client = CreateClient(mock);
            var request = new UpdateUserRequest
            {
                RoleName = "Athlete",
                FirstName = "Conflict",
                LastName = "User",
                Email = "taken@example.com",
            };

            var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Update_Returns409_PhoneConflict : UpdateUserTests
    {
        public Update_Returns409_PhoneConflict(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenPhoneConflict_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException(
                        "A user with this phone number already exists in this club.",
                        errorCode: "phone-conflict"
                    )
                );

            var client = CreateClient(mock);
            var request = new UpdateUserRequest
            {
                RoleName = "Athlete",
                FirstName = "Phone",
                LastName = "Conflict",
                PhoneNumber = "+27821234567",
            };

            var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Update_Returns409_CrossClubConflict : UpdateUserTests
    {
        public Update_Returns409_CrossClubConflict(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenUserExistsInOtherClub_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException(
                        "This user already exists in another club.",
                        errorCode: "user-exists-other-club"
                    )
                );

            var client = CreateClient(mock);
            var request = new UpdateUserRequest
            {
                RoleName = "Athlete",
                FirstName = "Cross",
                LastName = "Club",
                Email = "crossclub@example.com",
            };

            var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Update_Returns409_AdminRoleMultiClub : UpdateUserTests
    {
        public Update_Returns409_AdminRoleMultiClub(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenAdminRoleAssignedToSharedUser_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException(
                        "Admin roles cannot be assigned to users who are shared across multiple organisations.",
                        errorCode: "admin-role-multi-club"
                    )
                );

            var client = CreateClient(mock);
            var request = new UpdateUserRequest
            {
                RoleName = "ClubAdmin",
                FirstName = "Shared",
                LastName = "User",
                Email = "shared@example.com",
            };

            var response = await client.PutAsJsonAsync($"/api/users/{Guid.NewGuid()}", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    // ── Parent must keep at least one linked Athlete ───────────────

    public sealed class Update_ParentLinkedAthleteRule : UpdateUserTests
    {
        public Update_ParentLinkedAthleteRule(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private static UpdateUserRequest ParentRequest(IReadOnlyList<Guid>? dependentUserIds) =>
            new()
            {
                RoleName = "Parent",
                FirstName = "Pat",
                LastName = "Parent",
                Email = "pat.parent@example.com",
                DependentUserIds = dependentUserIds,
            };

        private static Mock<IUserService> ServiceMockReturningUpdatedParent(Guid userId)
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = userId,
                        ClubId = TestClubId,
                        Email = "pat.parent@example.com",
                        DisplayName = "Pat Parent",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        Roles = ["Parent"],
                    }
                );
            return mock;
        }

        [Fact]
        public async Task Update_WhenClearingAParentsLinkedAthletes_Returns400()
        {
            var userId = Guid.NewGuid();
            var mock = ServiceMockReturningUpdatedParent(userId);
            var client = CreateClient(mock);

            var response = await client.PutAsJsonAsync($"/api/users/{userId}", ParentRequest([]));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            mock.Verify(
                s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task Update_WhenLinkedAthletesAreOmitted_LeavesThemUnchanged()
        {
            var userId = Guid.NewGuid();
            var client = CreateClient(ServiceMockReturningUpdatedParent(userId));

            var response = await client.PutAsJsonAsync($"/api/users/{userId}", ParentRequest(null));

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ── Coach must keep at least one linked Team ───────────────────

    public sealed class Update_CoachLinkedTeamRule : UpdateUserTests
    {
        public Update_CoachLinkedTeamRule(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private static UpdateUserRequest CoachRequest(IReadOnlyList<Guid>? teamIds) =>
            new()
            {
                RoleName = "Coach",
                FirstName = "Cam",
                LastName = "Coach",
                Email = "cam.coach@example.com",
                TeamIds = teamIds,
            };

        private static Mock<IUserService> ServiceMockReturningUpdatedCoach(Guid userId)
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = userId,
                        ClubId = TestClubId,
                        Email = "cam.coach@example.com",
                        DisplayName = "Cam Coach",
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        Roles = ["Coach"],
                    }
                );
            return mock;
        }

        [Fact]
        public async Task Update_WhenClearingACoachsLinkedTeams_Returns400()
        {
            var userId = Guid.NewGuid();
            var mock = ServiceMockReturningUpdatedCoach(userId);
            var client = CreateClient(mock);

            var response = await client.PutAsJsonAsync($"/api/users/{userId}", CoachRequest([]));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            mock.Verify(
                s =>
                    s.AdminUpdateUserAsync(
                        It.IsAny<UpdateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task Update_WhenReplacingCoachLinkedTeams_Returns200AndForwardsTheNewSet()
        {
            var userId = Guid.NewGuid();
            var newTeamId = Guid.NewGuid();
            var mock = ServiceMockReturningUpdatedCoach(userId);
            var client = CreateClient(mock);

            var response = await client.PutAsJsonAsync(
                $"/api/users/{userId}",
                CoachRequest([newTeamId])
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            mock.Verify(
                s =>
                    s.AdminUpdateUserAsync(
                        It.Is<UpdateUserCommand>(c =>
                            c.TeamIds != null && c.TeamIds.Contains(newTeamId)
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task Update_WhenLinkedTeamsAreOmitted_LeavesThemUnchanged()
        {
            var userId = Guid.NewGuid();
            var client = CreateClient(ServiceMockReturningUpdatedCoach(userId));

            var response = await client.PutAsJsonAsync($"/api/users/{userId}", CoachRequest(null));

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
