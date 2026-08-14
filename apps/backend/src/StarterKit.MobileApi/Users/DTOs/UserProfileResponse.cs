using StarterKit.Data.Clubs.Enums;
using StarterKit.Data.Users.Enums;

namespace StarterKit.MobileApi.Users.DTOs;

/// <summary>
/// Profile information for the authenticated user.
/// <c>AvatarUrl</c>, <c>FullBodyPhotoUrl</c>, and <c>FacePhotoUrl</c> are short-lived SAS URLs
/// when the corresponding image has been uploaded, otherwise null.
/// </summary>
public sealed record UserProfileResponse(
    Guid Id,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string? ClubName,
    IReadOnlyList<Guid> TeamIds,
    int GamesPlayed,
    int GamesPassed,
    int TotalSessions,
    int TotalAssignedGames,
    DateTime JoinedAt,
    AuthenticationMethod AuthMethod,
    bool IsCoach,
    PlayingPosition? Position,
    int? JerseyNumber,
    string? FullBodyPhotoUrl,
    string? FacePhotoUrl,
    DateTime? OnboardingCompletedAt,
    IReadOnlyList<string> Roles,
    string? OnboardingRole
)
{
    /// <summary>
    /// Deprecated — kept only so app binaries built before the TeamIds rollout (which
    /// read this field directly, e.g. the coach stats-import flow) keep working until they take
    /// the corresponding OTA update. New clients should read <see cref="TeamIds"/> instead.
    /// Remove once no supported build is old enough to still read it.
    /// </summary>
    [Obsolete(
        "Use TeamIds. Kept for backward compatibility with pre-the identity split app binaries."
    )]
    public Guid? TeamId => TeamIds.Count > 0 ? TeamIds[0] : null;
}
