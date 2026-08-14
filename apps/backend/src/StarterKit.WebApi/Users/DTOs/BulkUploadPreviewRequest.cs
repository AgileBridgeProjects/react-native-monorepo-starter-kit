using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

/// <summary>
/// Only the file lives in the form body. ClubId and TeamId come from query params
/// so ASP.NET Core binds them correctly (Orval wraps non-Blob strings in a Blob, which
/// confuses multipart form binding for plain Guid fields).
/// </summary>
public sealed class BulkUploadPreviewRequest
{
    [Required]
    public IFormFile File { get; init; } = null!;
}
