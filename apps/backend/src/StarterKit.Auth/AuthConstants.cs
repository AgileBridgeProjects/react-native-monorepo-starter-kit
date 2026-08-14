namespace StarterKit.Auth;

/// <summary>
/// Shared constants for the StarterKit.Auth layer.
/// </summary>
internal static class AuthConstants
{
    /// <summary>
    /// Synthetic email domain appended to usernames when provisioning a Firebase account
    /// for CustomAuthentication users (e.g. <c>jdoe@customauth.starterkitapp.internal</c>).
    /// <para>
    /// This value cannot be shared from a single source file because the backend (C#) and
    /// the frontend (TypeScript) are separate runtimes. The TypeScript counterpart lives in
    /// <c>packages/shared/src/lib/auth/auth-constants.ts</c> as
    /// <c>CUSTOM_AUTH_EMAIL_DOMAIN</c>. Both must remain identical — change them together.
    /// </para>
    /// <para>
    /// ⚠️ Changing this value is a breaking change: all existing CustomAuthentication
    /// Firebase accounts use this domain as part of their account identifier and would
    /// need to be migrated in Firebase before the new value can be deployed.
    /// </para>
    /// </summary>
    internal const string CustomAuthEmailDomain = "@customauth.starterkitapp.internal";
}
