namespace StarterKit.Core.Notifications.Helpers;

/// <summary>
/// Masks PII for safe inclusion in log output. The full value is never written —
/// only enough characters to make log entries cross-referenceable when debugging.
/// </summary>
public static class PiiMasker
{
    /// <summary>
    /// Masks an email address. <c>alice@example.com</c> → <c>al***@example.com</c>.
    /// Short locals or malformed inputs are fully redacted.
    /// </summary>
    public static string MaskEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return "***@***";

        var atIndex = email.IndexOf('@');
        if (atIndex <= 2)
            return "***@***";

        return string.Concat(email.AsSpan(0, 2), "***", email.AsSpan(atIndex));
    }

    /// <summary>
    /// Masks a phone number. <c>+27821234567</c> → <c>+27***4567</c>.
    /// Numbers shorter than 5 characters are fully redacted.
    /// </summary>
    public static string MaskPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length <= 4)
            return "***";

        return string.Concat(phone.AsSpan(0, 3), "***", phone.AsSpan(phone.Length - 4));
    }
}
