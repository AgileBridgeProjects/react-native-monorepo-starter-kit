using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace StarterKit.Core.Notifications.Options;

public sealed class TwilioOptions
{
    public const string SectionName = "Twilio";

    [Required(AllowEmptyStrings = false)]
    public required string AccountSid { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string AuthToken { get; init; }

    [Required(AllowEmptyStrings = false)]
    public required string FromNumber { get; init; }

    /// <summary>
    /// When true, Twilio test credentials are used — no real SMS is sent and no cost is incurred.
    /// Requires <see cref="TestAccountSid"/>, <see cref="TestAuthToken"/>, and
    /// <see cref="TestFromNumber"/> to be populated (stored separately in Key Vault).
    /// Use in dev/test environments.
    /// </summary>
    public bool UseTestCredentials { get; init; }

    public string? TestAccountSid { get; init; }
    public string? TestAuthToken { get; init; }
    public string? TestFromNumber { get; init; }

    /// <summary>Returns the effective Account SID based on <see cref="UseTestCredentials"/>.</summary>
    internal string EffectiveAccountSid => UseTestCredentials ? TestAccountSid! : AccountSid;

    /// <summary>Returns the effective Auth Token based on <see cref="UseTestCredentials"/>.</summary>
    internal string EffectiveAuthToken => UseTestCredentials ? TestAuthToken! : AuthToken;

    /// <summary>Returns the effective From number based on <see cref="UseTestCredentials"/>.</summary>
    internal string EffectiveFromNumber => UseTestCredentials ? TestFromNumber! : FromNumber;
}

/// <summary>
/// Validates cross-property invariants for <see cref="TwilioOptions"/> at startup.
/// Ensures that when <see cref="TwilioOptions.UseTestCredentials"/> is true the three
/// test credential fields are all populated — catching misconfiguration before the first
/// SMS send attempt rather than inside a Polly retry loop.
/// </summary>
internal sealed class TwilioOptionsValidator : IValidateOptions<TwilioOptions>
{
    public ValidateOptionsResult Validate(string? name, TwilioOptions options)
    {
        if (!options.UseTestCredentials)
            return ValidateOptionsResult.Success;

        var errors = new List<string>(3);

        if (string.IsNullOrEmpty(options.TestAccountSid))
            errors.Add("TestAccountSid is required when UseTestCredentials is true.");
        if (string.IsNullOrEmpty(options.TestAuthToken))
            errors.Add("TestAuthToken is required when UseTestCredentials is true.");
        if (string.IsNullOrEmpty(options.TestFromNumber))
            errors.Add("TestFromNumber is required when UseTestCredentials is true.");

        return errors.Count > 0
            ? ValidateOptionsResult.Fail(errors)
            : ValidateOptionsResult.Success;
    }
}
