using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Users.DTOs;
using StarterKit.WebApi.Tests.Infrastructure;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Tests.Users;

public abstract class UsersBulkUploadControllerTests : WebApiIntegrationTestBase
{
    protected UsersBulkUploadControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected HttpClient CreateClient(Mock<IUserService> userServiceMock)
    {
        return CreateClientWithAuth(services =>
        {
            services.AddScoped<IUserService>(_ => userServiceMock.Object);
        });
    }

    // ── GET /api/users/bulk-upload/template ──────────────────────────────────

    public sealed class GetTemplate_HappyPath : UsersBulkUploadControllerTests
    {
        public GetTemplate_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task GetTemplate_ReturnsOkWithXlsxContent()
        {
            var clubId = Guid.NewGuid();

            var serviceMock = new Mock<IUserService>();
            serviceMock
                .Setup(s => s.GetBulkUploadTemplateAsync(clubId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([0x50, 0x4B, 0x03, 0x04]); // XLSX magic bytes

            var client = CreateClient(serviceMock);
            var response = await client.GetAsync(
                $"/api/users/bulk-upload/template?clubId={clubId}"
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            response
                .Content.Headers.ContentType!.MediaType.Should()
                .Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        }

        [Fact]
        public async Task GetTemplate_WithoutAuth_Returns401()
        {
            var client = Factory.CreateClient();
            var response = await client.GetAsync("/api/users/bulk-upload/template");
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── POST /api/users/bulk-upload/preview ──────────────────────────────────

    public sealed class PreviewBulkUpload_HappyPath : UsersBulkUploadControllerTests
    {
        public PreviewBulkUpload_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Preview_WithValidRequest_Returns200WithPreviewBody()
        {
            var clubId = Guid.NewGuid();
            var previewDto = new BulkUploadPreviewDto(
                ReadyToAdd:
                [
                    new BulkUploadValidUserDto(
                        RowNumber: 2,
                        FirstName: "John",
                        LastName: "Doe",
                        Email: "john@example.com",
                        PhoneNumber: null,
                        CountryCode: null,
                        AuthMethod: StarterKit.Data.Clubs.Enums.AuthenticationMethod.Credentials,
                        RoleName: "Athlete",
                        TeamName: null,
                        TeamId: null,
                        Username: null
                    ),
                ],
                ValidationErrors: [],
                Duplicates: [],
                Unprocessable: [],
                TotalRows: 1
            );

            var serviceMock = new Mock<IUserService>();
            serviceMock
                .Setup(s =>
                    s.PreviewBulkUploadAsync(
                        clubId,
                        null,
                        It.IsAny<Stream>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(previewDto);

            var client = CreateClient(serviceMock);

            using var fileBytes = new ByteArrayContent([0x50, 0x4B]);
            fileBytes.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            using var content = new MultipartFormDataContent();
            content.Add(fileBytes, "file", "test.xlsx");

            var response = await client.PostAsync(
                $"/api/users/bulk-upload/preview?clubId={clubId}",
                content
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<BulkUploadPreviewResponse>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!.ReadyToAdd.Should().HaveCount(1);
            body.TotalRows.Should().Be(1);
        }

        [Fact]
        public async Task Preview_WithoutAuth_Returns401()
        {
            var client = Factory.CreateClient();
            using var fileBytes = new ByteArrayContent([0x50, 0x4B]);
            using var content = new MultipartFormDataContent();
            content.Add(fileBytes, "file", "test.xlsx");
            var response = await client.PostAsync(
                $"/api/users/bulk-upload/preview?clubId={Guid.NewGuid()}",
                content
            );
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }

    // ── POST /api/users/bulk-upload/confirm ──────────────────────────────────

    public sealed class ConfirmBulkUpload_HappyPath : UsersBulkUploadControllerTests
    {
        public ConfirmBulkUpload_HappyPath(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Confirm_WithValidRequest_Returns200WithCounts()
        {
            var confirmDto = new BulkUploadConfirmDto(
                CreatedCount: 3,
                FailedCount: 0,
                Failures: []
            );

            var serviceMock = new Mock<IUserService>();
            serviceMock
                .Setup(s =>
                    s.ConfirmBulkUploadAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<IReadOnlyList<BulkUploadValidUserDto>>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(confirmDto);

            var client = CreateClient(serviceMock);
            var request = new BulkUploadConfirmRequest
            {
                ClubId = Faker.Random.Guid(),
                ValidRows = [],
            };

            var response = await client.PostAsJsonAsync(
                "/api/users/bulk-upload/confirm",
                request,
                JsonOptions
            );

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<BulkUploadConfirmResponse>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!.CreatedCount.Should().Be(3);
            body.FailedCount.Should().Be(0);
        }

        [Fact]
        public async Task Confirm_WithoutAuth_Returns401()
        {
            var client = Factory.CreateClient();
            using var body = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
            var response = await client.PostAsync("/api/users/bulk-upload/confirm", body);
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }
    }
}
