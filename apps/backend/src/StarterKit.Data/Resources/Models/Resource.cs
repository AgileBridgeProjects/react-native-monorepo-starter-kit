using StarterKit.Data.Auditing;
using StarterKit.Data.Resources.Enums;

namespace StarterKit.Data.Resources.Models;

public class Resource : IAuditable, ISoftDeletable, IConcurrent
{
    public Guid Id { get; set; }

    /// <summary>Display name of the resource.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Kind of source material.</summary>
    public ResourceSourceType SourceType { get; set; }

    /// <summary>URL or path pointing to the stored material.</summary>
    public string StorageUrl { get; set; } = string.Empty;

    /// <summary>
    /// The media type used when presenting this resource to a trainee on mobile.
    /// Null for resources used only as AI source material (no direct trainee display).
    /// </summary>
    public ResourceMediaType? MediaType { get; set; }

    // IAuditable
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // ISoftDeletable
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
