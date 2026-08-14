using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Auditing;
using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.WebApi.Auditing.DTOs;

namespace StarterKit.WebApi.Auditing.Mcp;

/// <summary>MCP tools mirroring <see cref="AuditLogsController"/> 1:1.</summary>
[McpServerToolType]
public sealed class AuditLogsMcpTools(IAuditLogService auditLogService)
{
    [McpServerTool(Name = "audit_logs_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [Description("Returns a paginated list of audit log entries with optional filtering.")]
    public async Task<AuditLogListResponse> ListAsync(
        [Description(
            "Paging, sorting, free-text filter and audit-specific filters (entity name/id, action, user, date range)."
        )]
            AuditLogQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await auditLogService.ListAsync(query, cancellationToken);

        return new AuditLogListResponse
        {
            Items = result.Items.Select(ToResponse).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "audit_logs_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [Description("Returns a single audit log entry by ID, or null when it does not exist.")]
    public async Task<AuditLogResponse?> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var entry = await auditLogService.GetByIdAsync(id, cancellationToken);

        return entry is null ? null : ToResponse(entry);
    }

    [McpServerTool(Name = "audit_logs_get_entity_names", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [Description(
        "Returns the distinct entity type names present in the audit log, ordered alphabetically. Useful for building entity-type filters."
    )]
    public async Task<IReadOnlyList<string>> GetEntityNamesAsync(
        CancellationToken cancellationToken = default
    )
    {
        return await auditLogService.GetDistinctEntityNamesAsync(cancellationToken);
    }

    private static AuditLogResponse ToResponse(AuditLogEntry entry) =>
        new()
        {
            Id = entry.Id,
            EntityName = entry.EntityName,
            EntityId = entry.EntityId,
            Action = entry.Action,
            OldValues = entry.OldValues,
            NewValues = entry.NewValues,
            UserId = entry.UserId,
            UserName = entry.UserName,
            Timestamp = entry.Timestamp,
        };
}
