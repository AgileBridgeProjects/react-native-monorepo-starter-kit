using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StarterKit.Auth.Constants;
using StarterKit.Auth.Middleware;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;

namespace StarterKit.Auth.Tests.Middleware;

/// <summary>
/// Unit tests for <see cref="OrgSwitchMiddleware"/> covering header parsing, claim priority
/// (impersonation wins, fast-path same-club skip), and DB-lookup gating.
/// </summary>
public abstract class OrgSwitchMiddlewareTests
{
    protected static readonly Guid CurrentClub = Guid.NewGuid();
    protected static readonly Guid TargetClub = Guid.NewGuid();
    protected static readonly Guid TargetUserId = Guid.NewGuid();
    protected static readonly Guid TargetTeamId = Guid.NewGuid();
    protected const string FirebaseUid = "firebase-uid-123";

    protected readonly Mock<IUserService> UserServiceMock = new();
    protected bool NextCalled;

    protected OrgSwitchMiddleware Sut =>
        new(
            (ctx) =>
            {
                NextCalled = true;
                return Task.CompletedTask;
            },
            NullLogger<OrgSwitchMiddleware>.Instance
        );

    protected Task InvokeAsync(HttpContext ctx) => Sut.InvokeAsync(ctx, UserServiceMock.Object);

    protected static HttpContext BuildContext(
        IEnumerable<Claim>? claims = null,
        string? activeOrgHeader = null,
        bool isAuthenticated = true
    )
    {
        var identity = isAuthenticated
            ? new ClaimsIdentity(claims ?? [], "TestAuth")
            : new ClaimsIdentity();
        var principal = new ClaimsPrincipal(identity);

        var ctx = new DefaultHttpContext { User = principal };
        if (activeOrgHeader is not null)
            ctx.Request.Headers[OrgSwitchMiddleware.ActiveOrgHeader] = activeOrgHeader;

        return ctx;
    }

    // ─── Skip paths ──────────────────────────────────────────────────────────

    public sealed class Skips_WhenNotAuthenticated : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotAddOrgSwitchClaim()
        {
            var ctx = BuildContext(isAuthenticated: false, activeOrgHeader: TargetClub.ToString());

            await InvokeAsync(ctx);

            NextCalled.Should().BeTrue();
            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class Skips_WhenNoHeader : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotAddOrgSwitchClaim()
        {
            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ]
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class Skips_WhenHeaderNotGuid : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotAddOrgSwitchClaim()
        {
            var ctx = BuildContext(
                claims: [new Claim(ClaimTypes.NameIdentifier, FirebaseUid)],
                activeOrgHeader: "not-a-guid"
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class Skips_WhenImpersonationActive : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotCallUserServiceOrAddSwitchClaim()
        {
            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.IsImpersonating, "true"),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: TargetClub.ToString()
            );

            await InvokeAsync(ctx);

            UserServiceMock.Verify(
                s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        It.IsAny<string>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class FastPath_SkipsDbLookup_WhenHeaderMatchesCurrentClub
        : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotCallUserService()
        {
            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: CurrentClub.ToString()
            );

            await InvokeAsync(ctx);

            UserServiceMock.Verify(
                s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        It.IsAny<string>(),
                        It.IsAny<Guid>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class Skips_WhenTargetUserNotFound : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotAddOrgSwitchClaim()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        FirebaseUid,
                        TargetClub,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((User?)null);

            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: TargetClub.ToString()
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    public sealed class Skips_WhenTargetUserInactive : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task DoesNotAddOrgSwitchClaim()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        FirebaseUid,
                        TargetClub,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new User { Id = TargetUserId, IsActive = false });

            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: TargetClub.ToString()
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeFalse();
        }
    }

    // ─── Happy paths ─────────────────────────────────────────────────────────

    public sealed class AppliesSwitchClaims_WhenTargetUserActive : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task AddsAllExpectedClaims()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        FirebaseUid,
                        TargetClub,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new User
                    {
                        Id = TargetUserId,
                        IsActive = true,
                        TeamIds = [TargetTeamId],
                    }
                );

            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: TargetClub.ToString()
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeTrue();
            ctx.User.FindFirstValue(StarterKitClaims.SwitchedClubId)
                .Should()
                .Be(TargetClub.ToString());
            ctx.User.FindFirstValue(StarterKitClaims.SwitchedUserId)
                .Should()
                .Be(TargetUserId.ToString());
            ctx.User.FindFirstValue(StarterKitClaims.SwitchedTeamId)
                .Should()
                .Be(TargetTeamId.ToString());
        }
    }

    public sealed class OmitsTeamClaim_WhenTargetUserHasNoTeam : OrgSwitchMiddlewareTests
    {
        [Fact]
        public async Task AddsSwitchClaimsButNoTeamClaim()
        {
            UserServiceMock
                .Setup(s =>
                    s.GetByExternalAuthIdAndClubAsync(
                        FirebaseUid,
                        TargetClub,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(new User { Id = TargetUserId, IsActive = true });

            var ctx = BuildContext(
                claims:
                [
                    new Claim(ClaimTypes.NameIdentifier, FirebaseUid),
                    new Claim(StarterKitClaims.InternalClubId, CurrentClub.ToString()),
                ],
                activeOrgHeader: TargetClub.ToString()
            );

            await InvokeAsync(ctx);

            ctx.User.HasClaim(StarterKitClaims.IsOrgSwitch, "true").Should().BeTrue();
            ctx.User.FindFirstValue(StarterKitClaims.SwitchedTeamId).Should().BeNull();
        }
    }
}
