using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using StarterKit.Mcp.Options;

namespace StarterKit.Mcp.Extensions;

public static class EndpointRouteBuilderExtensions
{
    /// <summary>
    /// Maps the MCP endpoint at the configured path, guarded by the same authentication
    /// the REST controllers use. No-op when <c>Mcp:Enabled</c> is false.
    /// </summary>
    /// <param name="rateLimitPolicy">
    /// Rate-limit policy applied to the endpoint (pass <c>RateLimitPolicies.ApiDefault</c>);
    /// null skips rate limiting.
    /// </param>
    public static IEndpointConventionBuilder? MapStarterKitMcp(
        this IEndpointRouteBuilder endpoints,
        string? rateLimitPolicy = null
    )
    {
        var options = endpoints.ServiceProvider.GetRequiredService<IOptions<McpOptions>>().Value;
        if (!options.Enabled || string.IsNullOrWhiteSpace(options.Path))
            return null;

        var mcpEndpoint = endpoints.MapMcp(options.Path).RequireAuthorization();

        if (rateLimitPolicy is not null)
            mcpEndpoint.RequireRateLimiting(rateLimitPolicy);

        return mcpEndpoint;
    }
}
