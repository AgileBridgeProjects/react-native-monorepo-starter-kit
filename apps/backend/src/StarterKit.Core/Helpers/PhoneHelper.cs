using PhoneNumbers;

namespace StarterKit.Core.Helpers;

/// <summary>
/// Phone number normalisation utilities backed by libphonenumber-csharp.
/// </summary>
public static class PhoneHelper
{
    private static readonly PhoneNumberUtil PhoneUtil = PhoneNumberUtil.GetInstance();

    /// <summary>
    /// Strips whitespace and converts to E.164 form so "0821234567",
    /// "+27821234567" and "082 123 4567" all collapse to the same canonical value.
    /// Used for lightweight DB-side normalisation — not a full validity check.
    /// </summary>
    public static string NormalisePhone(string raw)
    {
        var stripped = new string(raw.Where(c => !char.IsWhiteSpace(c)).ToArray());
        if (stripped.StartsWith('0') && stripped.Length >= 2)
            return "+27" + stripped[1..];
        return stripped;
    }

    /// <summary>
    /// Validates and normalises a phone number to E.164 using the supplied
    /// ISO 3166-1 alpha-2 <paramref name="countryCode"/> as the default region.
    /// Strips Excel leading-apostrophe text prefixes before parsing.
    /// Returns <c>false</c> if the value is not a valid number for that region.
    /// </summary>
    public static bool TryNormaliseInternationalPhone(
        string raw,
        string countryCode,
        out string normalised
    )
    {
        var input = raw.Trim().TrimStart('\'');
        if (input.Length == 0)
        {
            normalised = string.Empty;
            return false;
        }

        try
        {
            var parsed = PhoneUtil.Parse(input, countryCode.ToUpperInvariant());
            if (!PhoneUtil.IsValidNumber(parsed))
            {
                normalised = string.Empty;
                return false;
            }
            normalised = PhoneUtil.Format(parsed, PhoneNumberFormat.E164);
            return true;
        }
        catch (NumberParseException)
        {
            normalised = string.Empty;
            return false;
        }
    }

    /// <summary>
    /// Validates and normalises a South African mobile number to E.164 (+27xxxxxxxxx).
    /// Convenience wrapper around <see cref="TryNormaliseInternationalPhone"/> with region "ZA".
    /// </summary>
    public static bool TryNormaliseSouthAfricanPhone(string raw, out string normalised) =>
        TryNormaliseInternationalPhone(raw, "ZA", out normalised);
}
