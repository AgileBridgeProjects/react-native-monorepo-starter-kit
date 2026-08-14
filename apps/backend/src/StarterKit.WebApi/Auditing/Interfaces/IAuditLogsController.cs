using Microsoft.AspNetCore.Mvc;
using StarterKit.Core.Auditing;
using StarterKit.WebApi.Auditing.DTOs;

namespace StarterKit.WebApi.Auditing.Interfaces;

public interface IAuditLogsController
{
    Task<ActionResult<AuditLogListResponse>> ListAsync(
        [FromQuery] AuditLogQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<AuditLogResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<IReadOnlyList<string>>> GetEntityNamesAsync(
        CancellationToken cancellationToken
    );
}
