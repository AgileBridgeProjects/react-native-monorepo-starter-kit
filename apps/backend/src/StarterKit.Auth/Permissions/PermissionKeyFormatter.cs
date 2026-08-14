using System.Text.RegularExpressions;

namespace StarterKit.Auth.Permissions;

/// <summary>
/// Converts dot-delimited permission keys (e.g. <c>StarterKit.AI.Games.Generate</c>)
/// to human-readable descriptions (e.g. <c>AI: Generate Games</c>).
/// </summary>
public static partial class PermissionKeyFormatter
{
    /// <summary>
    /// Formats a permission key as a human-readable description.
    /// <list type="bullet">
    ///   <item><c>"StarterKit.AI.Games.Generate"</c> → <c>"Generate Games"</c></item>
    ///   <item><c>"StarterKit.Notifications.ManageReminders"</c> → <c>"Manage Reminders"</c></item>
    /// </list>
    /// </summary>
    public static string FormatDescription(string key)
    {
        // segments: [0]=StarterKit [1]=Group [2..n]=SubGroup/Action
        var segments = key.Split('.');
        if (segments.Length < 3)
            return key;

        var action = string.Join(" ", segments[2..].Reverse().Select(SplitPascalCase));
        return action;
    }

    private static string SplitPascalCase(string input) => PascalCaseRegex().Replace(input, " $1");

    /// <summary>
    /// Groups all platform permissions by their second segment (e.g. "AI", "Clubs")
    /// and pairs each key with its human-readable description.
    /// </summary>
    public static IReadOnlyList<PermissionGroup> GetGroupedPermissions() =>
        StarterKitPermissions
            .All.GroupBy(p => p.Split('.')[1])
            .Select(g => new PermissionGroup(
                g.Key,
                g.Select(p => new PermissionEntry(p, FormatDescription(p))).ToList()
            ))
            .ToList();

    /// <summary>A group of permissions sharing the same second segment.</summary>
    public sealed record PermissionGroup(string Group, IReadOnlyList<PermissionEntry> Permissions);

    /// <summary>A single permission key with its formatted description.</summary>
    public sealed record PermissionEntry(string Key, string Description);

    [GeneratedRegex("(?<!^)([A-Z])")]
    private static partial Regex PascalCaseRegex();
}
