namespace StarterKit.WebApi.Roles.DTOs;

public sealed class UpdateRolePermissionsRequest
{
    public List<string> Permissions { get; set; } = [];
}
