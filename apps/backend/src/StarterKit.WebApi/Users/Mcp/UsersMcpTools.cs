using System.ComponentModel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Server;
using StarterKit.Auth.Permissions;
using StarterKit.Core.Interfaces.Services;
using StarterKit.Core.Models;
using StarterKit.Core.Notifications.Options;
using StarterKit.WebApi.Users.DTOs;
using StarterKit.WebApi.Users.Mappers;

namespace StarterKit.WebApi.Users.Mcp;

/// <summary>MCP tools mirroring <see cref="UsersController"/> 1:1.</summary>
// Not MCP-exposed: ExportUsersAsync (GET export) and GetBulkUploadTemplateAsync
// (GET bulk-upload/template) — XLSX file downloads do not map to MCP tool JSON.
// Not MCP-exposed: PreviewBulkUploadAsync (POST bulk-upload/preview) — multipart IFormFile
// upload — and ConfirmBulkUploadAsync (POST bulk-upload/confirm), the second half of the same
// binary bulk-upload flow (docs/standards/backend/mcp.md § Excluded from MCP).
[McpServerToolType]
public sealed class UsersMcpTools(
    IUserService userService,
    IOptions<EmailOptions> emailOptions,
    IConfiguration configuration
)
{
    [McpServerTool(Name = "users_create")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description(
        "Admin-provisions a new user for a club. For Credentials clubs, creates an auth-provider user and a DB record; for SSO clubs, creates only a DB record."
    )]
    public async Task<UserResponse> CreateAsync(
        AdminCreateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        McpRequestValidator.EnsureValid(request);

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
        // When email delivery is active the link is sent by email — do not include it in the
        // response to avoid leaking a credential-bearing URL over the wire unnecessarily.
        var responseLink = emailOptions.Value.Enabled ? null : setupLink;
        return user.ToResponse(responseLink);
    }

    [McpServerTool(Name = "users_list", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Returns a paginated list of users with optional filtering.")]
    public async Task<UserListResponse> ListAsync(
        [Description(
            "Club/team/role/status filters plus paging, sorting and free-text filter options."
        )]
            UserListQuery query,
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

        return new UserListResponse
        {
            Items = result.Items.Select(u => u.ToResponse()).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            PageSize = result.PageSize,
            HasNextPage = result.HasNextPage,
        };
    }

    [McpServerTool(Name = "users_get_by_id", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Returns a single user by ID.")]
    public async Task<UserResponse> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default
    )
    {
        var user = await userService.GetByIdAsync(id, cancellationToken);
        return user.ToResponse();
    }

    [McpServerTool(Name = "users_link_to_club")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description(
        "Links an existing user to a club and assigns them a role. Also sets the club claim so the user's next token refresh includes the club scope."
    )]
    public async Task<UserResponse> LinkToClubAsync(
        Guid id,
        LinkUserToClubRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await userService.LinkToClubAsync(
            id,
            request.ClubId,
            request.Role,
            cancellationToken
        );
        return updated.ToResponse();
    }

    [McpServerTool(Name = "users_assign_role")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Assigns a role to a user.")]
    public async Task<UserResponse> AssignRoleAsync(
        Guid id,
        AssignRoleRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var updated = await userService.AssignRoleAsync(id, request.Role, cancellationToken);
        return updated.ToResponse();
    }

    [McpServerTool(Name = "users_set_active", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Activates or suspends a user account.")]
    public async Task SetActiveAsync(
        Guid id,
        UpdateUserStatusRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.SetActiveAsync(id, request.IsActive.Value, cancellationToken);
    }

    [McpServerTool(Name = "users_update", Idempotent = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Updates an existing user's profile.")]
    public async Task<UserResponse> UpdateAsync(
        Guid id,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default
    )
    {
        McpRequestValidator.EnsureValid(request);

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
        return user.ToResponse();
    }

    [McpServerTool(Name = "users_delete", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Soft-deletes a user.")]
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await userService.DeleteUserAsync(id, cancellationToken);
    }

    [McpServerTool(Name = "users_resend_setup")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description(
        "Resends the account setup link for a Credentials user whose setup is not yet complete. Invalidates any previously issued setup links before issuing a new one."
    )]
    public async Task<ResendSetupResponse> ResendSetupAsync(
        Guid id,
        [Description(
            "When true (default) the link is emailed to the user; when false it is only returned."
        )]
            bool sendEmail = true,
        CancellationToken cancellationToken = default
    )
    {
        var setupLink = await userService.ResendSetupLinkAsync(id, sendEmail, cancellationToken);
        return new ResendSetupResponse { SetupLink = setupLink };
    }

    [McpServerTool(Name = "users_get_defaults", ReadOnly = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description(
        "Returns admin-facing defaults for user creation, including the configured default password (empty string when not configured)."
    )]
    public UserDefaultsResponse GetDefaults()
    {
        var raw = configuration["users-default-password"];
        return new UserDefaultsResponse { DefaultPassword = raw ?? string.Empty };
    }

    [McpServerTool(Name = "users_admin_change_password")]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description("Admin: changes the password for a CustomAuthentication user.")]
    public async Task AdminChangePasswordAsync(
        Guid id,
        AdminChangePasswordRequest request,
        CancellationToken cancellationToken = default
    )
    {
        await userService.AdminChangePasswordAsync(id, request.NewPassword, cancellationToken);
    }

    [McpServerTool(Name = "users_remove_avatar", Destructive = true)]
    [Authorize(Policy = StarterKitPermissions.Users.Manage)]
    [Description(
        "Admin: removes a user's profile picture from blob storage and clears the DB field."
    )]
    public async Task RemoveAvatarAsync(Guid id, CancellationToken cancellationToken = default)
    {
        await userService.RemoveAvatarAsync(id, cancellationToken);
    }
}
