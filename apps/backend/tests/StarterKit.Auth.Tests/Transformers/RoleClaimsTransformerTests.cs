using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Transformers;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;

namespace StarterKit.Auth.Tests.Transformers;

public abstract class RoleClaimsTransformerTests
{
    private static readonly Guid ClubId = Guid.NewGuid();
    private static readonly Guid UserId = Guid.NewGuid();
    private const string ExternalAuthId = "firebase-uid-123";
    private const string Email = "test@example.com";
    private const string DisplayName = "Test User";

    protected readonly Mock<IUserService> UserServiceMock = new();
    protected readonly Mock<IClubService> ClubServiceMock = new();
    protected readonly Mock<IAuthClaimsService> AuthClaimsServiceMock = new();
    protected readonly RoleClaimsTransformer Sut;

    protected RoleClaimsTransformerTests()
    {
        // Default: the club referenced by the JWT claim exists.
        ClubServiceMock
            .Setup(s => s.ExistsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        Sut = new RoleClaimsTransformer(
            UserServiceMock.Object,
            AuthClaimsServiceMock.Object,
            Mock.Of<ILogger<RoleClaimsTransformer>>()
        );
    }

    protected static ClaimsPrincipal CreateAuthenticatedPrincipal(
        string externalId = ExternalAuthId,
        string? email = Email,
        string? name = DisplayName,
        Guid? clubId = null,
        bool includeClubClaim = true
    )
    {
        var claims = new List<Claim> { new(ClaimTypes.NameIdentifier, externalId) };
        if (includeClubClaim)
            claims.Add(new Claim(SupabaseClaims.ClubId, (clubId ?? ClubId).ToString()));
        if (email is not null)
            claims.Add(new Claim(ClaimTypes.Email, email));
        if (name is not null)
            claims.Add(new Claim(ClaimTypes.Name, name));

        var identity = new ClaimsIdentity(claims, "TestScheme");
        return new ClaimsPrincipal(identity);
    }

    protected static ClaimsPrincipal CreateUnauthenticatedPrincipal() => new(new ClaimsIdentity());

    protected static User CreateUser(Guid? id = null) =>
        new()
        {
            Id = id ?? UserId,
            ExternalAuthId = ExternalAuthId,
            ClubId = ClubId,
            Email = Email,
            DisplayName = DisplayName,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Roles = ["Athlete"],
        };

    public sealed class TransformAsync_WhenAuthenticated : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task AddsInternalUserIdClaim()
        {
            var user = CreateUser();
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new List<Role>
                    {
                        new() { Id = Guid.NewGuid(), Name = "Athlete" },
                    }
                );
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().Be(user.Id.ToString());
        }

        [Fact]
        public async Task UsesLinkedUserClub_WhenFirebaseClubClaimIsMissing()
        {
            var user = CreateUser();
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal(clubId: null, includeClubClaim: false);

            var result = await Sut.TransformAsync(principal);

            // The transformer now emits internal_club_id (not a second SupabaseClaims.ClubId)
            // because the user record holds the authoritative club.
            result.FindFirstValue(StarterKitClaims.InternalClubId).Should().Be(ClubId.ToString());
            result.FindFirstValue("internal_user_id").Should().Be(user.Id.ToString());
        }

