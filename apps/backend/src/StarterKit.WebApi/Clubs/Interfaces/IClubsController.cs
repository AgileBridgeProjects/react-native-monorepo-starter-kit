using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Clubs.DTOs;

namespace StarterKit.WebApi.Clubs.Interfaces;

public interface IClubsController
{
    Task<ActionResult<ClubListResponse>> ListAsync(
        [FromQuery] ClubListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<ClubResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<ClubResponse>> CreateAsync(
        [FromBody] CreateClubRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<ClubResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateClubRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<UploadClubLogoResponse>> UploadLogoAsync(
        IFormFile file,
        CancellationToken cancellationToken
    );

    ActionResult<UploadConstraintsResponse> GetUploadConstraints();
}
