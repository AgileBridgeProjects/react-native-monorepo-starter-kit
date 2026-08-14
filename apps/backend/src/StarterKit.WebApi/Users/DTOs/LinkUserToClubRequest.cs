using System.ComponentModel.DataAnnotations;

namespace StarterKit.WebApi.Users.DTOs;

public sealed class LinkUserToClubRequest
{
    [Required]
    public Guid ClubId { get; init; }

    [Required]
    public string Role { get; init; } = string.Empty;
}
