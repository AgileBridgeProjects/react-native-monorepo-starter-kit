using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StarterKit.Auth.Interfaces;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Notifications.Options;
using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Exceptions;
using StarterKit.WebApi.Users.DTOs;
using StarterKit.WebApi.Users.Interfaces;
using StarterKit.WebApi.Users.Mappers;

namespace StarterKit.WebApi.Users;

[ApiController]
[AllowImpersonation]
[Route("api/users")]
[Tags("Users")]
[Authorize]
public sealed class UsersController(
    IUserService userService,
    IOptions<EmailOptions> emailOptions,
    IConfiguration configuration
) : ControllerBase, IUsersController
{
    /// <summary>
    /// Admin-provisions a new user for a club.
    /// For Credentials clubs, creates a Firebase user and a DB record.
    /// For SSO clubs, creates only a DB record.
    /// </summary>
    [HttpPost]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> CreateAsync(
        [FromBody] AdminCreateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var command = new AdminCreateUserCommand(
            ClubId: request.ClubId,
            RoleName: request.RoleName,
            FirstName: request.FirstName,
            LastName: request.LastName,
            AuthMethod: request.AuthMethod,
            Email: request.Email,
            PhoneNumber: request.PhoneNumber,
            Username: request.Username,
            Password: request.Password,
            DateOfBirth: request.DateOfBirth,
            Position: request.Position,
            JerseyNumber: request.JerseyNumber,
            TeamIds: request.TeamIds,
            DependentUserIds: request.DependentUserIds,
            ParentGuardianEmail: request.ParentGuardianEmail
        );
        var (user, setupLink) = await userService.AdminCreateUserAsync(command, cancellationToken);
        // When email delivery is active the link is sent by email — do not include it in the API
        // response to avoid leaking a credential-bearing URL over the wire unnecessarily.
        var responseLink = emailOptions.Value.Enabled ? null : setupLink;
        var response = user.ToResponse(responseLink);
        // nameof strips "Async" at runtime via SuppressAsyncSuffixInActionNames (default=true).
        // Use the stripped name directly to avoid "No route matches the supplied values".
        return CreatedAtAction("GetById", new { id = user.Id }, response);
    }

    /// <summary>
    /// Returns a paginated list of users with optional filtering.
    /// </summary>
    [HttpGet]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserListResponse>> ListAsync(
        [FromQuery] UserListQuery query,
        CancellationToken cancellationToken = default
    )
    {
        var result = await userService.ListAsync(
            new UserQuery
            {
                ClubId = query.ClubId,
                TeamId = query.TeamId,
                IsActive = query.IsActive,
                AuthMethod = query.AuthMethod,
                RoleName = query.RoleName,
                SetupStatus = query.SetupStatus,
                FilterText = query.FilterText,
                SortBy = query.SortBy,
                SortDescending = query.SortDescending,
                Page = query.ClampedPage,
                PageSize = query.ClampedPageSize,
            },
            cancellationToken
        );

        return Ok(
            new UserListResponse
            {
                Items = result.Items.Select(u => u.ToResponse()).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                HasNextPage = result.HasNextPage,
            }
        );
    }

    /// <summary>
    /// Returns a single user by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        return Ok(user.ToResponse());
    }

    /// <summary>
    /// Links an existing user to a club and assigns them a role.
    /// Also sets the club_id Firebase custom claim so the user's next token
    /// refresh includes the club scope.
    /// </summary>
    [HttpPost("{id:guid}/link-club")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> LinkToClubAsync(
        Guid id,
        [FromBody] LinkUserToClubRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await userService.LinkToClubAsync(
            id,
            request.ClubId,
            request.Role,
            cancellationToken
        );
        return Ok(updated.ToResponse());
    }

    /// <summary>
    /// Assigns a role to a user.
    /// </summary>
    [HttpPost("{id:guid}/roles")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> AssignRoleAsync(
        Guid id,
        [FromBody] AssignRoleRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await userService.AssignRoleAsync(id, request.Role, cancellationToken);
        return Ok(updated.ToResponse());
    }

    /// <summary>
    /// Activates or suspends a user account.
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetActiveAsync(
        Guid id,
        [FromBody] UpdateUserStatusRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.SetActiveAsync(id, request.IsActive.Value, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Updates an existing user's profile.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> UpdateAsync(
        Guid id,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var command = new UpdateUserCommand(
            UserId: id,
            RoleName: request.RoleName,
            FirstName: request.FirstName,
            LastName: request.LastName,
            Email: request.Email,
            PhoneNumber: request.PhoneNumber,
            NewAuthMethod: request.NewAuthMethod,
            Username: request.Username,
            Password: request.Password,
            DateOfBirth: request.DateOfBirth,
            Position: request.Position,
            JerseyNumber: request.JerseyNumber,
            TeamIds: request.TeamIds,
            DependentUserIds: request.DependentUserIds,
            ParentGuardianEmail: request.ParentGuardianEmail
        );
        var user = await userService.AdminUpdateUserAsync(command, cancellationToken);
        return Ok(user.ToResponse());
    }

    /// <summary>
    /// Soft-deletes a user.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await userService.DeleteUserAsync(id, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Resends the account setup link for a Credentials user whose setup is not yet complete.
    /// Invalidates any previously issued setup links before issuing a new one.
    /// </summary>
    [HttpPost("{id:guid}/resend-setup")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(ResendSetupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResendSetupResponse>> ResendSetupAsync(
        Guid id,
        [FromQuery] bool sendEmail = true,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var setupLink = await userService.ResendSetupLinkAsync(
                id,
                sendEmail,
                cancellationToken
            );
            return Ok(new ResendSetupResponse { SetupLink = setupLink });
        }
        catch (InvalidOperationException ex)
        {
            return Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    /// <summary>
    /// Returns admin-facing defaults for user creation.
    /// The default password is read from configuration (Key Vault secret
    /// <c>users-default-password</c> → config key <c>users-default-password</c>).
    /// Returns an empty string when the secret is not configured.
    /// </summary>
    [HttpGet("defaults")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(UserDefaultsResponse), StatusCodes.Status200OK)]
    public ActionResult<UserDefaultsResponse> GetDefaults()
    {
        var raw = configuration["users-default-password"];
        return Ok(new UserDefaultsResponse { DefaultPassword = raw ?? string.Empty });
    }

    /// <summary>
    /// Admin: changes the password for a CustomAuthentication user.
    /// </summary>
    [HttpPost("{id:guid}/change-password")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AdminChangePasswordAsync(
        Guid id,
        [FromBody] AdminChangePasswordRequest request,
        CancellationToken cancellationToken
    )
    {
        await userService.AdminChangePasswordAsync(id, request.NewPassword, cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Admin: removes a user's profile picture from blob storage and clears the DB field.
    /// </summary>
    [HttpDelete("{id:guid}/avatar")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveAvatarAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        await userService.RemoveAvatarAsync(id, cancellationToken);
        return NoContent();
    }

    // ── Export ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Exports all users for the given club (optionally scoped to a team) as an XLSX file.
    /// </summary>
    [HttpGet("export")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ExportUsersAsync(
        [FromQuery] Guid clubId,
        [FromQuery] Guid? teamId,
        CancellationToken cancellationToken
    )
    {
        var bytes = await userService.ExportUsersAsync(clubId, teamId, cancellationToken);
        var filename = teamId.HasValue
            ? $"users-export-{teamId}.xlsx"
            : $"users-export-{clubId}.xlsx";
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename
        );
    }

    // ── Bulk upload ──────────────────────────────────────────────────────────

    /// <summary>
    /// Downloads the XLSX template with data-validation dropdowns scoped to the given club.
    /// </summary>
    [HttpGet("bulk-upload/template")]
    [Authorize(Policy = StarterKitPermissions.Users.BulkManage)]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBulkUploadTemplateAsync(
        [FromQuery] Guid clubId,
        CancellationToken cancellationToken
    )
    {
        var bytes = await userService.GetBulkUploadTemplateAsync(clubId, cancellationToken);
        return File(
            bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "users-bulk-upload-template.xlsx"
        );
    }

    /// <summary>
    /// Parses and validates an uploaded XLSX file, returning a structured preview without
    /// persisting any data. Max file size: 10 MB.
    /// Returns 400 when the file is missing required template columns, is corrupt, is empty,
    /// or exceeds the size limit (all handled by <c>BulkUploadExceptionHandler</c>).
    /// </summary>
    [HttpPost("bulk-upload/preview")]
    [Authorize(Policy = StarterKitPermissions.Users.BulkManage)]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    [ProducesResponseType(typeof(BulkUploadPreviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HttpValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BulkUploadPreviewResponse>> PreviewBulkUploadAsync(
        [FromQuery] Guid clubId,
        [FromQuery] Guid? teamId,
        [FromForm] BulkUploadPreviewRequest request,
        CancellationToken cancellationToken
    )
    {
        // File type is validated by ClosedXML during parsing — if the stream is not a valid
        // OOXML workbook it throws and BulkUploadExceptionHandler returns 400.
        await using var stream = request.File.OpenReadStream();
        var preview = await userService.PreviewBulkUploadAsync(
            clubId,
            teamId,
            stream,
            cancellationToken
        );

        return Ok(
            new BulkUploadPreviewResponse
            {
                ReadyToAdd = preview.ReadyToAdd.Select(BulkUploadMapper.ToValidRowRequest).ToList(),
                ValidationErrors = preview
                    .ValidationErrors.Select(BulkUploadMapper.ToInvalidRowResponse)
                    .ToList(),
                Duplicates = preview
                    .Duplicates.Select(BulkUploadMapper.ToInvalidRowResponse)
                    .ToList(),
                Unprocessable = preview
                    .Unprocessable.Select(BulkUploadMapper.ToInvalidRowResponse)
                    .ToList(),
                TotalRows = preview.TotalRows,
            }
        );
    }

    /// <summary>
    /// Creates all users in the supplied valid-rows list. Rows that fail at creation time
    /// (e.g. race-condition duplicate) are returned as failures rather than aborting the batch.
    /// </summary>
    [HttpPost("bulk-upload/confirm")]
    [Authorize(Policy = StarterKitPermissions.Users.BulkManage)]
    [ProducesResponseType(typeof(BulkUploadConfirmResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<BulkUploadConfirmResponse>> ConfirmBulkUploadAsync(
        [FromBody] BulkUploadConfirmRequest request,
        CancellationToken cancellationToken
    )
    {
        var validRows = request.ValidRows.Select(BulkUploadMapper.ToValidUserDto).ToList();

        // Default password is used for CustomAuthentication rows — same value the admin would
        // see in the single-user "Add" form. Read from Key Vault via IConfiguration.
        var defaultPassword = configuration["users-default-password"];

        var result = await userService.ConfirmBulkUploadAsync(
            request.ClubId,
            request.TeamId,
            validRows,
            defaultPassword,
            cancellationToken
        );

        return Ok(
            new BulkUploadConfirmResponse
            {
                CreatedCount = result.CreatedCount,
                FailedCount = result.FailedCount,
                Failures = result.Failures.Select(BulkUploadMapper.ToInvalidRowResponse).ToList(),
            }
        );
    }
}
