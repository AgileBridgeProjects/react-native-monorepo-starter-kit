using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using StarterKit.Auth.Authorization;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Permissions;
using StarterKit.Auth.Transformers;

namespace StarterKit.Auth.Tests.Authorization;

public abstract class ClubMemberHandlerTests
{
    private static readonly Guid ClubA = Guid.NewGuid();
    private static readonly Guid ClubB = Guid.NewGuid();

    private static ClaimsPrincipal MakePrincipal(Guid clubId, bool isSuperAdmin = false)
    {
        var claims = new List<Claim> { new(SupabaseClaims.ClubId, clubId.ToString()) };
        if (isSuperAdmin)
            claims.Add(
                new Claim(
                    RoleClaimsTransformer.PermissionClaimType,
                    StarterKitPermissions.Platform.Admin
                )
            );

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static AuthorizationHandlerContext MakeContext(ClaimsPrincipal user, Guid requestClubId)
    {
        var httpContext = new DefaultHttpContext { User = user };
        httpContext.Request.QueryString = new QueryString($"?clubId={requestClubId}");

        return new AuthorizationHandlerContext([new ClubMemberRequirement()], user, httpContext);
    }

    private static ClubMemberHandler BuildHandler() => new(Mock.Of<ILogger<ClubMemberHandler>>());

    // ─── Tests ────────────────────────────────────────────────────────────────

    public sealed class SuperAdmin_Succeeds_WithoutMatchingClub : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_SuperAdmin_SucceedsEvenWhenClubMismatch()
        {
            var principal = MakePrincipal(ClubA, isSuperAdmin: true);
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class NonSuperAdmin_Fails_WhenClubMismatch : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_NonSuperAdmin_FailsWhenClubMismatch()
        {
            var principal = MakePrincipal(ClubA);
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeFalse();
        }
    }

    public sealed class NonSuperAdmin_Succeeds_WhenClubMatches : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_NonSuperAdmin_SucceedsWhenClubMatches()
        {
            var principal = MakePrincipal(ClubA);
            var context = MakeContext(principal, ClubA);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class NonSuperAdmin_Fails_WhenNoClubIdClaim : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_NonSuperAdmin_FailsWhenNoClubIdClaim()
        {
            var principal = new ClaimsPrincipal(new ClaimsIdentity([], "Test"));
            var httpContext = new DefaultHttpContext { User = principal };
            httpContext.Request.QueryString = new QueryString($"?clubId={ClubA}");
            var context = new AuthorizationHandlerContext(
                [new ClubMemberRequirement()],
                principal,
                httpContext
            );

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeFalse();
        }
    }

    // ─── Claim priority chain: impersonated > switched > internal > firebase ──

    /// <summary>
    /// Helper that builds a principal with whatever combination of the four
    /// club-id claim sources the test wants to exercise.
    /// </summary>
    private static ClaimsPrincipal MakePrincipalWithClaims(
        Guid? impersonatedClubId = null,
        Guid? switchedClubId = null,
        Guid? internalClubId = null,
        Guid? firebaseClubId = null
    )
    {
        var claims = new List<Claim>();
        if (impersonatedClubId.HasValue)
        {
            claims.Add(new Claim(StarterKitClaims.IsImpersonating, "true"));
            claims.Add(
                new Claim(StarterKitClaims.ImpersonatedClubId, impersonatedClubId.Value.ToString())
            );
        }
        if (switchedClubId.HasValue)
        {
            claims.Add(new Claim(StarterKitClaims.IsOrgSwitch, "true"));
            claims.Add(new Claim(StarterKitClaims.SwitchedClubId, switchedClubId.Value.ToString()));
        }
        if (internalClubId.HasValue)
            claims.Add(new Claim(StarterKitClaims.InternalClubId, internalClubId.Value.ToString()));
        if (firebaseClubId.HasValue)
            claims.Add(new Claim(SupabaseClaims.ClubId, firebaseClubId.Value.ToString()));

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    public sealed class ClaimPriority_Impersonated_WinsOverAllOthers : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_UsesImpersonatedClub_WhenAllClaimsPresent()
        {
            var principal = MakePrincipalWithClaims(
                impersonatedClubId: ClubB,
                switchedClubId: ClubA,
                internalClubId: ClubA,
                firebaseClubId: ClubA
            );
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class ClaimPriority_Switched_WinsOverInternalAndFirebase : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_UsesSwitchedClub_WhenNoImpersonation()
        {
            var principal = MakePrincipalWithClaims(
                switchedClubId: ClubB,
                internalClubId: ClubA,
                firebaseClubId: ClubA
            );
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class ClaimPriority_OrphanSwitchedClaim_IsIgnored : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_FallsThroughToInternal_WhenIsOrgSwitchMarkerMissing()
        {
            // SwitchedClubId present without the IsOrgSwitch=true marker — the handler
            // must NOT honor it. Internal club should win instead.
            var principal = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [
                        new Claim(StarterKitClaims.SwitchedClubId, ClubB.ToString()),
                        new Claim(StarterKitClaims.InternalClubId, ClubA.ToString()),
                    ],
                    "Test"
                )
            );
            var context = MakeContext(principal, ClubA);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class ClaimPriority_OrphanImpersonatedClaim_IsIgnored : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_FallsThroughToInternal_WhenIsImpersonatingMarkerMissing()
        {
            var principal = new ClaimsPrincipal(
                new ClaimsIdentity(
                    [
                        new Claim(StarterKitClaims.ImpersonatedClubId, ClubB.ToString()),
                        new Claim(StarterKitClaims.InternalClubId, ClubA.ToString()),
                    ],
                    "Test"
                )
            );
            var context = MakeContext(principal, ClubA);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class ClaimPriority_Internal_WinsOverFirebase : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_UsesInternalClub_WhenSwitchAndImpersonationAbsent()
        {
            var principal = MakePrincipalWithClaims(internalClubId: ClubB, firebaseClubId: ClubA);
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }

    public sealed class ClaimPriority_Firebase_UsedWhenOnlySource : ClubMemberHandlerTests
    {
        [Fact]
        public async Task HandleAsync_UsesFirebaseClub_WhenNoOtherClaimPresent()
        {
            var principal = MakePrincipalWithClaims(firebaseClubId: ClubB);
            var context = MakeContext(principal, ClubB);

            await BuildHandler().HandleAsync(context);

            context.HasSucceeded.Should().BeTrue();
        }
    }
}
