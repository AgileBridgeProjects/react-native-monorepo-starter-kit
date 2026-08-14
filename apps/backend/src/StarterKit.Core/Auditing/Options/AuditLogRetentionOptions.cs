using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Auditing.Options;

/// <summary>
/// Configuration for audit log data retention.
/// Bind from "AuditLogRetention" in appsettings.
/// </summary>
public sealed class AuditLogRetentionOptions
{
    public const string SectionName = "AuditLogRetention";

    /// <summary>
    /// Number of days to retain audit log records (default: 90).
    /// Records older than this threshold are hard-deleted by the daily cleanup job.
    /// </summary>
    [Range(1, 3650)]
    public int RetentionDays { get; init; } = 90;
}
