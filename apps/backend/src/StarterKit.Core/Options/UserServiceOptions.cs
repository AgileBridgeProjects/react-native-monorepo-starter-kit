namespace StarterKit.Core.Configuration;

/// <summary>
/// Configuration for <see cref="Services.UserService"/>.
/// Bind from "UserService" in appsettings.
/// </summary>
public sealed class UserServiceOptions
{
    public const string SectionName = "UserService";

    /// <summary>
    /// Maximum number of concurrent SAS-URL resolutions when fetching linked organisations.
    /// Prevents fan-out against blob storage for users linked to many orgs.
    /// </summary>
    public int MaxOrgLogoConcurrency { get; init; } = 4;

    /// <summary>
    /// Maximum number of concurrent SAS-URL resolutions when resolving avatar URLs in
    /// the admin user list. The delegation key is cached so each resolution is cheap,
    /// but a gate prevents unbounded fan-out on large pages.
    /// </summary>
    public int MaxAvatarConcurrency { get; init; } = 8;

    /// <summary>
    /// Maximum number of team/dependent ids that can be linked to a user in a single
    /// create or update call. Caps unbounded SQL `IN (...)` clauses.
    /// </summary>
    public int MaxLinkedEntityIds { get; init; } = 100;

    /// <summary>Maximum accepted size for an avatar upload.</summary>
    public long AvatarMaxSizeBytes { get; init; } = 5 * 1024 * 1024; // 5 MiB

    /// <summary>
    /// Maximum accepted size for an onboarding face/full-body photo upload.
    /// </summary>
    public long OnboardingPhotoMaxSizeBytes { get; init; } = 10 * 1024 * 1024; // 10 MiB

    /// <summary>
    /// Maximum accepted size for a team logo upload.
    /// </summary>
    public long TeamLogoMaxSizeBytes { get; init; } = 10 * 1024 * 1024; // 10 MiB
}
