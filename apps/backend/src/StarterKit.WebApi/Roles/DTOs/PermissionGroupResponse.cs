namespace StarterKit.WebApi.Roles.DTOs;

/// <summary>All permissions belonging to a single group, e.g. "AI" or "Clubs".</summary>
public sealed class PermissionGroupResponse
{
    public string Group { get; init; } = string.Empty;
    public IReadOnlyList<PermissionItemResponse> Permissions { get; init; } = [];
}
