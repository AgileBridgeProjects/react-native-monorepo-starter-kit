using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Common;
using StarterKit.Core.Models;
using StarterKit.Core.Roles;
using StarterKit.Core.Roles.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Roles.Models;
using StarterKit.WebApi.Common;
using StarterKit.WebApi.Roles.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Roles;

public abstract class RolesControllerTests : WebApiIntegrationTestBase
{
    protected RolesControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IRoleService> roleServiceMock) =>
        CreateClientWithAuth(services =>
        {
            services.AddScoped<IRoleService>(_ => roleServiceMock.Object);
        });

    protected HttpClient CreateClientNoMock() => CreateClientWithAuth(services => { });

    private static Role MakeRole(string name = "TestRole", List<string>? permissions = null) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = null,
            IsActive = true,
            Permissions = permissions ?? [],
        };

    // ── GET /api/roles/permissions ───────────────────────────────────────

    public sealed class GetPermissions_ReturnsGroupedPermissions : RolesControllerTests
    {
        public GetPermissions_ReturnsGroupedPermissions(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_WithAllPermissionsGroupedByGroup()
        {
            var client = CreateClientNoMock();

            var response = await client.GetAsync("/api/roles/permissions");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<List<PermissionGroupResponse>>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!.Should().NotBeEmpty();

            // Every permission in StarterKitPermissions.All must appear exactly once
            var allKeys = body.SelectMany(g => g.Permissions).Select(p => p.Key).ToList();
            allKeys.Should().BeEquivalentTo(StarterKitPermissions.All);

            // Each group must have a group name
            body.Should().AllSatisfy(g => g.Group.Should().NotBeNullOrWhiteSpace());
        }
    }

    public sealed class GetPermissions_EachItemHasDescription : RolesControllerTests
    {
        public GetPermissions_EachItemHasDescription(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns200_AndEachPermissionHasNonEmptyDescription()
        {
            var client = CreateClientNoMock();

            var response = await client.GetAsync("/api/roles/permissions");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<List<PermissionGroupResponse>>(
                JsonOptions
            );
            body!
                .SelectMany(g => g.Permissions)
                .Should()
                .AllSatisfy(p => p.Description.Should().NotBeNullOrWhiteSpace());
        }
    }

    public sealed class GetPermissions_RequiresAuth : RolesControllerTests
    {
        public GetPermissions_RequiresAuth(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Returns401_WhenUnauthenticated()
        {
            // Create an unauthenticated client (no auth scheme)
            var client = Factory
                .WithWebHostBuilder(b =>
                {
                    b.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                    b.UseSetting(
                        "ConnectionStrings:DefaultConnection",
                        "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
                    );
                    b.UseSetting("Firebase:Enabled", "false");
                    b.UseSetting("KeyVault:Name", "");
                    b.UseSetting("AzureStorage:ConnectionString", "UseDevelopmentStorage=true");
                })
                .CreateClient(
                    new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
                    {
                        AllowAutoRedirect = false,
                    }
                );

            var response = await client.GetAsync("/api/roles/permissions");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/roles ───────────────────────────────────────────────────────

    public sealed class List_ReturnsOk : RolesControllerTests
    {
        public List_ReturnsOk(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_ReturnsRoleList()
        {
            var roles = new List<Role> { MakeRole("ClubAdmin"), MakeRole("CustomRole") };
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.ListAsync(It.IsAny<bool>(), It.IsAny<bool>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(roles);

            var client = CreateClient(mock);

            var response = await client.GetAsync("/api/roles");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<RoleListResponse>(JsonOptions);
            body!.Items.Should().HaveCount(2);
        }
    }

    // ── GET /api/roles/{id} ──────────────────────────────────────────────────

    public sealed class GetById_Returns200 : RolesControllerTests
    {
        public GetById_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WhenFound_ReturnsRole()
        {
            var role = MakeRole();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.GetByIdAsync(It.Is<Guid>(id => id == role.Id), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(role);

            var client = CreateClient(mock);

            var response = await client.GetAsync($"/api/roles/{role.Id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<RoleResponse>(JsonOptions);
            body!.Id.Should().Be(role.Id);
        }
    }

    public sealed class GetById_Returns404 : RolesControllerTests
    {
        public GetById_Returns404(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WhenNotFound_Returns404()
        {
            var id = Guid.NewGuid();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.GetByIdAsync(It.Is<Guid>(i => i == id), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(new EntityNotFoundException(nameof(Role), id));

            var client = CreateClient(mock);

            var response = await client.GetAsync($"/api/roles/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/roles ──────────────────────────────────────────────────────

    public sealed class Create_Returns201 : RolesControllerTests
    {
        public Create_Returns201(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_HappyPath_Returns201WithLocation()
        {
            var created = MakeRole("NewRole");
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.CreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<bool>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(created);

            var client = CreateClient(mock);

            var response = await client.PostAsJsonAsync("/api/roles", new { Name = "NewRole" });

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            response.Headers.Location.Should().NotBeNull();
        }
    }

    public sealed class Create_Returns409 : RolesControllerTests
    {
        public Create_Returns409(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_DuplicateName_Returns409()
        {
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.CreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<bool>(),
                        It.IsAny<bool>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException("A role with the name 'NewRole' already exists.")
                );

            var client = CreateClient(mock);

            var response = await client.PostAsJsonAsync("/api/roles", new { Name = "NewRole" });

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    // ── PUT /api/roles/{id} ──────────────────────────────────────────────────

    public sealed class Update_Returns200 : RolesControllerTests
    {
        public Update_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_HappyPath_Returns200()
        {
            var role = MakeRole("UpdatedRole");
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.UpdateAsync(
                        It.Is<Guid>(id => id == role.Id),
                        It.Is<string>(n => n == "UpdatedRole"),
                        It.Is<string?>(d => d == null),
                        It.IsAny<bool>(),
                        It.IsAny<bool>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(role);

            var client = CreateClient(mock);

            var response = await client.PutAsJsonAsync(
                $"/api/roles/{role.Id}",
                new { Name = "UpdatedRole" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ── DELETE /api/roles/{id} ───────────────────────────────────────────────

    public sealed class Deactivate_Returns204 : RolesControllerTests
    {
        public Deactivate_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Deactivate_HappyPath_Returns204()
        {
            var id = Guid.NewGuid();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.DeactivateAsync(It.Is<Guid>(i => i == id), It.IsAny<CancellationToken>())
                )
                .Returns(Task.CompletedTask);

            var client = CreateClient(mock);

            var response = await client.DeleteAsync($"/api/roles/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    // ── PUT /api/roles/{id}/permissions ──────────────────────────────────────

    public sealed class UpdatePermissions_Returns200 : RolesControllerTests
    {
        public UpdatePermissions_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task UpdatePermissions_HappyPath_Returns200()
        {
            var permissions = new List<string> { "StarterKit.Games.View" };
            var role = MakeRole(permissions: permissions);
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.UpdatePermissionsAsync(
                        It.Is<Guid>(id => id == role.Id),
                        It.IsAny<IReadOnlyList<string>>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(role);

            var client = CreateClient(mock);

            var response = await client.PutAsJsonAsync(
                $"/api/roles/{role.Id}/permissions",
                new { Permissions = permissions }
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    // ── Auth failure (401) ───────────────────────────────────────────────────

    public sealed class Unauthenticated_Returns401 : RolesControllerTests
    {
        public Unauthenticated_Returns401(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.GetAsync("/api/roles");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task GetById_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.GetAsync($"/api/roles/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Create_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.PostAsJsonAsync(
                "/api/roles",
                new { Name = "Unauthorized" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Update_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.PutAsJsonAsync(
                $"/api/roles/{Guid.NewGuid()}",
                new { Name = "Unauthorized" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Deactivate_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.DeleteAsync($"/api/roles/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task Activate_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.PostAsync($"/api/roles/{Guid.NewGuid()}/activate", null);

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        [Fact]
        public async Task UpdatePermissions_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.PutAsJsonAsync(
                $"/api/roles/{Guid.NewGuid()}/permissions",
                new { Permissions = new[] { "StarterKit.Games.View" } }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── DELETE /api/roles/{id} — conflict guards ─────────────────────────────

    public sealed class Deactivate_Returns409_WhenSystemRole : RolesControllerTests
    {
        public Deactivate_Returns409_WhenSystemRole(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Deactivate_SystemRole_Returns409()
        {
            var id = Guid.NewGuid();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.DeactivateAsync(It.Is<Guid>(i => i == id), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(
                    new ConflictException(
                        "System roles cannot be deactivated.",
                        errorCode: "system-role"
                    )
                );

            var client = CreateClient(mock);

            var response = await client.DeleteAsync($"/api/roles/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    public sealed class Deactivate_Returns409_WhenHasActiveUsers : RolesControllerTests
    {
        public Deactivate_Returns409_WhenHasActiveUsers(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Deactivate_RoleWithActiveUsers_Returns409()
        {
            var id = Guid.NewGuid();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.DeactivateAsync(It.Is<Guid>(i => i == id), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(
                    new ConflictException(
                        "This role still has users assigned to it.",
                        errorCode: "role-has-active-users"
                    )
                );

            var client = CreateClient(mock);

            var response = await client.DeleteAsync($"/api/roles/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    // ── GET /api/roles/{id}/assignments ──────────────────────────────────────

    public sealed class GetAssignments_Returns200 : RolesControllerTests
    {
        public GetAssignments_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetAssignments_HappyPath_Returns200WithList()
        {
            var roleId = Guid.NewGuid();
            var assignments = new List<RoleUserAssignmentProjection>
            {
                new()
                {
                    UserId = Guid.NewGuid(),
                    DisplayName = "Alice Smith",
                    Email = "alice@example.com",
                    ClubId = Guid.NewGuid(),
                    ClubName = "Acme Corp",
                },
            };

            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.GetAssignmentsAsync(
                        It.Is<Guid>(i => i == roleId),
                        It.IsAny<RoleAssignmentsQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new PagedResult<RoleUserAssignmentProjection>
                    {
                        Items = assignments,
                        TotalCount = 1,
                        Page = PagingConstants.DefaultPage,
                        PageSize = PagingConstants.DefaultPageSize,
                    }
                );

            var client = CreateClient(mock);

            var response = await client.GetAsync($"/api/roles/{roleId}/assignments");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<
                PagedResponse<StarterKit.WebApi.Roles.DTOs.RoleUserAssignmentResponse>
            >(JsonOptions);
            body!.Items.Should().HaveCount(1);
            body.Items[0].DisplayName.Should().Be("Alice Smith");
            body.Items[0].Email.Should().Be("alice@example.com");
            body.Items[0].ClubName.Should().Be("Acme Corp");
            body.TotalCount.Should().Be(1);
            body.Page.Should().Be(PagingConstants.DefaultPage);
            body.PageSize.Should().Be(PagingConstants.DefaultPageSize);
        }
    }

    public sealed class GetAssignments_Returns404_WhenRoleNotFound : RolesControllerTests
    {
        public GetAssignments_Returns404_WhenRoleNotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetAssignments_UnknownRole_Returns404()
        {
            var roleId = Guid.NewGuid();
            var mock = new Mock<IRoleService>();
            mock.Setup(s =>
                    s.GetAssignmentsAsync(
                        It.Is<Guid>(i => i == roleId),
                        It.IsAny<RoleAssignmentsQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException(nameof(Role), roleId));

            var client = CreateClient(mock);

            var response = await client.GetAsync($"/api/roles/{roleId}/assignments");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
