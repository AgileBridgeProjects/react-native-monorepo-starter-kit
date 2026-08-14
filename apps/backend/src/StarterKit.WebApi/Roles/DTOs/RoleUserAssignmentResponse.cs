namespace StarterKit.WebApi.Roles.DTOs;

public sealed class RoleUserAssignmentResponse
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public Guid ClubId { get; set; }
    public string ClubName { get; set; } = string.Empty;
}
