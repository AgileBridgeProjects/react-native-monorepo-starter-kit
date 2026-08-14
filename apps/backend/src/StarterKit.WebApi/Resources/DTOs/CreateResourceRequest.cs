using System.ComponentModel.DataAnnotations;
using StarterKit.Data.Resources.Enums;

namespace StarterKit.WebApi.Resources.DTOs;

public sealed class CreateResourceRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required]
    public ResourceSourceType SourceType { get; init; }

    [Required]
    public IFormFile File { get; init; } = null!;
}
