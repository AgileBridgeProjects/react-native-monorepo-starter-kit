using StarterKit.Data.Users.Enums;

namespace StarterKit.Core.Models;

/// <summary>
/// Self-service profile update for the authenticated user. Any field left
/// <c>null</c>/<c>false</c> leaves the corresponding value unchanged.
/// </summary>
public sealed record UpdateProfileCommand
{
    public required Guid UserId { get; init; }
    public string? DisplayName { get; init; }
    public string? AvatarBlobPath { get; init; }
    public bool RemoveAvatar { get; init; }
    public PlayingPosition? Position { get; init; }
    public int? JerseyNumber { get; init; }
    public string? FullBodyPhotoBlobPath { get; init; }
    public bool RemoveFullBodyPhoto { get; init; }
    public string? FacePhotoBlobPath { get; init; }
    public bool RemoveFacePhoto { get; init; }

    /// <summary>Set to mark the athlete onboarding wizard as complete. Never clears once set.</summary>
    public bool CompleteOnboarding { get; init; }
}
