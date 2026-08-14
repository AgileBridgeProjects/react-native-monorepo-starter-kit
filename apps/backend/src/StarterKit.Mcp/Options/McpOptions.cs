namespace StarterKit.Mcp.Options;

/// <summary>
/// Configuration for the MCP (Model Context Protocol) server endpoint hosted by an API project.
/// Bound from the <c>Mcp</c> section of appsettings.json.
///
/// <see cref="Path"/> and <see cref="ServerName"/> are only required when <see cref="Enabled"/>
/// is true — validated conditionally in <c>AddStarterKitMcp</c> so that turning the kill-switch off
/// (or omitting the section entirely) never blocks startup.
/// </summary>
public sealed class McpOptions
{
    public const string SectionName = "Mcp";

    /// <summary>Kill-switch — when false the MCP endpoint is not mapped at all.</summary>
    public bool Enabled { get; init; }

    /// <summary>Route the MCP endpoint is served from (e.g. <c>/mcp</c>). Required when enabled.</summary>
    public string? Path { get; init; }

    /// <summary>MCP server name advertised to clients during initialization. Required when enabled.</summary>
    public string? ServerName { get; init; }
}
