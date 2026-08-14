using StarterKit.Data.Resources.Enums;

namespace StarterKit.WebApi.Resources.DTOs;

public sealed class ResourceResponse
{
    public Guid Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public ResourceSourceType SourceType { get; init; }
    public string StorageUrl { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public string? CreatedBy { get; init; }
    public DateTime? UpdatedAt { get; init; }
    public string? UpdatedBy { get; init; }
    public bool IsDeleted { get; init; }
    public DateTime? DeletedAt { get; init; }
}
