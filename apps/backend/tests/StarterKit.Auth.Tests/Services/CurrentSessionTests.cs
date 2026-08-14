using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Services;

namespace StarterKit.Auth.Tests.Services;

/// <summary>
/// Unit tests for <see cref="CurrentSession"/> impersonation claim resolution.
/// Regression tests for the bug where <c>ClaimsPrincipal.FindFirstValue</c> returned
/// the original Firebase identity's <c>club_id</c> instead of the impersonated one.
/// </summary>
public abstract class CurrentSessionTests
{
    private static CurrentSession BuildSession(IEnumerable<Claim> claims)
    {
        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(httpContext);

        return new CurrentSession(accessor.Object);
    }

    private static CurrentSession BuildImpersonatingSession(
        Guid homeClubId,
        Guid impersonatedClubId,
        Guid? impersonatedTeamId = null
    )
    {
        // Simulate: Firebase identity with home club_id, then ImpersonationMiddleware
        // added a second identity containing only the marker claims (no club_id override).
        var homeIdentity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "firebase-uid"),
                new Claim(SupabaseClaims.ClubId, homeClubId.ToString()),
            ],
            "Firebase"
        );
        var impersonationIdentity = new ClaimsIdentity(
            new[]
            {
                new Claim(StarterKitClaims.IsImpersonating, "true"),
                new Claim(StarterKitClaims.ImpersonatedClubId, impersonatedClubId.ToString()),
            }.Concat(
                impersonatedTeamId.HasValue
                    ?
                    [
                        new Claim(
                            StarterKitClaims.ImpersonatedTeamId,
                            impersonatedTeamId.Value.ToString()
                        ),
                    ]
                    : []
            ),
            "Impersonation"
        );

        var principal = new ClaimsPrincipal(homeIdentity);
        principal.AddIdentity(impersonationIdentity);

        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(httpContext);

        return new CurrentSession(accessor.Object);
    }

    // ── ClubIdOrDefault — impersonation ────────────────────────────────────

    public sealed class ClubIdOrDefault_WhenImpersonating : CurrentSessionTests
    {
        [Fact]
        public void ReturnsImpersonatedClubId_NotHomeClubId()
        {
            var homeClubId = Guid.NewGuid();
            var impersonatedClubId = Guid.NewGuid();

            var sut = BuildImpersonatingSession(homeClubId, impersonatedClubId);

            sut.ClubIdOrDefault.Should().Be(impersonatedClubId);
            sut.ClubIdOrDefault.Should().NotBe(homeClubId);
        }
    }

    public sealed class ClubIdOrDefault_WhenNotImpersonating : CurrentSessionTests
    {
        [Fact]
        public void ReturnsHomeClubId_FromClaim()
        {
            var homeClubId = Guid.NewGuid();

            var sut = BuildSession([new Claim(SupabaseClaims.ClubId, homeClubId.ToString())]);

            sut.ClubIdOrDefault.Should().Be(homeClubId);
        }
    }

    // ── TeamId — impersonation semantics ────────────────────────────────

    public sealed class TeamId_WhenImpersonatingWithTeam : CurrentSessionTests
    {
        [Fact]
        public void ReturnsImpersonatedTeamId()
        {
            var impersonatedTeamId = Guid.NewGuid();

            var sut = BuildImpersonatingSession(Guid.NewGuid(), Guid.NewGuid(), impersonatedTeamId);

            sut.TeamId.Should().Be(impersonatedTeamId);
        }
    }

    public sealed class TeamId_WhenImpersonatingWithoutTeam : CurrentSessionTests
    {
        [Fact]
        public void ReturnsNull_ClubWideScopeIsIntentional()
        {
            // IsImpersonating=true but no ImpersonatedTeamId header → null means club-wide
            var sut = BuildImpersonatingSession(Guid.NewGuid(), Guid.NewGuid());

            sut.TeamId.Should().BeNull();
        }
    }

    public sealed class TeamId_WhenNotImpersonating : CurrentSessionTests
    {
        [Fact]
        public void ReturnsTeamId_FromClaim()
        {
            var teamId = Guid.NewGuid();

            var sut = BuildSession([new Claim(SupabaseClaims.TeamId, teamId.ToString())]);

            sut.TeamId.Should().Be(teamId);
        }

        [Fact]
        public void ReturnsNull_WhenNoTeamClaim()
        {
            var sut = BuildSession([]);

            sut.TeamId.Should().BeNull();
        }
    }

    // ── CurrentTenantContext.ClubId uses impersonated value ────────────────

    public sealed class CurrentTenantContext_WhenImpersonating : CurrentSessionTests
    {
        [Fact]
        public void ClubId_ReflectsImpersonatedClub()
        {
            var homeClubId = Guid.NewGuid();
            var impersonatedClubId = Guid.NewGuid();

            var session = BuildImpersonatingSession(homeClubId, impersonatedClubId);
            var tenantContext = new CurrentTenantContext(session);

            tenantContext.ClubId.Should().Be(impersonatedClubId);
        }
    }

    // ── ClubIdOrDefault — internal claim priority (stale-Firebase-claim fix) ─

    /// <summary>
    /// Regression: when both Firebase <c>club_id</c> and the enriched
    /// <c>internal_club_id</c> are present, the internal claim wins.
    /// This prevents a stale Firebase JWT from hiding the DB-resolved club.
    /// </summary>
    public sealed class ClubIdOrDefault_WhenBothInternalAndFirebaseClaimsPresent
        : CurrentSessionTests
    {
        [Fact]
        public void ReturnsInternalClubId_NotFirebaseClubId()
        {
            var staleFirebaseClubId = Guid.NewGuid();
            var dbResolvedClubId = Guid.NewGuid();

            var sut = BuildSession([
                new Claim(SupabaseClaims.ClubId, staleFirebaseClubId.ToString()),
                new Claim(StarterKitClaims.InternalClubId, dbResolvedClubId.ToString()),
            ]);

            sut.ClubIdOrDefault.Should().Be(dbResolvedClubId);
            sut.ClubIdOrDefault.Should().NotBe(staleFirebaseClubId);
        }
    }

    public sealed class ClubIdOrDefault_WhenOnlyFirebaseClaimPresent : CurrentSessionTests
    {
        [Fact]
        public void FallsBackToFirebaseClaim()
        {
            var firebaseClubId = Guid.NewGuid();

            var sut = BuildSession([new Claim(SupabaseClaims.ClubId, firebaseClubId.ToString())]);

            sut.ClubIdOrDefault.Should().Be(firebaseClubId);
        }
    }

    public sealed class ClubIdOrDefault_WhenNoClubClaimsPresent : CurrentSessionTests
    {
        [Fact]
        public void ReturnsNull()
        {
            var sut = BuildSession([]);

            sut.ClubIdOrDefault.Should().BeNull();
        }
    }

    // ── TeamId — internal claim priority ────────────────────────────────

    public sealed class TeamId_WhenBothInternalAndFirebaseClaimsPresent : CurrentSessionTests
    {
        [Fact]
        public void ReturnsInternalTeamId_NotFirebaseTeamId()
        {
            var staleTeamId = Guid.NewGuid();
            var dbResolvedTeamId = Guid.NewGuid();

            var sut = BuildSession([
                new Claim(SupabaseClaims.TeamId, staleTeamId.ToString()),
                new Claim(StarterKitClaims.InternalTeamId, dbResolvedTeamId.ToString()),
            ]);

            sut.TeamId.Should().Be(dbResolvedTeamId);
            sut.TeamId.Should().NotBe(staleTeamId);
        }
    }

    public sealed class TeamId_WhenOnlyFirebaseClaimPresent : CurrentSessionTests
    {
        [Fact]
        public void FallsBackToFirebaseTeamClaim()
        {
            var teamId = Guid.NewGuid();

            var sut = BuildSession([new Claim(SupabaseClaims.TeamId, teamId.ToString())]);

            sut.TeamId.Should().Be(teamId);
        }
    }

    // ─── Org-switch overrides ─────────────────────────────────────────────────

    /// <summary>
    /// Simulates the principal that <see cref="StarterKit.Auth.Middleware.OrgSwitchMiddleware"/>
    /// produces: the original identity carries the home club/user, and a second identity
    /// holds the switched-* marker claims.
    /// </summary>
    private static CurrentSession BuildOrgSwitchedSession(
        Guid homeUserId,
        Guid homeClubId,
        Guid switchedUserId,
        Guid switchedClubId,
        Guid? switchedTeamId = null
    )
    {
        var homeIdentity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "firebase-uid"),
                new Claim(StarterKitClaims.InternalUserId, homeUserId.ToString()),
                new Claim(StarterKitClaims.InternalClubId, homeClubId.ToString()),
            ],
            "Firebase"
        );

        var switchClaims = new List<Claim>
        {
            new(StarterKitClaims.IsOrgSwitch, "true"),
            new(StarterKitClaims.SwitchedClubId, switchedClubId.ToString()),
            new(StarterKitClaims.SwitchedUserId, switchedUserId.ToString()),
        };
        if (switchedTeamId.HasValue)
            switchClaims.Add(
                new Claim(StarterKitClaims.SwitchedTeamId, switchedTeamId.Value.ToString())
            );

        var principal = new ClaimsPrincipal(homeIdentity);
        principal.AddIdentity(new ClaimsIdentity(switchClaims, "OrgSwitch"));

        var httpContext = new DefaultHttpContext { User = principal };
        var accessor = new Mock<IHttpContextAccessor>();
        accessor.Setup(a => a.HttpContext).Returns(httpContext);

        return new CurrentSession(accessor.Object);
    }

    public sealed class UserIdOrDefault_WhenOrgSwitched : CurrentSessionTests
    {
        [Fact]
        public void ReturnsSwitchedUserId_NotHomeUserId()
        {
            var homeUserId = Guid.NewGuid();
            var switchedUserId = Guid.NewGuid();

            var sut = BuildOrgSwitchedSession(
                homeUserId,
                Guid.NewGuid(),
                switchedUserId,
                Guid.NewGuid()
            );

            sut.UserIdOrDefault.Should().Be(switchedUserId);
            sut.UserIdOrDefault.Should().NotBe(homeUserId);
        }
    }

    public sealed class ClubIdOrDefault_WhenOrgSwitched : CurrentSessionTests
    {
        [Fact]
        public void ReturnsSwitchedClubId_NotHomeClubId()
        {
            var homeClubId = Guid.NewGuid();
            var switchedClubId = Guid.NewGuid();

            var sut = BuildOrgSwitchedSession(
                Guid.NewGuid(),
                homeClubId,
                Guid.NewGuid(),
                switchedClubId
            );

            sut.ClubIdOrDefault.Should().Be(switchedClubId);
            sut.ClubIdOrDefault.Should().NotBe(homeClubId);
        }
    }

    public sealed class TeamId_WhenOrgSwitchedWithTeam : CurrentSessionTests
    {
        [Fact]
        public void ReturnsSwitchedTeamId()
        {
            var switchedTeamId = Guid.NewGuid();

            var sut = BuildOrgSwitchedSession(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                switchedTeamId
            );

            sut.TeamId.Should().Be(switchedTeamId);
        }
    }

    public sealed class TeamId_WhenOrgSwitchedWithoutTeam : CurrentSessionTests
    {
        [Fact]
        public void ReturnsNull_IgnoringHomeTeamClaim()
        {
            // Home identity carries a team; the switch identity does not.
            // The user has switched org, so the home team is meaningless.
            var sut = BuildOrgSwitchedSession(
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid(),
                Guid.NewGuid()
            );

            sut.TeamId.Should().BeNull();
        }
    }

    public sealed class ClubIdOrDefault_ImpersonationBeatsOrgSwitch : CurrentSessionTests
    {
        [Fact]
        public void ReturnsImpersonatedClubId_WhenBothImpersonatingAndOrgSwitched()
        {
            var impersonatedClubId = Guid.NewGuid();
            var switchedClubId = Guid.NewGuid();

            var sut = BuildSession([
                new Claim(StarterKitClaims.IsImpersonating, "true"),
                new Claim(StarterKitClaims.ImpersonatedClubId, impersonatedClubId.ToString()),
                new Claim(StarterKitClaims.IsOrgSwitch, "true"),
                new Claim(StarterKitClaims.SwitchedClubId, switchedClubId.ToString()),
            ]);

            sut.ClubIdOrDefault.Should().Be(impersonatedClubId);
            sut.ClubIdOrDefault.Should().NotBe(switchedClubId);
        }
    }
}
