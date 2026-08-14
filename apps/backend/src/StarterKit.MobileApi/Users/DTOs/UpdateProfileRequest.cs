using System.ComponentModel.DataAnnotations;
using StarterKit.Core.Users;
using StarterKit.Data.Users.Enums;

namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>
/// Partial update for the authenticated user's profile.
/// Any field left null is ignored (unchanged).
/// </summary>
public sealed record UpdateProfileRequest
{
    /// <summary>New display name (2–100 characters). Leave null to keep the current value.</summary>
    [MaxLength(100)]
    public string? DisplayName { get; init; }

    /// <summary>
    /// Stored blob path (e.g. <c>user-avatars/{userId}/avatar</c>) returned by
    /// <c>POST /api/users/me/avatar</c>. Leave null to keep the current avatar.
    /// </summary>
    public string? AvatarBlobPath { get; init; }

    /// <summary>
    /// When <c>true</c>, removes the user's avatar and reverts to the initials fallback.
    /// Takes precedence over <see cref="AvatarBlobPath"/>.
    /// </summary>
    public bool RemoveAvatar { get; init; }

    /// <summary>Playing position. Leave null to keep the current value.</summary>
    public PlayingPosition? Position { get; init; }

    /// <summary>Jersey number (0–999). Leave null to keep the current value.</summary>
    [Range(JerseyNumberConstraints.Min, JerseyNumberConstraints.Max)]
    public int? JerseyNumber { get; init; }

    /// <summary>
    /// Stored blob path returned by <c>POST /api/users/me/full-body-photo</c>. Leave null to
    /// keep the current photo.
    /// </summary>
    public string? FullBodyPhotoBlobPath { get; init; }

    /// <summary>When <c>true</c>, removes the full-body photo. Takes precedence over <see cref="FullBodyPhotoBlobPath"/>.</summary>
    public bool RemoveFullBodyPhoto { get; init; }

    /// <summary>
    /// Stored blob path returned by <c>POST /api/users/me/face-photo</c>. Leave null to keep the
    /// current photo.
    /// </summary>
    public string? FacePhotoBlobPath { get; init; }

    /// <summary>When <c>true</c>, removes the face photo. Takes precedence over <see cref="FacePhotoBlobPath"/>.</summary>
    public bool RemoveFacePhoto { get; init; }

    /// <summary>
    /// Set to <c>true</c> on the final onboarding step to mark the athlete onboarding wizard as
    /// complete. Never clears once set.
    /// </summary>
    public bool CompleteOnboarding { get; init; }
}
