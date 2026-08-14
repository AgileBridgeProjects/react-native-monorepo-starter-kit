using Microsoft.AspNetCore.Authorization;
using StarterKit.Auth.Transformers;

namespace StarterKit.Auth.Authorization;

/// <summary>
/// Requires that the authenticated user has a specific permission claim.
/// One instance is created per permission; the handler checks the claim value.
/// </summary>
public sealed class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}

public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement
    )
    {
        if (
            context.User.HasClaim(RoleClaimsTransformer.PermissionClaimType, requirement.Permission)
        )
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
