namespace StarterKit.Data.Users.Enums;

/// <summary>
/// How a Parent relates to a linked Athlete, set by the parent during onboarding.
/// Stored per <c>UserGuardian</c> link — a parent with several children declares a relationship
/// for each one independently.
/// </summary>
public enum GuardianRelationship
{
    Mother,
    Father,
    Guardian,
    Other,
}
