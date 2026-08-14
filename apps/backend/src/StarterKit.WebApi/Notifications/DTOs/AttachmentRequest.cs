using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Notifications.DTOs;

/// <summary>A single file attachment included with an outbound email communication.</summary>
public sealed record AttachmentRequest(
    [Required] string ContentType,
    [Required] string FileName,
    [Required] string ContentBase64
);
