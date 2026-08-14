using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using StarterKit.Data.Extensions;

namespace StarterKit.Data.Auditing;

/// <summary>
/// EF Core <see cref="SaveChangesInterceptor"/> that automatically populates audit
/// timestamp and user fields on <see cref="IAuditable"/> entities and sets soft-delete
/// fields on <see cref="ISoftDeletable"/> entities.
///
/// Responsibilities:
/// - <see cref="IAuditable"/>: sets CreatedAt/CreatedBy on Add; sets UpdatedAt/UpdatedBy on Modify.
/// - <see cref="ISoftDeletable"/>: when IsDeleted transitions to true, sets DeletedAt/DeletedBy
///   and converts the EF state from Deleted → Modified (soft delete instead of physical delete).
///
/// This interceptor does NOT write to AuditLogs. That is handled by
/// <see cref="AuditLogInterceptor"/> as a separate concern.
/// </summary>
public sealed class AuditInterceptor : SaveChangesInterceptor
{
    private readonly TimeProvider _clock;
    private readonly IAuditUserContext _auditUserContext;

    public AuditInterceptor(TimeProvider clock, IAuditUserContext auditUserContext)
    {
        _clock = clock;
        _auditUserContext = auditUserContext;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result
    )
    {
        ApplyAuditFields(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default
    )
    {
        ApplyAuditFields(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyAuditFields(DbContext? context)
    {
        if (context is null)
            return;

        var now = _clock.Now();
        var userId = _auditUserContext.UserId;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            // ── Soft delete ─────────────────────────────────────────────────
            // Intercept physical deletes on ISoftDeletable and convert them.
            if (entry.State == EntityState.Deleted && entry.Entity is ISoftDeletable softDeletable)
            {
                entry.State = EntityState.Modified;
                softDeletable.IsDeleted = true;
                softDeletable.DeletedAt = now;
                softDeletable.DeletedBy = userId;
            }

            // ── Audit fields ─────────────────────────────────────────────────
            if (entry.Entity is not IAuditable auditable)
                continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    auditable.CreatedAt = now;
                    auditable.CreatedBy = userId;
                    break;

                case EntityState.Modified:
                    auditable.UpdatedAt = now;
                    auditable.UpdatedBy = userId;
                    break;
            }
        }
    }
}
