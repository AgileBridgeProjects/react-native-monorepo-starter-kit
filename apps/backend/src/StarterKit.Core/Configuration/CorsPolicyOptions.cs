using System.ComponentModel.DataAnnotations;

namespace StarterKit.Core.Configuration;

public sealed class CorsPolicyOptions
{
    public const string SectionName = "Cors";

    /// <summary>
    /// Origins permitted to make cross-origin requests to this API.
    /// Defaults to localhost:3000 for local development.
    /// Override per-environment via Azure App Settings using
    /// <c>Cors__AllowedOrigins__0</c>, <c>Cors__AllowedOrigins__1</c>, etc.
    /// </summary>
    [Required]
    [MinLength(1, ErrorMessage = "Cors:AllowedOrigins must contain at least one origin.")]
    public string[] AllowedOrigins { get; init; } = ["http://localhost:3000"];

    /// <summary>
    /// The production base domain used to allow all subdomains (e.g. acme.{BaseDomain}).
    /// Configure via <c>Cors__BaseDomain</c> in App Settings or Key Vault.
    /// Defaults to <c>yourapp.example.com</c> but should be overridden for the target deployment.
    /// </summary>
    [Required]
    public string BaseDomain { get; init; } = "yourapp.example.com";
}
