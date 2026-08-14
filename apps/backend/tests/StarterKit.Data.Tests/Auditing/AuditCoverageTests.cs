using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Auditing;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Tests.Auditing;

/// <summary>
/// Compile-time + runtime guard: every entity type registered in <see cref="AppDbContext"/>
/// must either implement <see cref="IAuditable"/> or be decorated with
/// <see cref="ExcludeFromAuditLogAttribute"/>.
///
/// This test will FAIL if a new entity is added without the interfaces, forcing the developer
/// to make a deliberate decision: implement IAuditable (the default) or add [ExcludeFromAuditLog].
/// </summary>
public sealed class AuditCoverageTests
{
    private static AppDbContext BuildContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public void AllRegisteredEntities_ImplementIAuditable_OrAreExplicitlyExcluded()
    {
        using var context = BuildContext();

        var entityTypes = context
            .Model.GetEntityTypes()
            .Select(e => e.ClrType)
            .Where(t => t != typeof(object))
            .ToList();

        var violations = entityTypes
            .Where(t =>
                !typeof(IAuditable).IsAssignableFrom(t)
                && !t.IsDefined(typeof(ExcludeFromAuditLogAttribute), inherit: false)
            )
            .Select(t => t.FullName ?? t.Name)
            .OrderBy(n => n)
            .ToList();

        violations
            .Should()
            .BeEmpty(
                "every entity must implement IAuditable or be decorated with [ExcludeFromAuditLog]. "
                    + "Violating types: {0}",
                string.Join(", ", violations)
            );
    }

    [Fact]
    public void AuditableEntities_AlsoImplementISoftDeletable_AndIConcurrent()
    {
        using var context = BuildContext();

        var auditableTypes = context
            .Model.GetEntityTypes()
            .Select(e => e.ClrType)
            .Where(t => typeof(IAuditable).IsAssignableFrom(t))
            .ToList();

        var missingSoftDelete = auditableTypes
            .Where(t => !typeof(ISoftDeletable).IsAssignableFrom(t))
            .Select(t => t.Name)
            .ToList();

        var missingConcurrent = auditableTypes
            .Where(t => !typeof(IConcurrent).IsAssignableFrom(t))
            .Select(t => t.Name)
            .ToList();

        missingSoftDelete
            .Should()
            .BeEmpty(
                "every IAuditable entity must also implement ISoftDeletable. Missing: {0}",
                string.Join(", ", missingSoftDelete)
            );

        missingConcurrent
            .Should()
            .BeEmpty(
                "every IAuditable entity must also implement IConcurrent. Missing: {0}",
                string.Join(", ", missingConcurrent)
            );
    }

    [Fact]
    public void AuditLog_IsDecoratedWithExcludeFromAuditLog()
    {
        typeof(AuditLog)
            .IsDefined(typeof(ExcludeFromAuditLogAttribute), inherit: false)
            .Should()
            .BeTrue(
                "AuditLog must be excluded from the audit interceptor to prevent infinite recursion"
            );
    }
}
