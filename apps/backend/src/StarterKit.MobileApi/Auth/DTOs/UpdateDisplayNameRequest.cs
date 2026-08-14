using System.ComponentModel.DataAnnotations;

namespace StarterKit.MobileApi.Auth.DTOs;

public sealed record UpdateDisplayNameRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string DisplayName { get; init; } = "";
}
