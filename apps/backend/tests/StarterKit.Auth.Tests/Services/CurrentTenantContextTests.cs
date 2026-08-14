using FluentAssertions;
using Moq;
using StarterKit.Auth.Services;
using StarterKit.Core.Interfaces;

namespace StarterKit.Auth.Tests.Services;

public abstract class CurrentTenantContextTests
{
    // ── IsActive_WhenNotAuthenticated ─────────────────────────────────────────

    public sealed class IsActive_WhenNotAuthenticated : CurrentTenantContextTests
    {
        [Fact]
        public void IsActive_WhenSessionIsNotAuthenticated_ReturnsFalse()
        {
            var session = new Mock<ICurrentSession>();
            session.Setup(s => s.IsAuthenticated).Returns(false);

            var sut = new CurrentTenantContext(session.Object);

            sut.IsActive.Should().BeFalse();
        }
    }

    // ── IsActive_WhenAuthenticatedNonSuperAdmin ────────────────────────────────

    public sealed class IsActive_WhenAuthenticatedNonSuperAdmin : CurrentTenantContextTests
    {
        [Fact]
        public void IsActive_WhenAuthenticatedAndNotSuperAdmin_ReturnsTrue()
        {
            var session = new Mock<ICurrentSession>();
            session.Setup(s => s.IsAuthenticated).Returns(true);
            session.Setup(s => s.IsSuperAdmin).Returns(false);

            var sut = new CurrentTenantContext(session.Object);

            sut.IsActive.Should().BeTrue();
        }
    }

    // ── IsActive_WhenAuthenticatedSuperAdmin ──────────────────────────────────
    //
    // This is the P0 fix: a SuperAdmin must bypass tenant filters so they can
    // query users (and other tenant-scoped entities) across all clubs.

    public sealed class IsActive_WhenAuthenticatedSuperAdmin : CurrentTenantContextTests
    {
        [Fact]
        public void IsActive_WhenAuthenticatedAsSuperAdmin_ReturnsFalse()
        {
            var session = new Mock<ICurrentSession>();
            session.Setup(s => s.IsAuthenticated).Returns(true);
            session.Setup(s => s.IsSuperAdmin).Returns(true);

            var sut = new CurrentTenantContext(session.Object);

            sut.IsActive.Should().BeFalse();
        }
    }
}
