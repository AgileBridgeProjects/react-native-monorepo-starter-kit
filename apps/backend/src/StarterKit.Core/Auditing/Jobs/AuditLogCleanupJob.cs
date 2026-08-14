using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.Core.Auditing.Options;

namespace StarterKit.Core.Auditing.Jobs;

/// <summary>
/// Hangfire recurring job that hard-deletes <c>AuditLog</c> rows older than
/// the configured retention window (<see cref="AuditLogRetentionOptions.RetentionDays"/>).
/// Runs at 02:00 UTC daily.
/// </summary>
public sealed class AuditLogCleanupJob(
    IAuditLogService auditLogService,
    IOptions<AuditLogRetentionOptions> options,
    ILogger<AuditLogCleanupJob> logger
)
{
    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var retentionDays = options.Value.RetentionDays;
        logger.LogInformation(
            "AuditLogCleanupJob: purging audit logs older than {RetentionDays} days",
            retentionDays
        );

        var deleted = await auditLogService.PurgeOlderThanAsync(retentionDays, cancellationToken);

        logger.LogInformation("AuditLogCleanupJob: deleted {Count} audit log record(s)", deleted);
    }
}
