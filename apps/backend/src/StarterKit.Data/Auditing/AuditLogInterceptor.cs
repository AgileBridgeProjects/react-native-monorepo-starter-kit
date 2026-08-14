using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using StarterKit.Data.Auditing.Enums;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.Data.Auditing;

/// <summary>
/// EF Core <see cref="SaveChangesInterceptor"/> that writes one <see cref="AuditLog"/>
/// row per changed <see cref="IAuditable"/> entity atomically within the same SaveChanges
/// transaction.
///
/// Key guarantees:
/// - Injects <see cref="AuditLog"/> rows into the change tracker during <c>SavingChanges</c>
///   so they are written in the same transaction as the primary changes (spec AC 2.2).
/// - Skips entities decorated with <see cref="ExcludeFromAuditLogAttribute"/>.
/// - Detects soft-deletes (EntityState.Modified + IsDeleted toggled true) and logs them as
///   <see cref="AuditAction.Delete"/> rather than Update.
/// - For physical Deleted state, reads the PK from OriginalValue (CurrentValue may be null).
/// - For Updates, serialises only the properties that actually changed (before + after).
/// </summary>
public sealed class AuditLogInterceptor : SaveChangesInterceptor
{
    private readonly TimeProvider _clock;
    private readonly IAuditUserContext _auditUserContext;

    public AuditLogInterceptor(TimeProvider clock, IAuditUserContext auditUserContext)
    {
        _clock = clock;
        _auditUserContext = auditUserContext;
    }

    // ── Inject audit rows pre-save (same transaction) ────────────────────────

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result
    )
    {
        AddAuditLogs(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default
    )
    {
        AddAuditLogs(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void AddAuditLogs(DbContext? context)
    {
        if (context is null)
            return;

        var logs = BuildLogs(context);
        if (logs.Count > 0)
            context.Set<AuditLog>().AddRange(logs);
    }

    private List<AuditLog> BuildLogs(DbContext context)
    {
        var now = _clock.Now();
        var userId = _auditUserContext.UserId;
        var clubId = _auditUserContext.ClubId;
        var logs = new List<AuditLog>();

        foreach (var entry in context.ChangeTracker.Entries<IAuditable>())
        {
            // Skip excluded types and unchanged entries.
            if (
                entry
                    .Entity.GetType()
                    .IsDefined(typeof(ExcludeFromAuditLogAttribute), inherit: false)
            )
                continue;

            if (
                entry.State
                is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)
            )
                continue;

            // Detect soft-delete: AuditInterceptor converts Deleted→Modified before we run,
            // so check for ISoftDeletable entities where IsDeleted was just toggled to true.
            var isSoftDelete =
                entry.State == EntityState.Modified
                && entry.Entity is ISoftDeletable
                && entry.OriginalValues[nameof(ISoftDeletable.IsDeleted)] is bool origDeleted
                && !origDeleted
                && ((ISoftDeletable)entry.Entity).IsDeleted;

            var action = entry.State switch
            {
                EntityState.Added => AuditAction.Insert,
                EntityState.Deleted => AuditAction.Delete,
                EntityState.Modified when isSoftDelete => AuditAction.Delete,
                _ => AuditAction.Update,
            };

            // For physical deletes, CurrentValue may be null — use OriginalValue.
            var pkProp = entry.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            var entityId =
                entry.State == EntityState.Deleted
                    ? pkProp?.OriginalValue?.ToString() ?? string.Empty
                    : pkProp?.CurrentValue?.ToString() ?? string.Empty;

            string? oldValues = null;
            string? newValues = null;

            if (action == AuditAction.Update)
            {
                var oldDict = new Dictionary<string, object?>();
                var newDict = new Dictionary<string, object?>();

                foreach (var prop in entry.Properties)
                {
                    if (!prop.IsModified || prop.Metadata.IsPrimaryKey())
                        continue;

                    oldDict[prop.Metadata.Name] = prop.OriginalValue;
                    newDict[prop.Metadata.Name] = prop.CurrentValue;
                }

                if (oldDict.Count > 0)
                {
                    oldValues = JsonSerializer.Serialize(oldDict);
                    newValues = JsonSerializer.Serialize(newDict);
                }
            }
            else if (action == AuditAction.Insert)
            {
                var newDict = entry
                    .Properties.Where(p => !p.Metadata.IsPrimaryKey())
                    .ToDictionary(p => p.Metadata.Name, p => (object?)p.CurrentValue);
                newValues = JsonSerializer.Serialize(newDict);
            }
            else // Delete (physical or soft)
            {
                var oldDict = entry
                    .Properties.Where(p => !p.Metadata.IsPrimaryKey())
                    .ToDictionary(p => p.Metadata.Name, p => (object?)p.OriginalValue);
                oldValues = JsonSerializer.Serialize(oldDict);
            }

            logs.Add(
                new AuditLog
                {
                    EntityName = entry.Entity.GetType().Name,
                    EntityId = entityId,
                    Action = action,
                    OldValues = oldValues,
                    NewValues = newValues,
                    UserId = userId,
                    ClubId = clubId,
                    Timestamp = now,
                }
            );
        }

        return logs;
    }
}
