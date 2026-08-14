namespace StarterKit.Auth.Permissions;

/// <summary>
/// Central permission definitions for the StarterKit platform.
/// Each permission is a dot-delimited string: <c>StarterKit.{Group}.{Action}</c>.
/// Roles are assigned sets of these permissions in the database.
/// Controllers use <c>[Authorize(Policy = StarterKitPermissions.Users.Manage)]</c>
/// instead of role names.
/// </summary>
public static class StarterKitPermissions
{
    public static class Clubs
    {
        public const string View = "StarterKit.Clubs.View";
        public const string Manage = "StarterKit.Clubs.Manage";
    }

    public static class Users
    {
        public const string View = "StarterKit.Users.View";
        public const string Manage = "StarterKit.Users.Manage";

        /// <summary>
        /// Bulk-upload user creation (template download, preview, confirm). Distinct from
        /// <see cref="Manage"/> — per the identity split, downloading and uploading the bulk-upload
        /// template is a Super Admin-only action; Club Admins/Directors fill in the
        /// spreadsheet offline but do not use the portal's bulk-upload flow themselves.
        /// </summary>
        public const string BulkManage = "StarterKit.Users.BulkManage";
    }

    public static class Auditing
    {
        public const string View = "StarterKit.Auditing.View";
    }

    public static class Teams
    {
        public const string View = "StarterKit.Teams.View";
        public const string Manage = "StarterKit.Teams.Manage";
    }

    public static class Resources
    {
        public const string View = "StarterKit.Resources.View";
        public const string Manage = "StarterKit.Resources.Manage";
    }

    public static class Notifications
    {
        public const string Send = "StarterKit.Notifications.Send";
        public const string ViewHistory = "StarterKit.Notifications.ViewHistory";
        public const string ManageReminders = "StarterKit.Notifications.ManageReminders";
        public const string Receive = "StarterKit.Notifications.Receive";
    }

    public static class Reports
    {
        public const string View = "StarterKit.Reports.View";
        public const string Manage = "StarterKit.Reports.Manage";
        public const string TrackUsers = "StarterKit.Reports.TrackUsers";
        public const string TrackAdmins = "StarterKit.Reports.TrackAdmins";
    }

    public static class Profile
    {
        public const string View = "StarterKit.Profile.View";
        public const string Update = "StarterKit.Profile.Update";
    }

    /// <summary>
    /// Platform-level capabilities. Assigned only to roles that need to operate
    /// across all tenants (e.g. SuperAdmin). Any role can be granted these
    /// permissions via the RolePermissions table without a code change.
    /// </summary>
    public static class Roles
    {
        public const string View = "StarterKit.Roles.View";
        public const string Manage = "StarterKit.Roles.Manage";
    }

    public static class Platform
    {
        /// <summary>
        /// Grants cross-tenant access: bypasses tenant query filters and the
        /// ClubMemberRequirement IDOR guard.
        /// </summary>
        public const string Admin = "StarterKit.Platform.Admin";
    }

    /// <summary>
    /// Returns every permission constant defined in this class.
    /// Used for policy auto-registration and seeding.
    /// </summary>
    public static IReadOnlyList<string> All { get; } =
    [
        Clubs.View,
        Clubs.Manage,
        Users.View,
        Users.Manage,
        Users.BulkManage,
        Auditing.View,
        Teams.View,
        Teams.Manage,
        Resources.View,
        Resources.Manage,
        Notifications.Send,
        Notifications.ViewHistory,
        Notifications.ManageReminders,
        Notifications.Receive,
        Reports.View,
        Reports.Manage,
        Reports.TrackUsers,
        Reports.TrackAdmins,
        Profile.View,
        Profile.Update,
        Platform.Admin,
        Roles.View,
        Roles.Manage,
    ];
}
