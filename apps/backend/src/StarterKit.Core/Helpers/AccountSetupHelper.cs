using System.Security.Cryptography;
using System.Text;

namespace StarterKit.Core.Helpers;

/// <summary>
/// Cryptographic helpers for the account setup flow.
/// All values are generated with <see cref="RandomNumberGenerator"/> (CSPRNG).
/// </summary>
public static class AccountSetupHelper
{
    private const string UpperChars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string LowerChars = "abcdefghjkmnpqrstuvwxyz";
    private const string DigitChars = "23456789";
    private const string SpecialChars = "!@#$%^&*";
    private const string AllChars = UpperChars + LowerChars + DigitChars + SpecialChars;

    private const int PasswordLength = 20;
    private const int MaxGenerationAttempts = 20;

    /// <summary>
    /// Common short words that must not appear as substrings in generated passwords (AC 1c).
    /// Only words ≥ 3 chars are checked — shorter substrings are too likely to match CSPRNG output.
    /// </summary>
    private static readonly string[] ForbiddenWords =
    [
        "password",
        "pass",
        "word",
        "admin",
        "user",
        "login",
        "welcome",
        "test",
        "game",
        "qwerty",
        "letmein",
        "master",
        "dragon",
        "monkey",
        "shadow",
        "sunshine",
        "princess",
        "football",
        "baseball",
        "soccer",
        "hockey",
        "batman",
        "trustno",
        "ranger",
        "hello",
        "charlie",
    ];

    /// <summary>
    /// Generates a CSPRNG temporary password that satisfies AC 1:
    /// ≥16 chars, upper, lower, digit, special — guaranteed by construction.
    /// AC 1c: the generated password must not contain the user's name parts,
    /// email prefix, or any common dictionary word.
    /// The caller must BCrypt-hash this value before persisting.
    /// </summary>
    public static string GenerateTemporaryPassword(string? displayName = null, string? email = null)
    {
        for (int attempt = 0; attempt < MaxGenerationAttempts; attempt++)
        {
            var password = GenerateRawPassword();
            if (!ContainsForbiddenSubstring(password, displayName, email))
                return password;
        }

        // Fail closed rather than returning an unchecked password that may violate AC 1c.
        throw new InvalidOperationException(
            $"Failed to generate a compliant temporary password within {MaxGenerationAttempts} attempts."
        );
    }

    private static string GenerateRawPassword()
    {
        var chars = new char[PasswordLength];

        // Guarantee one of each required character class at positions 0-3.
        chars[0] = PickOne(UpperChars);
        chars[1] = PickOne(LowerChars);
        chars[2] = PickOne(DigitChars);
        chars[3] = PickOne(SpecialChars);

        // Fill remainder with characters from the full set.
        for (int i = 4; i < PasswordLength; i++)
            chars[i] = PickOne(AllChars);

        // Shuffle positions using CSPRNG to avoid predictable character placement.
        for (int i = PasswordLength - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return new string(chars);
    }

    /// <summary>
    /// Returns true when the password contains a forbidden substring:
    /// user name parts, email prefix, or common dictionary words (AC 1c).
    /// Only substrings ≥ 3 characters are checked.
    /// </summary>
    internal static bool ContainsForbiddenSubstring(
        string password,
        string? displayName,
        string? email
    )
    {
        var lower = password.ToLowerInvariant();

        // Check user's name parts (first name, last name, etc.)
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            foreach (
                var part in displayName.Split(
                    ' ',
                    StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries
                )
            )
            {
                if (part.Length >= 3 && lower.Contains(part.ToLowerInvariant()))
                    return true;
            }
        }

        // Check email prefix (everything before @)
        if (!string.IsNullOrWhiteSpace(email))
        {
            var prefix = email.Split('@')[0];
            if (prefix.Length >= 3 && lower.Contains(prefix.ToLowerInvariant()))
                return true;
        }

        // Check common dictionary words
        foreach (var word in ForbiddenWords)
        {
            if (lower.Contains(word))
                return true;
        }

        return false;
    }

    /// <summary>
    /// Generates a cryptographically random one-time setup token.
    /// Returns the plaintext token (to be placed in the email link)
    /// and its SHA-256 hex hash (to be stored in the database).
    /// </summary>
    public static (string PlaintextToken, string TokenHash) GenerateSetupToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var plaintext = Convert
            .ToBase64String(bytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('='); // URL-safe base64

        var hash = HashToken(plaintext);
        return (plaintext, hash);
    }

    /// <summary>Computes SHA-256 hex hash of the given token. Used for lookup.</summary>
    public static string HashToken(string token)
    {
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexStringLower(hashBytes);
    }

    /// <summary>
    /// Returns true when the candidate password satisfies the complexity rules:
    /// ≥6 chars, upper, lower, digit, special.
    /// </summary>
    public static bool MeetsComplexityRequirements(string password)
    {
        if (password.Length < 6)
            return false;

        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSpecial = password.Any(c => !char.IsLetterOrDigit(c));

        return hasUpper && hasLower && hasDigit && hasSpecial;
    }

    private static char PickOne(string source) =>
        source[RandomNumberGenerator.GetInt32(source.Length)];
}
