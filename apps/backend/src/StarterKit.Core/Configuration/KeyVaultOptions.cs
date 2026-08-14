namespace StarterKit.Core.Configuration;

public sealed class KeyVaultOptions
{
    public const string SectionName = "KeyVault";

    /// <summary>
    /// Azure Key Vault name (e.g. "starterkit-dev-kv").
    /// Leave as "#" or omit to skip Key Vault — Firebase and other secrets
    /// must then be supplied via environment variables or user secrets.
    /// </summary>
    public string? Name { get; init; }

    /// <summary>
    /// Set to <c>false</c> to skip Key Vault even when <see cref="Name"/> is set.
    /// Defaults to <c>true</c>.
    /// </summary>
    public bool Enabled { get; init; } = true;

    /// <summary>True when a real vault name has been configured and not explicitly disabled.</summary>
    public bool IsConfigured => Enabled && !string.IsNullOrWhiteSpace(Name) && Name != "#";
}
