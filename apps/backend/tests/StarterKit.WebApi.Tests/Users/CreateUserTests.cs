using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Tests.Users;

public abstract class CreateUserTests : WebApiIntegrationTestBase
{
    protected CreateUserTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
        });

    // ── POST /api/users ──────────────────────────────────────────────────────

    public sealed class Create_Returns201 : CreateUserTests
    {
        public Create_Returns201(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenValidRequest_Returns201WithUserResponse()
        {
            var clubId = TestClubId;
            var request = new AdminCreateUserRequest
            {
                ClubId = clubId,
                RoleName = "Athlete",
                FirstName = "Jane",
                LastName = "Doe",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "jane.doe@example.com",
            };

            var createdUser = new User
            {
                Id = Guid.NewGuid(),
                ClubId = clubId,
                Email = "jane.doe@example.com",
                DisplayName = "Jane Doe",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = ["Athlete"],
            };

            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((createdUser, (string?)null));

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync("/api/users", request);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadFromJsonAsync<UserResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Email.Should().Be("jane.doe@example.com");
            body.DisplayName.Should().Be("Jane Doe");
            mock.Verify(
                s =>
                    s.AdminCreateUserAsync(
                        It.Is<AdminCreateUserCommand>(c =>
                            c.ClubId == clubId
                            && c.Email == "jane.doe@example.com"
                            && c.RoleName == "Athlete"
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    public sealed class Create_Returns409_DuplicateEmail : CreateUserTests
    {
        public Create_Returns409_DuplicateEmail(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenEmailAlreadyExists_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new ConflictException("A user with these details already exists."));

            var client = CreateClient(mock);
            var request = new AdminCreateUserRequest
            {
                ClubId = TestClubId,
                RoleName = "Athlete",
                FirstName = "Existing",
                LastName = "User",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "existing@example.com",
            };

            var response = await client.PostAsJsonAsync("/api/users", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Create_Returns404_ClubNotFound : CreateUserTests
    {
        public Create_Returns404_ClubNotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenClubNotFound_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException("Club", Guid.NewGuid()));

            var client = CreateClient(mock);
            var request = new AdminCreateUserRequest
            {
                ClubId = Guid.NewGuid(),
                RoleName = "Athlete",
                FirstName = "No",
                LastName = "Club",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "noclub@example.com",
            };

            var response = await client.PostAsJsonAsync("/api/users", request);
            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class Create_Returns409_UserLimitReached : CreateUserTests
    {
        public Create_Returns409_UserLimitReached(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenUserLimitReached_Returns409()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException(
                        $"Club {TestClubId} has reached its maximum user limit of 10."
                    )
                );

            var client = CreateClient(mock);
            var request = new AdminCreateUserRequest
            {
                ClubId = TestClubId,
                RoleName = "Athlete",
                FirstName = "Over",
                LastName = "Limit",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "overlimit@example.com",
            };

            var response = await client.PostAsJsonAsync("/api/users", request);
            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Create_CustomAuthentication : CreateUserTests
    {
        public Create_CustomAuthentication(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenCustomAuthentication_MapsUsernameAndPassword()
        {
            var clubId = TestClubId;
            var createdUser = new User
            {
                Id = Guid.NewGuid(),
                ClubId = clubId,
                Email = string.Empty,
                Username = "jdoe",
                DisplayName = "John Doe",
                AuthMethod = AuthenticationMethod.CustomAuthentication,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                Roles = ["Athlete"],
            };

            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((createdUser, (string?)null));

            var request = new AdminCreateUserRequest
            {
                ClubId = clubId,
                RoleName = "Athlete",
                FirstName = "John",
                LastName = "Doe",
                AuthMethod = AuthenticationMethod.CustomAuthentication,
                Username = "jdoe",
                Password = "P@ssword123",
            };

            var client = CreateClient(mock);
            var response = await client.PostAsJsonAsync("/api/users", request);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadFromJsonAsync<UserResponse>(JsonOptions);
            body!.Username.Should().Be("jdoe");
            body.AuthMethod.Should().Be(AuthenticationMethod.CustomAuthentication);

            mock.Verify(
                s =>
                    s.AdminCreateUserAsync(
                        It.Is<AdminCreateUserCommand>(c =>
                            c.Username == "jdoe"
                            && c.Password == "P@ssword123"
                            && c.AuthMethod == AuthenticationMethod.CustomAuthentication
                        ),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    // ── Parent must be linked to at least one Athlete ──────────────

    public sealed class Create_ParentLinkedAthleteRule : CreateUserTests
    {
        public Create_ParentLinkedAthleteRule(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private static AdminCreateUserRequest ParentRequest(
            IReadOnlyList<Guid>? dependentUserIds,
            string roleName = "Parent",
            IReadOnlyList<Guid>? teamIds = null
        ) =>
            new()
            {
                ClubId = TestClubId,
                RoleName = roleName,
                FirstName = "Pat",
                LastName = "Parent",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "pat.parent@example.com",
                DependentUserIds = dependentUserIds,
                TeamIds = teamIds,
            };

        private static Mock<IUserService> ServiceMockReturningCreatedParent()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (
                        new User
                        {
                            Id = Guid.NewGuid(),
                            ClubId = TestClubId,
                            Email = "pat.parent@example.com",
                            DisplayName = "Pat Parent",
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            Roles = ["Parent"],
                        },
                        (string?)null
                    )
                );
            return mock;
        }

        [Fact]
        public async Task Create_WhenParentHasNoDependents_Returns400AndNeverCallsTheService()
        {
            var mock = ServiceMockReturningCreatedParent();
            var client = CreateClient(mock);

            var response = await client.PostAsJsonAsync("/api/users", ParentRequest(null));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            mock.Verify(
                s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task Create_WhenParentHasAnEmptyDependentList_Returns400()
        {
            var client = CreateClient(ServiceMockReturningCreatedParent());

            var response = await client.PostAsJsonAsync("/api/users", ParentRequest([]));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Create_WhenParentHasOneDependent_Returns201()
        {
            var client = CreateClient(ServiceMockReturningCreatedParent());

            var response = await client.PostAsJsonAsync(
                "/api/users",
                ParentRequest([Guid.NewGuid()])
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task Create_WhenRoleIsNotParent_DoesNotRequireDependents()
        {
            var client = CreateClient(ServiceMockReturningCreatedParent());

            // TeamIds set so this only exercises the "not Parent" branch of the dependents rule —
            // Coach has its own linked-team requirement, covered separately below.
            var response = await client.PostAsJsonAsync(
                "/api/users",
                ParentRequest(null, roleName: "Coach", teamIds: [Guid.NewGuid()])
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }
    }

    // ── Coach must be linked to at least one Team ──────────────────

    public sealed class Create_CoachLinkedTeamRule : CreateUserTests
    {
        public Create_CoachLinkedTeamRule(WebApplicationFactory<Program> factory)
            : base(factory) { }

        private static AdminCreateUserRequest CoachRequest(
            IReadOnlyList<Guid>? teamIds,
            string roleName = "Coach"
        ) =>
            new()
            {
                ClubId = TestClubId,
                RoleName = roleName,
                FirstName = "Cam",
                LastName = "Coach",
                AuthMethod = AuthenticationMethod.Credentials,
                Email = "cam.coach@example.com",
                TeamIds = teamIds,
            };

        private static Mock<IUserService> ServiceMockReturningCreatedCoach()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (
                        new User
                        {
                            Id = Guid.NewGuid(),
                            ClubId = TestClubId,
                            Email = "cam.coach@example.com",
                            DisplayName = "Cam Coach",
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            Roles = ["Coach"],
                        },
                        (string?)null
                    )
                );
            return mock;
        }

        [Fact]
        public async Task Create_WhenCoachHasNoTeams_Returns400AndNeverCallsTheService()
        {
            var mock = ServiceMockReturningCreatedCoach();
            var client = CreateClient(mock);

            var response = await client.PostAsJsonAsync("/api/users", CoachRequest(null));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
            mock.Verify(
                s =>
                    s.AdminCreateUserAsync(
                        It.IsAny<AdminCreateUserCommand>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }

        [Fact]
        public async Task Create_WhenCoachHasAnEmptyTeamList_Returns400()
        {
            var client = CreateClient(ServiceMockReturningCreatedCoach());

            var response = await client.PostAsJsonAsync("/api/users", CoachRequest([]));

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }

        [Fact]
        public async Task Create_WhenCoachHasOneTeam_Returns201()
        {
            var client = CreateClient(ServiceMockReturningCreatedCoach());

            var response = await client.PostAsJsonAsync(
                "/api/users",
                CoachRequest([Guid.NewGuid()])
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }

        [Fact]
        public async Task Create_WhenRoleIsNotCoach_DoesNotRequireTeams()
        {
            var client = CreateClient(ServiceMockReturningCreatedCoach());

            var response = await client.PostAsJsonAsync(
                "/api/users",
                CoachRequest(null, roleName: "Director")
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
        }
    }
}
