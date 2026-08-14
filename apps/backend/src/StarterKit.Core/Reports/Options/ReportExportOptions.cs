using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Reports.Options;

/// <summary>
/// Configuration for report-export blob retention. Bound from the <c>ReportExports</c> section of
/// appsettings; absent config falls back to the defaults below.
/// </summary>
public sealed class ReportExportOptions
{
    public const string SectionName = "ReportExports";

    /// <summary>
    /// How long generated full-dashboard export workbooks are kept in the <c>report-exports</c>
    /// container before <see cref="StarterKit.Core.Reports.Jobs.PurgeStaleReportExportsJob"/> deletes
    /// them. Exports are one-time downloads, so a short window suffices.
    /// </summary>
    [Range(1, 8760)]
    public int RetentionHours { get; init; } = 24;
}
