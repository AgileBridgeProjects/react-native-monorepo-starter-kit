namespace StarterKit.Data.Roles.Models;

/// <summary>
/// Lightweight projection returned by <see cref="Repositories.RoleRepository.GetAssignmentsAsync"/>
/// containing the user details needed for the role deactivation modal.
/// </summary>
public sealed class RoleUserAssignmentProjection
{
    public Guid UserId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public Guid ClubId { get; init; }
    public string ClubName { get; init; } = string.Empty;
}
