using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Seasons.DTOs;

namespace StarterKit.WebApi.Seasons.Interfaces;

public interface ISeasonController
{
    Task<ActionResult<SeasonListResponse>> ListAsync(
        Guid clubId,
        CancellationToken cancellationToken
    );

    Task<ActionResult<SeasonResponse>> GetCurrentAsync(
        Guid clubId,
        CancellationToken cancellationToken
    );

    Task<ActionResult<SeasonResponse>> CreateAsync(
        Guid clubId,
        [FromBody] CreateSeasonRequest request,
        CancellationToken cancellationToken
    );
}
