using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Teams.DTOs;

namespace StarterKit.WebApi.Teams.Interfaces;

public interface ITeamController
{
    Task<ActionResult<TeamListResponse>> ListAsync(
        [FromQuery] TeamListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<TeamResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<TeamResponse>> CreateAsync(
        [FromRoute] Guid seasonId,
        [FromBody] CreateTeamRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<TeamResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateTeamRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
