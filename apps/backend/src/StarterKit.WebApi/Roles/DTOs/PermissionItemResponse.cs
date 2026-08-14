namespace StarterKit.WebApi.Roles.DTOs;

/// <summary>A single permission with its human-readable description.</summary>
public sealed class PermissionItemResponse
{
    public string Key { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
}
