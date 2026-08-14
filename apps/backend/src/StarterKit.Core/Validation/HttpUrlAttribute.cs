using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Validation;

/// <summary>
/// Validates that a string property is an absolute <c>http</c> or <c>https</c> URL.
///
/// Null/blank passes — apply this to optional fields and pair it with <see cref="RequiredAttribute"/>
/// when the value is mandatory. Deliberately scheme-restricted rather than "any well-formed URI":
/// these values are user-supplied and rendered as tappable links in the mobile app, so allowing
/// arbitrary schemes (<c>javascript:</c>, <c>file:</c>, an app's custom scheme) would let one user
/// hand a link target to everyone else on their team. `Uri.TryCreate` alone accepts all of those.
///
/// This validates the *shape* of a link the client will open. It is not an SSRF guard: nothing
/// server-side fetches this URL. Any endpoint that does fetch a user-supplied URL needs the full
/// guard described in docs/standards/nfr-security.md instead.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Parameter)]
public sealed class HttpUrlAttribute : ValidationAttribute
{
    public HttpUrlAttribute()
        : base("The {0} field must be a valid http or https URL.") { }

    public override bool IsValid(object? value)
    {
        if (value is null)
            return true;
        if (value is not string text)
            return false;
        if (string.IsNullOrWhiteSpace(text))
            return true;

        return Uri.TryCreate(text, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
