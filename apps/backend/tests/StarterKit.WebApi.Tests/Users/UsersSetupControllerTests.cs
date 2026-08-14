using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using StarterKit.Auth.RateLimiting;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Data.AccountSetup.Enums;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Tests.Infrastructure;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Tests.Users;

public abstract class UsersSetupControllerTests : WebApiIntegrationTestBase
{
    protected UsersSetupControllerTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    /// <summary>
    /// Creates an unauthenticated client (no TestAuthHandler) with the given
    /// <see cref="IUserService"/> mock — matches the [AllowAnonymous] setup endpoints.
    /// </summary>
    protected HttpClient CreateAnonymousClient(Mock<IUserService> userServiceMock) =>
        Factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddScoped<IUserService>(_ => userServiceMock.Object);
                });
            })
            .CreateClient();

    // ── GET /api/users/setup/validate ────────────────────────────────────────

    public sealed class Validate_Returns200 : UsersSetupControllerTests
    {
        public Validate_Returns200(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Validate_WhenTokenValid_Returns200WithEmail()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s => s.ValidateSetupTokenAsync("valid-token", It.IsAny<CancellationToken>()))
                .ReturnsAsync(("user@example.com", SetupTokenPurpose.AccountSetup));

            var client = CreateAnonymousClient(mock);
            var response = await client.GetAsync("/api/users/setup/validate?token=valid-token");

            response.StatusCode.Should().Be(HttpStatusCode.OK);
            var body = await response.Content.ReadFromJsonAsync<ValidateSetupTokenResponse>(
                JsonOptions
            );
            body.Should().NotBeNull();
            body!.Email.Should().Be("user@example.com");
            body.Purpose.Should().Be(SetupTokenPurpose.AccountSetup);
        }
    }

    public sealed class Validate_Returns400_WhenTokenMissing : UsersSetupControllerTests
    {
        public Validate_Returns400_WhenTokenMissing(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Validate_WhenTokenEmpty_Returns400()
        {
            var mock = new Mock<IUserService>();
            var client = CreateAnonymousClient(mock);

            var response = await client.GetAsync("/api/users/setup/validate?token=");

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    public sealed class Validate_Returns404_WhenTokenNotFound : UsersSetupControllerTests
    {
        public Validate_Returns404_WhenTokenNotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Validate_WhenTokenExpiredOrNotFound_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.ValidateSetupTokenAsync("expired-token", It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(new EntityNotFoundException("UserSetupToken", Guid.Empty));

            var client = CreateAnonymousClient(mock);
            var response = await client.GetAsync("/api/users/setup/validate?token=expired-token");

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    // ── POST /api/users/setup/complete ───────────────────────────────────────

    public sealed class Complete_Returns204 : UsersSetupControllerTests
    {
        public Complete_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Complete_WhenValid_Returns204()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                s.CompleteSetupAsync("valid-token", "StrongP@ss1!", It.IsAny<CancellationToken>())
            );

            var client = CreateAnonymousClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/users/setup/complete",
                new CompleteSetupRequest { Token = "valid-token", NewPassword = "StrongP@ss1!" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
            mock.Verify(
                s =>
                    s.CompleteSetupAsync(
                        "valid-token",
                        "StrongP@ss1!",
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }

    public sealed class Complete_Returns404_WhenTokenNotFound : UsersSetupControllerTests
    {
        public Complete_Returns404_WhenTokenNotFound(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Complete_WhenTokenInvalid_Returns404()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.CompleteSetupAsync(
                        "bad-token",
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ThrowsAsync(new EntityNotFoundException("UserSetupToken", Guid.Empty));

            var client = CreateAnonymousClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/users/setup/complete",
                new CompleteSetupRequest { Token = "bad-token", NewPassword = "StrongP@ss1!" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }

    public sealed class Complete_Returns400_WhenPasswordRejected : UsersSetupControllerTests
    {
        public Complete_Returns400_WhenPasswordRejected(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Complete_WhenPasswordInvalid_Returns400()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.CompleteSetupAsync("valid-token", "weak", It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(
                    new ArgumentException("Password does not meet complexity requirements.")
                );

            var client = CreateAnonymousClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/users/setup/complete",
                new CompleteSetupRequest { Token = "valid-token", NewPassword = "weak" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }

    // ── POST /api/users/setup/password-reset/request ─────────────────────────

    public sealed class PasswordReset_Returns204 : UsersSetupControllerTests
    {
        public PasswordReset_Returns204(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task PasswordReset_AlwaysReturns204_PreventingUserEnumeration()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.RequestPasswordResetAsync(
                        "unknown@example.com",
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((string?)null);

            var client = CreateAnonymousClient(mock);
            var response = await client.PostAsJsonAsync(
                "/api/users/setup/password-reset/request",
                new RequestPasswordResetRequest { Email = "unknown@example.com" }
            );

            // Non-dev environment returns 204 regardless of whether the email exists (OWASP).
            response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }
    }

    // ── Rate limiting (429) ──────────────────────────────────────────────────

    public sealed class PasswordReset_Returns429_WhenRateLimited : UsersSetupControllerTests
    {
        public PasswordReset_Returns429_WhenRateLimited(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task PasswordReset_WhenLimitExceeded_Returns429WithRetryAfter()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.RequestPasswordResetAsync(
                        It.IsAny<string>(),
                        It.IsAny<bool>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((string?)null);

            var client = CreateAnonymousClient(mock);

            // Exhaust the 5-request limit
            for (var i = 0; i < 5; i++)
            {
                await client.PostAsJsonAsync(
                    "/api/users/setup/password-reset/request",
                    new RequestPasswordResetRequest { Email = $"user{i}@example.com" }
                );
            }

            var response = await client.PostAsJsonAsync(
                "/api/users/setup/password-reset/request",
                new RequestPasswordResetRequest { Email = "user6@example.com" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response.Headers.Contains("Retry-After").Should().BeTrue();
        }
    }

    public sealed class Validate_Returns429_WhenRateLimited : UsersSetupControllerTests
    {
        public Validate_Returns429_WhenRateLimited(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Validate_WhenLimitExceeded_Returns429WithRetryAfter()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.ValidateSetupTokenAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(("user@example.com", SetupTokenPurpose.AccountSetup));

            var client = CreateAnonymousClient(mock);

            // Exhaust the 10-request limit
            for (var i = 0; i < 10; i++)
                await client.GetAsync("/api/users/setup/validate?token=valid-token");

            var response = await client.GetAsync("/api/users/setup/validate?token=valid-token");

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response.Headers.Contains("Retry-After").Should().BeTrue();
        }
    }

    public sealed class Complete_Returns429_WhenRateLimited : UsersSetupControllerTests
    {
        public Complete_Returns429_WhenRateLimited(WebApplicationFactory<Program> factory)
            : base(factory) { }

        [Fact]
        public async Task Complete_WhenLimitExceeded_Returns429WithRetryAfter()
        {
            var mock = new Mock<IUserService>();
            mock.Setup(s =>
                    s.CompleteSetupAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);

            var client = CreateAnonymousClient(mock);

            // Exhaust the 5-request limit
            for (var i = 0; i < 5; i++)
            {
                await client.PostAsJsonAsync(
                    "/api/users/setup/complete",
                    new CompleteSetupRequest { Token = $"token{i}", NewPassword = "StrongP@ss1!" }
                );
            }

            var response = await client.PostAsJsonAsync(
                "/api/users/setup/complete",
                new CompleteSetupRequest { Token = "token6", NewPassword = "StrongP@ss1!" }
            );

            response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
            response.Headers.Contains("Retry-After").Should().BeTrue();
        }
    }
}
