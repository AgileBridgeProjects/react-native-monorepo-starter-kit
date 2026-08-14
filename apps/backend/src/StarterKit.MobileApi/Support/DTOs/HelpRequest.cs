using System.ComponentModel.DataAnnotations;

namespace StarterKit.MobileApi.Support.DTOs;

public sealed record HelpRequest(
    [Required, MinLength(3), MaxLength(200)] string Subject,
    [Required, MinLength(10), MaxLength(4000)] string Body
);
