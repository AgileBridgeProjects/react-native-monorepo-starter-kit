using FluentAssertions;
using Moq;
using StarterKit.Auth.Interfaces;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.MobileApi.Dev;

namespace StarterKit.MobileApi.Tests.Dev.Services;

public abstract class DevBootstrapServiceTests
{
    private static readonly Guid StarterKitClubId = new("00000000-0000-0000-0000-000000000010");
    private static readonly Guid DevPhoneTestUserId = new("00000000-0000-0000-0000-000000000020");

    protected readonly Mock<ISupabaseAuthService> SupabaseAuthMock = new();
    protected readonly Mock<IUserService> UserServiceMock = new();
    protected readonly DevBootstrapService Sut;

    protected DevBootstrapServiceTests()
    {
        Sut = new DevBootstrapService(SupabaseAuthMock.Object, UserServiceMock.Object);
    }

    /// <summary>
    /// Configures <see cref="ISupabaseAuthService.ValidateToken"/> to return a token whose
    /// subject is <paramref name="subject"/> and whose phone claim is <paramref name="phoneNumber"/>.
    /// </summary>
    protected void SetupTokenValidation(string subject, string? phoneNumber)
    {
        SupabaseAuthMock
            .Setup(s => s.ValidateToken(It.IsAny<string>()))
            .Returns(
                new SupabaseToken(
                    Subject: subject,
                    Email: null,
                    Name: null,
                    Phone: phoneNumber,
                    ClubId: null,
                    ClubSubdomain: null
                )
            );
    }

    public sealed class WhenTokenInvalid : DevBootstrapServiceTests
    {
        [Fact]
        public async Task ThrowsUnauthorized_WhenValidateTokenReturnsNull()
        {
            SupabaseAuthMock
                .Setup(s => s.ValidateToken(It.IsAny<string>()))
                .Returns((SupabaseToken?)null);

            var act = () => Sut.BootstrapPhoneUserAsync("bad-token");

            await act.Should().ThrowAsync<UnauthorizedAccessException>();
        }
    }

    public sealed class WhenDevTestPhoneNumber : DevBootstrapServiceTests
    {
        [Fact]
        public async Task LinksExternalAuthId_ToSeededTestUser()
        {
            SetupTokenValidation("supabase-sub-test", "+27123456789");

            var linkedUser = new User
            {
                Id = DevPhoneTestUserId,
                ExternalAuthId = "supabase-sub-test",
                Email = string.Empty,
                DisplayName = "+27123456789",
            };

            UserServiceMock
                .Setup(u =>
                    u.LinkExternalAuthIdAsync(
                        DevPhoneTestUserId,
                        "supabase-sub-test",
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(linkedUser);

            var result = await Sut.BootstrapPhoneUserAsync("test-supabase-token");

            result.UserId.Should().Be(DevPhoneTestUserId);
            result.ClubId.Should().Be(StarterKitClubId);
            UserServiceMock.Verify(
                u =>
                    u.LinkExternalAuthIdAsync(
                        DevPhoneTestUserId,
                        "supabase-sub-test",
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task DoesNotCallGetOrCreate_ForTestPhoneNumber()
        {
            SetupTokenValidation("supabase-sub-test", "+27123456789");

            UserServiceMock
                .Setup(u =>
                    u.LinkExternalAuthIdAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = DevPhoneTestUserId,
                        ExternalAuthId = "supabase-sub-test",
                        Email = string.Empty,
                        DisplayName = "+27123456789",
                    }
                );

            await Sut.BootstrapPhoneUserAsync("test-supabase-token");

            UserServiceMock.Verify(
                u =>
                    u.GetOrCreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<Guid>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }

    public sealed class WhenOtherPhoneNumber : DevBootstrapServiceTests
    {
        [Fact]
        public async Task CreatesUserInDevClub()
        {
            SetupTokenValidation("supabase-sub-other", "+27999888777");

            var createdUser = new User
            {
                Id = Guid.NewGuid(),
                ExternalAuthId = "supabase-sub-other",
                Email = string.Empty,
                DisplayName = "+27999888777",
            };

            UserServiceMock
                .Setup(u =>
                    u.GetOrCreateAsync(
                        "supabase-sub-other",
                        string.Empty,
                        "+27999888777",
                        StarterKitClubId,
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(createdUser);

            var result = await Sut.BootstrapPhoneUserAsync("test-supabase-token");

            result.UserId.Should().Be(createdUser.Id);
            result.ClubId.Should().Be(StarterKitClubId);
        }

        [Fact]
        public async Task AssignsAthleteRole()
        {
            SetupTokenValidation("supabase-sub-other", "+27999888777");

            var userId = Guid.NewGuid();
            UserServiceMock
                .Setup(u =>
                    u.GetOrCreateAsync(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<Guid>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = userId,
                        ExternalAuthId = "supabase-sub-other",
                        Email = string.Empty,
                        DisplayName = "+27999888777",
                    }
                );

            UserServiceMock
                .Setup(u => u.AssignRoleAsync(userId, "Athlete", It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new User
                    {
                        Id = userId,
                        ExternalAuthId = "supabase-sub-other",
                        Email = string.Empty,
                        DisplayName = "+27999888777",
                        Roles = ["Athlete"],
                    }
                );

            await Sut.BootstrapPhoneUserAsync("test-supabase-token");

            UserServiceMock.Verify(
                u => u.AssignRoleAsync(userId, "Athlete", It.IsAny<CancellationToken>()),
                Times.Once
            );
        }

        [Fact]
        public async Task UsesPhoneUserDisplayName_WhenPhoneNumberIsEmpty()
        {
            SetupTokenValidation("supabase-sub-nophone", null);

            UserServiceMock
                .Setup(u =>
                    u.GetOrCreateAsync(
                        "supabase-sub-nophone",
                        string.Empty,
                        "Phone User",
                        StarterKitClubId,
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = Guid.NewGuid(),
                        ExternalAuthId = "supabase-sub-nophone",
                        Email = string.Empty,
                        DisplayName = "Phone User",
                    }
                );

            await Sut.BootstrapPhoneUserAsync("test-supabase-token");

            UserServiceMock.Verify(
                u =>
                    u.GetOrCreateAsync(
                        "supabase-sub-nophone",
                        string.Empty,
                        "Phone User",
                        StarterKitClubId,
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }
    }
}
