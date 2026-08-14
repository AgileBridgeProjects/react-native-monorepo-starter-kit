using Microsoft.AspNetCore.Mvc;
using StarterKit.WebApi.Users.DTOs;

namespace StarterKit.WebApi.Users.Interfaces;

public interface IUsersController
{
    Task<ActionResult<UserResponse>> CreateAsync(
        [FromBody] AdminCreateUserRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UserListResponse>> ListAsync(
        [FromQuery] UserListQuery query,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UserResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<UserResponse>> LinkToClubAsync(
        Guid id,
        [FromBody] LinkUserToClubRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UserResponse>> AssignRoleAsync(
        Guid id,
        [FromBody] AssignRoleRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> SetActiveAsync(
        Guid id,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<UserResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> DeleteAsync(Guid id, CancellationToken cancellationToken);

    Task<ActionResult<ResendSetupResponse>> ResendSetupAsync(
        Guid id,
        bool sendEmail,
        CancellationToken cancellationToken
    );

    ActionResult<UserDefaultsResponse> GetDefaults();

    Task<IActionResult> AdminChangePasswordAsync(
        Guid id,
        [FromBody] AdminChangePasswordRequest request,
        CancellationToken cancellationToken
    );

    Task<IActionResult> RemoveAvatarAsync(Guid id, CancellationToken cancellationToken);

    // ── Bulk upload ──────────────────────────────────────────────────────────

    Task<IActionResult> GetBulkUploadTemplateAsync(
        Guid clubId,
        CancellationToken cancellationToken
    );

    Task<ActionResult<BulkUploadPreviewResponse>> PreviewBulkUploadAsync(
        Guid clubId,
        Guid? teamId,
        [FromForm] BulkUploadPreviewRequest request,
        CancellationToken cancellationToken
    );

    Task<ActionResult<BulkUploadConfirmResponse>> ConfirmBulkUploadAsync(
        [FromBody] BulkUploadConfirmRequest request,
        CancellationToken cancellationToken
    );
}
