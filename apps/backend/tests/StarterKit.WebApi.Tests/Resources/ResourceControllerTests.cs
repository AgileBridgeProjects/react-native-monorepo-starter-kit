using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Common;
using StarterKit.Core.Resources;
using StarterKit.Core.Resources.Interfaces.Services;
using StarterKit.Data.Exceptions;
using StarterKit.Data.Resources.Enums;
using StarterKit.Data.Resources.Models;
using StarterKit.WebApi.Resources.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;
using CoreResourceListQuery = StarterKit.Core.Resources.ResourceListQuery;

namespace StarterKit.WebApi.Tests.Resources;

public abstract class ResourceControllerTests : WebApiIntegrationTestBase
{
    protected ResourceControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IResourceService> serviceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IResourceService>(_ => serviceMock.Object);
        });
    }

    // ── GET /api/resources ────────────────────────────────────────────────────

    public sealed class List_HappyPath : ResourceControllerTests
    {
        public List_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task List_WithValidQuery_Returns200WithResources()
        {
            var resource = new Resource
            {
                Id = Guid.NewGuid(),
                Title = Faker.Lorem.Sentence(),
                SourceType = ResourceSourceType.Url,
                StorageUrl = Faker.Internet.Url(),
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s =>
                    s.ListAsync(It.IsAny<CoreResourceListQuery>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(
                    new PagedResult<Resource>
                    {
                        Items = [resource],
                        TotalCount = 1,
                        Page = 1,
                        PageSize = 20,
                    }
                );

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync("/api/resources");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ResourceListResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Items.Should().HaveCount(1);
            body.Items[0].Title.Should().Be(resource.Title);
        }
    }

    public sealed class List_Unauthenticated : ResourceControllerTests
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

            var response = await client.GetAsync("/api/resources");

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── GET /api/resources/{id} ───────────────────────────────────────────────

    public sealed class GetById_HappyPath : ResourceControllerTests
    {
        public GetById_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WithExistingId_Returns200()
        {
            var id = Guid.NewGuid();
            var resource = new Resource
            {
                Id = id,
                Title = Faker.Lorem.Sentence(),
                SourceType = ResourceSourceType.File,
                StorageUrl = Faker.Internet.Url(),
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(resource);

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync($"/api/resources/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ResourceResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Id.Should().Be(id);
            body.Title.Should().Be(resource.Title);
        }
    }

    public sealed class GetById_NotFound : ResourceControllerTests
    {
        public GetById_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetById_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s => s.GetAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("Resource", Guid.Empty));

            var client = CreateClient(serviceMock);

            var response = await client.GetAsync($"/api/resources/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/resources ───────────────────────────────────────────────────

    public sealed class Create_HappyPath : ResourceControllerTests
    {
        public Create_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WithValidRequest_Returns201()
        {
            var title = Faker.Lorem.Sentence();
            var url = Faker.Internet.Url();
            var created = new Resource
            {
                Id = Guid.NewGuid(),
                Title = title,
                SourceType = ResourceSourceType.Url,
                StorageUrl = url,
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s =>
                    s.CreateAsync(
                        title,
                        ResourceSourceType.Url,
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(created);

            var client = CreateClient(serviceMock);

            var content = new MultipartFormDataContent();
            content.Add(new StringContent(title), "Title");
            content.Add(new StringContent(((int)ResourceSourceType.Url).ToString()), "SourceType");
            var fileContent = new ByteArrayContent([1, 2, 3]);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                "text/plain"
            );
            content.Add(fileContent, "File", "test.txt");

            var response = await client.PostAsync("/api/resources", content);

            response.StatusCode.Should().Be(HttpStatusCode.Created);
            var body = await response.Content.ReadFromJsonAsync<ResourceResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Title.Should().Be(title);
        }
    }

    public sealed class Create_Unauthenticated : ResourceControllerTests
    {
        public Create_Unauthenticated(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Create_WithNoAuth_Returns401()
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

            var response = await client.PostAsync(
                "/api/resources",
                new MultipartFormDataContent
                {
                    { new StringContent("Test"), "Title" },
                    { new StringContent(((int)ResourceSourceType.Url).ToString()), "SourceType" },
                }
            );

            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── PUT /api/resources/{id} ───────────────────────────────────────────────

    public sealed class Update_HappyPath : ResourceControllerTests
    {
        public Update_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WithExistingId_Returns200()
        {
            var id = Guid.NewGuid();
            var existing = new Resource
            {
                Id = id,
                Title = "Old Title",
                SourceType = ResourceSourceType.File,
                StorageUrl = "https://old.url",
                CreatedAt = DateTime.UtcNow,
            };
            var newTitle = Faker.Lorem.Sentence();
            var newUrl = Faker.Internet.Url();
            var updated = new Resource
            {
                Id = id,
                Title = newTitle,
                SourceType = ResourceSourceType.Url,
                StorageUrl = newUrl,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        id,
                        newTitle,
                        ResourceSourceType.Url,
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(updated);

            var client = CreateClient(serviceMock);

            var content = new MultipartFormDataContent();
            content.Add(new StringContent(newTitle), "Title");
            content.Add(new StringContent(((int)ResourceSourceType.Url).ToString()), "SourceType");
            var fileContent = new ByteArrayContent([1, 2, 3]);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                "text/plain"
            );
            content.Add(fileContent, "File", "test.txt");

            var response = await client.PutAsync($"/api/resources/{id}", content);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ResourceResponse>(JsonOptions);
            body.Should().NotBeNull();
            body!.Title.Should().Be(newTitle);
        }
    }

    public sealed class Update_NotFound : ResourceControllerTests
    {
        public Update_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Update_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s =>
                    s.UpdateAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<ResourceSourceType>(),
                        It.IsAny<UploadedFile>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException("Resource", It.IsAny<Guid>()));

            var client = CreateClient(serviceMock);

            var content = new MultipartFormDataContent();
            content.Add(new StringContent("Title"), "Title");
            content.Add(new StringContent(((int)ResourceSourceType.Url).ToString()), "SourceType");
            var fileContent = new ByteArrayContent([1, 2, 3]);
            fileContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                "text/plain"
            );
            content.Add(fileContent, "File", "test.txt");

            var response = await client.PutAsync($"/api/resources/{Guid.NewGuid()}", content);

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── DELETE /api/resources/{id} ────────────────────────────────────────────

    public sealed class Delete_HappyPath : ResourceControllerTests
    {
        public Delete_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WithExistingId_Returns204()
        {
            var id = Guid.NewGuid();
            var existing = new Resource
            {
                Id = id,
                Title = Faker.Lorem.Sentence(),
                SourceType = ResourceSourceType.Text,
                StorageUrl = Faker.Lorem.Paragraph(),
                CreatedAt = DateTime.UtcNow,
            };

            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s => s.DeleteAsync(id, It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var client = CreateClient(serviceMock);

            var response = await client.DeleteAsync($"/api/resources/{id}");

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    public sealed class Delete_NotFound : ResourceControllerTests
    {
        public Delete_NotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Delete_WithMissingId_Returns404()
        {
            var serviceMock = new Mock<IResourceService>();
            serviceMock
                .Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new EntityNotFoundException("Resource", Guid.Empty));

            var client = CreateClient(serviceMock);

            var response = await client.DeleteAsync($"/api/resources/{Guid.NewGuid()}");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
