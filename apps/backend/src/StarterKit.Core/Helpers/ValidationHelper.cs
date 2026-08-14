using System.Text.RegularExpressions;

namespace StarterKit.Core.Helpers;

/// <summary>
/// Shared input-validation helpers used across bulk-upload parsing and service-layer validation.
/// </summary>
public static partial class ValidationHelper
{
    /// <summary>
    /// Returns <c>true</c> when <paramref name="value"/> contains only letters, spaces,
    /// hyphens, and apostrophes (suitable for first/last name fields).
    /// </summary>
    public static bool IsValidName(string value) => NameRegex().IsMatch(value);

    /// <summary>
    /// Returns <c>true</c> when <paramref name="value"/> looks like a well-formed email address.
    /// </summary>
    public static bool IsValidEmail(string value) => EmailRegex().IsMatch(value);

    [GeneratedRegex(@"^[\p{L}\s\-']+$")]
    private static partial Regex NameRegex();

    [GeneratedRegex(@"^[^\s@]+@[^\s@]+\.[^\s@]+$")]
    private static partial Regex EmailRegex();
}
