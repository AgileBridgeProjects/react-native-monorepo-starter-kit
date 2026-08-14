using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing;
using StarterKit.Data.Clubs.Models;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Tests.Auditing;

public abstract class AuditInterceptorTests
{
    private static readonly Guid TestUserId = Guid.NewGuid();

    private static AppDbContext BuildContext(Guid? userId = null)
    {
        var clock = new FakeClock(new DateTimeOffset(2026, 4, 7, 12, 0, 0, TimeSpan.Zero));
        var session = new StubAuditUserContext(userId ?? TestUserId);
        var interceptor = new AuditInterceptor(clock, session);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;

        return new AppDbContext(options);
    }

    // ── Add ──────────────────────────────────────────────────────────────────

    public sealed class WhenEntityIsAdded : AuditInterceptorTests
    {
        [Fact]
        public void CreatedAt_IsSetToCurrentUtcTime()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            entity.CreatedAt.Should().Be(new DateTime(2026, 4, 7, 12, 0, 0, DateTimeKind.Utc));
        }

        [Fact]
        public void CreatedBy_IsSetToCurrentUserId()
        {
            using var context = BuildContext(TestUserId);
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            entity.CreatedBy.Should().Be(TestUserId.ToString());
        }

        [Fact]
        public void UpdatedAt_RemainsNull()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            entity.UpdatedAt.Should().BeNull();
        }

        [Fact]
        public void WhenNoUserAuthenticated_CreatedBy_IsNull()
        {
            using var context = BuildContext(userId: null);
            var session = new StubAuditUserContext(null);
            var clock = new FakeClock(new DateTimeOffset(2026, 4, 7, 12, 0, 0, TimeSpan.Zero));
            var interceptor = new AuditInterceptor(clock, session);
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .AddInterceptors(interceptor)
                .Options;
            using var ctx = new AppDbContext(opts);

            var entity = new Club { Name = "Anthropic" };
            ctx.Clubs.Add(entity);
            ctx.SaveChanges();

            entity.CreatedBy.Should().BeNull();
        }
    }

    // ── Modify ───────────────────────────────────────────────────────────────

    public sealed class WhenEntityIsModified : AuditInterceptorTests
    {
        [Fact]
        public void UpdatedAt_IsSetToCurrentUtcTime()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            entity.Name = "Azure";
            context.SaveChanges();

            entity.UpdatedAt.Should().Be(new DateTime(2026, 4, 7, 12, 0, 0, DateTimeKind.Utc));
        }

        [Fact]
        public void CreatedAt_IsNotOverwritten_OnModify()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            var originalCreatedAt = entity.CreatedAt;
            entity.Name = "Azure";
            context.SaveChanges();

            entity.CreatedAt.Should().Be(originalCreatedAt);
        }
    }

    // ── Soft delete ──────────────────────────────────────────────────────────

    public sealed class WhenEntityIsDeleted : AuditInterceptorTests
    {
        [Fact]
        public void Delete_SetsIsDeleted_True_AndDoesNotPhysicallyRemove()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            context.Clubs.Remove(entity);
            context.SaveChanges();

            var inDb = context.Clubs.IgnoreQueryFilters().SingleOrDefault(x => x.Id == entity.Id);

            inDb.Should().NotBeNull();
            inDb!.IsDeleted.Should().BeTrue();
            inDb.DeletedAt.Should().NotBeNull();
        }

        [Fact]
        public void Delete_IsFilteredFromStandardQueries()
        {
            using var context = BuildContext();
            var entity = new Club { Name = "Anthropic" };
            context.Clubs.Add(entity);
            context.SaveChanges();

            context.Clubs.Remove(entity);
            context.SaveChanges();

            context.Clubs.Any(x => x.Id == entity.Id).Should().BeFalse();
        }
    }

    // ── Test doubles ─────────────────────────────────────────────────────────

    private sealed class FakeClock : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeClock(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private sealed class StubAuditUserContext : IAuditUserContext
    {
        private readonly Guid? _userId;

        public StubAuditUserContext(Guid? userId) => _userId = userId;

        public string? UserId => _userId?.ToString();
        public Guid? ClubId => null;
    }
}
