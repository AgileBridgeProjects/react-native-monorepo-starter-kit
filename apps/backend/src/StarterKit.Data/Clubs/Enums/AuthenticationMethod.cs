namespace StarterKit.Data.Clubs.Enums;

/// <summary>
/// Specifies which authentication method is available to users of a club.
/// The selected method is used for both admin portal login and trainee app login.
/// </summary>
public enum AuthenticationMethod
{
    /// <summary>Standard credentials (email + password). Triggers setup-link flow on user creation.</summary>
    Credentials,

    /// <summary>Microsoft 365 / Azure AD account.</summary>
    Microsoft365,

    /// <summary>Google account.</summary>
    Google,

    /// <summary>Phone number with SMS OTP. No password; not eligible for setup-link flow.</summary>
    PhoneOtp,

    /// <summary>Custom username + system-generated password. For users with no email or phone number.</summary>
    CustomAuthentication,
}