        [Fact]
        public async Task AddsRoleClaims()
        {
            var user = CreateUser();
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    new List<Role>
                    {
                        new() { Id = Guid.NewGuid(), Name = "Athlete" },
                        new() { Id = Guid.NewGuid(), Name = "ClubAdmin" },
                    }
                );
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result
                .FindAll(ClaimTypes.Role)
                .Select(c => c.Value)
                .Should()
                .Contain(["Athlete", "ClubAdmin"]);
        }

        [Fact]
        public async Task CallsUpdateLastLogin()
        {
            var user = CreateUser();
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal();

            await Sut.TransformAsync(principal);

            UserServiceMock.Verify(
                s => s.UpdateLastLoginAsync(user.Id, It.IsAny<CancellationToken>()),
                Times.Once
            );
        }
    }

    public sealed class TransformAsync_WhenUnauthenticated : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task ReturnsOriginalPrincipal()
        {
            var principal = CreateUnauthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().BeNull();
            UserServiceMock.Verify(
                s => s.GetByExternalAuthIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class TransformAsync_WhenAlreadyTransformed : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task SkipsTransformation()
        {
            var principal = CreateAuthenticatedPrincipal();
            // Simulate already-transformed by adding the internal_user_id claim
            principal.AddIdentity(
                new ClaimsIdentity([new Claim("internal_user_id", Guid.NewGuid().ToString())])
            );

            var result = await Sut.TransformAsync(principal);

            UserServiceMock.Verify(
                s => s.GetByExternalAuthIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    public sealed class TransformAsync_WhenServiceThrows : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task ReturnsOriginalPrincipalOnError()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())
                )
                .ThrowsAsync(new InvalidOperationException("DB connection failed"));

            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().BeNull();
        }
    }

    // ── Pre-registration: resolve by email when sub is not yet linked ─────────

    /// <summary>
    /// First sign-in after admin pre-registration: the user record exists with a
    /// placeholder ExternalAuthId, so the transformer must fall back to email lookup
    /// (keyed on the Supabase sub / NameIdentifier), link the sub, and enrich the principal.
    /// </summary>
    public sealed class TransformAsync_WhenResolvedByEmailFallback : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task LinksExternalAuthId_AndEnrichesPrincipal()
        {
            var user = CreateUser();
            user.ExternalAuthId = "not-yet-linked"; // pre-registered placeholder
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync((User?)null);
            UserServiceMock
                .Setup(s => s.GetByEmailAsync(Email, It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s =>
                    s.UpdateExternalAuthIdAsync(
                        user.Id,
                        ExternalAuthId,
                        It.IsAny<CancellationToken>()
                    )
                )
                .Returns(Task.CompletedTask);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal();
            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().Be(user.Id.ToString());
            UserServiceMock.Verify(
                s =>
                    s.UpdateExternalAuthIdAsync(
                        user.Id,
                        ExternalAuthId,
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
        }

        [Fact]
        public async Task ReturnsOriginalPrincipal_WhenNoUserFoundByEmailEither()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync((User?)null);
            UserServiceMock
                .Setup(s => s.GetByEmailAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((User?)null);

            var principal = CreateAuthenticatedPrincipal();
            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().BeNull();
        }

        [Fact]
        public async Task DoesNotLink_WhenExternalAuthIdAlreadyMatches()
        {
            var user = CreateUser(); // ExternalAuthId already == ExternalAuthId
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            var principal = CreateAuthenticatedPrincipal();
            await Sut.TransformAsync(principal);

            UserServiceMock.Verify(
                s =>
                    s.UpdateExternalAuthIdAsync(
                        It.IsAny<Guid>(),
                        It.IsAny<string>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
        }
    }

    public sealed class TransformAsync_WhenUserIsSuspended : RoleClaimsTransformerTests
    {
        [Fact]
        public async Task DoesNotEnrichPrincipal_WhenIsActiveFalse()
        {
            var suspendedUser = CreateUser();
            suspendedUser.IsActive = false;
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(suspendedUser);

            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue("internal_user_id").Should().BeNull();
            result.FindAll(ClaimTypes.Role).Should().BeEmpty();
        }

        [Fact]
        public async Task DoesNotCallGetUserRoles_WhenSuspended()
        {
            var suspendedUser = CreateUser();
            suspendedUser.IsActive = false;
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(suspendedUser);

            var principal = CreateAuthenticatedPrincipal();

            await Sut.TransformAsync(principal);

            UserServiceMock.Verify(
                s => s.GetUserRolesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
    }

    // ── InternalClubId / InternalTeamId claim emission ──────────────

    /// <summary>
    /// Regression: the transformer must add <c>internal_club_id</c> (not a second
    /// <c>club_id</c>), so that <c>CurrentSession.ClubIdOrDefault</c> can prefer
    /// the DB-resolved value over a potentially stale Firebase claim.
    /// </summary>
    public sealed class TransformAsync_InternalClubClaim : RoleClaimsTransformerTests
    {
        private User SetupReturningUser(Guid? teamId = null)
        {
            var user = CreateUser();
            user.TeamIds = teamId is { } id ? [id] : [];
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);
            return user;
        }

        [Fact]
        public async Task AddsInternalClubIdClaim_WithDbResolvedValue()
        {
            var user = SetupReturningUser();
            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result
                .FindFirstValue(StarterKitClaims.InternalClubId)
                .Should()
                .Be(user.ClubId.ToString());
        }

        /// <summary>
        /// When the Firebase <c>club_id</c> claim is stale (club does not exist in DB),
        /// the transformer falls back to the user record. The enriched principal must contain
        /// <c>internal_club_id</c> with the DB-resolved club, not the stale value.
        /// </summary>
        [Fact]
        public async Task WhenFirebaseClubClaimIsStale_AddsInternalClubIdFromUserRecord()
        {
            var staleClubId = Guid.NewGuid();
            var dbClubId = Guid.NewGuid();

            // The stale club doesn't exist in DB
            ClubServiceMock
                .Setup(s => s.ExistsAsync(staleClubId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(false);

            var user = CreateUser();
            user.ClubId = dbClubId;
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAsync(ExternalAuthId, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(user);
            UserServiceMock
                .Setup(s => s.GetUserRolesAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<Role>());
            UserServiceMock
                .Setup(s => s.GetUserPermissionsAsync(user.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new HashSet<string>() as IReadOnlySet<string>);

            // Firebase token carries the stale club_id
            var principal = CreateAuthenticatedPrincipal(clubId: staleClubId);

            var result = await Sut.TransformAsync(principal);

            result
                .FindFirstValue(StarterKitClaims.InternalClubId)
                .Should()
                .Be(dbClubId.ToString(), "internal_club_id must reflect the DB-resolved club");

            // The stale Firebase claim still exists on the principal (we don't remove it),
            // but the internal claim carries the correct value.
            result
                .FindFirstValue(StarterKitClaims.InternalClubId)
                .Should()
                .NotBe(staleClubId.ToString());
        }

        [Fact]
        public async Task AddsInternalTeamIdClaim_WhenUserHasTeam()
        {
            var teamId = Guid.NewGuid();
            var user = SetupReturningUser(teamId: teamId);
            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue(StarterKitClaims.InternalTeamId).Should().Be(teamId.ToString());
        }

        [Fact]
        public async Task DoesNotAddInternalTeamIdClaim_WhenUserHasNoTeam()
        {
            SetupReturningUser(teamId: null);
            var principal = CreateAuthenticatedPrincipal();

            var result = await Sut.TransformAsync(principal);

            result.FindFirstValue(StarterKitClaims.InternalTeamId).Should().BeNull();
        }
    }
}
