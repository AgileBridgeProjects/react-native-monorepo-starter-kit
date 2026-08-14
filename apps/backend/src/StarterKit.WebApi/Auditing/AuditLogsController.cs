using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Auditing;
using StarterKit.Core.Auditing.Interfaces.Services;
using StarterKit.WebApi.Auditing.DTOs;
using StarterKit.WebApi.Auditing.Interfaces;

namespace StarterKit.WebApi.Auditing;

[ApiController]
[AllowImpersonation]
[Route("api/audit-logs")]
[Tags("Audit Logs")]
[Authorize]
public sealed class AuditLogsController(IAuditLogService auditLogService)
    : ControllerBase,
        IAuditLogsController
{
    /// <summary>
    /// Returns a paginated list of audit log entries with optional filtering.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [ProducesResponseType(typeof(AuditLogListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuditLogListResponse>> ListAsync(
        [FromQuery] AuditLogQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await auditLogService.ListAsync(query, cancellationToken);

        return Ok(
            new AuditLogListResponse
            {
                Items = result.Items.Select(e => ToResponse(e)).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single audit log entry by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [ProducesResponseType(typeof(AuditLogResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AuditLogResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var entry = await auditLogService.GetByIdAsync(id, cancellationToken);

        if (entry is null)
            return NotFound();

        return Ok(ToResponse(entry));
    }

    /// <summary>
    /// Returns the distinct entity type names present in the audit log, ordered alphabetically.
    /// Used to populate the entity-type filter dropdown on the audit log page.
    /// </summary>
    [HttpGet("entity-names")]
    [Authorize(Policy = StarterKitPermissions.Auditing.View)]
    [ProducesResponseType(typeof(IReadOnlyList<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<string>>> GetEntityNamesAsync(
        CancellationToken cancellationToken = default
    )
    {
        var names = await auditLogService.GetDistinctEntityNamesAsync(cancellationToken);
        return Ok(names);
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
