using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Teams.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Teams.Enums;
using StarterKit.Data.Teams.Models;
using StarterKit.WebApi.Teams.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;

namespace StarterKit.WebApi.Tests.Teams;

public abstract class TeamControllerTests : WebApiIntegrationTestBase
{
    protected TeamControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<ITeamService> serviceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<ITeamService>(_ => serviceMock.Object);
        });
    }

    // ── GET /api/teams ──────────────────────────────────────────────────

    public sealed class List_HappyPath : TeamControllerTests
    {
        public List_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_WithValidQuery_Returns200WithTeams()
        {
            var team = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = Guid.NewGuid(),
                Name = Faker.Company.CompanyName(),
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.ListAsync(
                        It.IsAny<StarterKit.Core.Teams.TeamListQuery>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new PagedResult<TeamListItem>
                    {
                        Items = [new TeamListItem(team, 0)],
                        TotalCount = 1,
                        Page = 1,
                        PageSize = 20,
                    }
                );

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync("/api/teams");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<TeamListResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Items.Should().HaveCount(1);
            body.Items[0].Name.Should().Be(team.Name);
        }
    }

    public sealed class List_Unauthenticated : TeamControllerTests
    {
        public List_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_WithNoAuth_Returns401()
        {
            var client = Factory
                .WithWebHostBuilder(builder =>
                {
                    builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
                    builder.UseSetting(
                        "ConnectionStrings:DefaultConnection",
                        "Server=.;Database=StarterKit_Test;TrustServerCertificate=True"
                    );
                    builder.UseSetting("Firebase:Enabled", "false");
                    builder.UseSetting("KeyVault:Name", "");
                })
                .CreateClient();

            var response = await client.GetAsync("/api/teams");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/teams/{id} ─────────────────────────────────────────────

    public sealed class GetById_HappyPath : TeamControllerTests
    {
        public GetById_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WithExistingId_Returns200()
        {
            var id = Guid.NewGuid();
            var team = new Team
            {
                Id = id,
                SeasonId = Guid.NewGuid(),
                Name = Faker.Company.CompanyName(),
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(team);

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync($"/api/teams/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<TeamResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Id.Should().Be(id);
            body.Name.Should().Be(team.Name);
        }
    }

    public sealed class GetById_NotFound : TeamControllerTests
    {
        public GetById_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s => s.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("Team", Guid.Empty));

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync($"/api/teams/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/seasons/{seasonId}/teams ──────────────────────────────

    public sealed class Create_HappyPath : TeamControllerTests
    {
        public Create_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WithValidRequest_Returns201()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Company.CompanyName();
            var created = new Team
            {
                Id = Guid.NewGuid(),
                SeasonId = seasonId,
                Name = name,
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.CreateAsync(
                        seasonId,
                        name,
                        It.IsAny<string?>(),
                        It.IsAny<AgeGroup?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(created);

            var client = CreateClient(serviceMock);
            var request = new CreateTeamRequest { Name = name };

            var response = await client.PostAsJsonAsync(
                $"/api/seasons/{seasonId}/teams",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadFromJsonAsync<TeamResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Name.Should().Be(name);
        }
    }

    public sealed class Update_HappyPath : TeamControllerTests
    {
        public Update_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WithValidRequest_Returns200()
        {
            var id = Guid.NewGuid();
            var newName = Faker.Company.CompanyName();
            var updated = new Team
            {
                Id = id,
                SeasonId = Guid.NewGuid(),
                Name = newName,
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        id,
                        newName,
                        It.IsAny<string?>(),
                        It.IsAny<AgeGroup?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(updated);

            var client = CreateClient(serviceMock);
            var request = new UpdateTeamRequest { Name = newName };

            var response = await client.PutAsJsonAsync($"/api/teams/{id}", request, JsonOptions);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<TeamResponse>(JsonOptions);
            body!.Name.Should().Be(newName);
        }
    }

    public sealed class Update_NotFound : TeamControllerTests
    {
        public Update_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<AgeGroup?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException("Team", Guid.Empty));

            var client = CreateClient(serviceMock);
            var request = new UpdateTeamRequest { Name = "Updated" };

            var response = await client.PutAsJsonAsync(
                $"/api/teams/{Guid.NewGuid()}",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── DELETE /api/teams/{id} ──────────────────────────────────────────

    public sealed class Delete_HappyPath : TeamControllerTests
    {
        public Delete_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WithExistingId_Returns204()
        {
            var id = Guid.NewGuid();

            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s => s.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(serviceMock);

            var response = await client.DeleteAsync($"/api/teams/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            serviceMock.Verify(s => s.DeleteAsync(id, It.IsAny<CancellationToken>()), Times.Once);
        }
    }

    public sealed class Delete_NotFound : TeamControllerTests
    {
        public Delete_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("Team", Guid.Empty));

            var client = CreateClient(serviceMock);

            var response = await client.DeleteAsync($"/api/teams/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/seasons/{id}/teams — duplicate ──────────────────────

    public sealed class Create_DuplicateName : TeamControllerTests
    {
        public Create_DuplicateName(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WhenNameAlreadyExists_Returns409()
        {
            var seasonId = Guid.NewGuid();
            var name = Faker.Company.CompanyName();
            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.CreateAsync(
                        seasonId,
                        name,
                        It.IsAny<string?>(),
                        It.IsAny<AgeGroup?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException($"A team named '{name}' already exists in this season.")
                );

            var client = CreateClient(serviceMock);
            var request = new CreateTeamRequest { Name = name };

            var response = await client.PostAsJsonAsync(
                $"/api/seasons/{seasonId}/teams",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    // ── PUT /api/teams/{id} — duplicate ─────────────────────────────────

    public sealed class Update_DuplicateName : TeamControllerTests
    {
        public Update_DuplicateName(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WhenNameAlreadyExists_Returns409()
        {
            var id = Guid.NewGuid();
            var name = Faker.Company.CompanyName();
            var serviceMock = new Mock<ITeamService>();
            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        id,
                        name,
                        It.IsAny<string?>(),
                        It.IsAny<AgeGroup?>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(
                    new ConflictException($"A team named '{name}' already exists in this season.")
                );

            var client = CreateClient(serviceMock);
            var request = new UpdateTeamRequest { Name = name };

            var response = await client.PutAsJsonAsync($"/api/teams/{id}", request, JsonOptions);

            response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        }
    }

    // ── Unauthenticated (401) for all endpoints ───────────────────────────────

    public sealed class GetById_Unauthenticated : TeamControllerTests
    {
        public GetById_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.GetAsync($"/api/teams/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class Create_Unauthenticated : TeamControllerTests
    {
        public Create_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();
            var request = new CreateTeamRequest { Name = Faker.Company.CompanyName() };

            var response = await client.PostAsJsonAsync(
                $"/api/seasons/{Guid.NewGuid()}/teams",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class Update_Unauthenticated : TeamControllerTests
    {
        public Update_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();
            var request = new UpdateTeamRequest { Name = Faker.Company.CompanyName() };

            var response = await client.PutAsJsonAsync(
                $"/api/teams/{Guid.NewGuid()}",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    public sealed class Delete_Unauthenticated : TeamControllerTests
    {
        public Delete_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WithNoAuth_Returns401()
        {
            var client = Factory.CreateClient();

            var response = await client.DeleteAsync($"/api/teams/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
