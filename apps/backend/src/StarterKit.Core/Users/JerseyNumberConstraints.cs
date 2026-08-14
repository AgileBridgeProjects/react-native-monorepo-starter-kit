namespace StarterKit.Core.Users;

/// <summary>
/// Single source of truth for the valid jersey number range, covering
/// single/double-digit jerseys. Referenced by API DTO <c>[Range]</c> attributes
/// (<c>StarterKit.WebApi</c>/<c>StarterKit.MobileApi</c>) and by the service-layer/bulk-upload
/// validation in <c>StarterKit.Core</c> — never redeclare these bounds locally.
/// </summary>
public static class JerseyNumberConstraints
{
    public const int Min = 0;
    public const int Max = 99;
}
