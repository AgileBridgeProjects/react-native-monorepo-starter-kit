using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using StarterKit.Data.Exceptions;
using StarterKit.Mcp.Options;

namespace StarterKit.Mcp.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Registers the StarterKit MCP server: stateless Streamable HTTP transport, per-tool
    /// authorization filters (honouring the same <c>[Authorize]</c> attributes controllers use),
    /// domain-exception → tool-error mapping, and every <c>[McpServerToolType]</c> class found
    /// in <paramref name="toolAssembly"/>.
    /// </summary>
    public static IServiceCollection AddStarterKitMcp(
        this IServiceCollection services,
        Assembly toolAssembly
    )
    {
        // Path/ServerName are validated only when Enabled is true, so Mcp:Enabled=false — or an
        // omitted Mcp section — keeps the kill-switch usable instead of failing ValidateOnStart.
        services
            .AddOptions<McpOptions>()
            .BindConfiguration(McpOptions.SectionName)
            .Validate(
                o => !o.Enabled || !string.IsNullOrWhiteSpace(o.Path),
                "Mcp:Path is required when Mcp:Enabled is true."
            )
            .Validate(
                o => !o.Enabled || !string.IsNullOrWhiteSpace(o.ServerName),
                "Mcp:ServerName is required when Mcp:Enabled is true."
            )
            .ValidateOnStart();

        // Advertise the configured server name; version tracks the hosting assembly. The
        // assembly-name fallback only applies when MCP is disabled (validation guarantees a
        // ServerName otherwise), so a disabled server never NREs resolving McpServerOptions.
        services
            .AddOptions<McpServerOptions>()
            .Configure<IOptions<McpOptions>>(
                (serverOptions, mcpOptions) =>
                    serverOptions.ServerInfo = new Implementation
                    {
                        Name =
                            mcpOptions.Value.ServerName
                            ?? toolAssembly.GetName().Name
                            ?? "starterkit",
                        Version = toolAssembly.GetName().Version?.ToString(3) ?? "1.0.0",
                    }
            );

        // Match the REST wire format: web casing + enums as strings (same as AddJsonOptions).
        // An explicit resolver is required — the SDK freezes these options at tool creation.
        var serializerOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            TypeInfoResolver =
                new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver(),
            Converters = { new JsonStringEnumConverter() },
        };

        services
            .AddMcpServer()
            // Stateless mode: every JSON-RPC call is an independent HTTP request that shares
            // the request's DI scope — ICurrentSession and EF tenant filters behave exactly
            // as they do inside controllers.
            .WithHttpTransport(options => options.Stateless = true)
            // Honour [Authorize]/[AllowAnonymous] on tool methods and hide tools the caller
            // is not authorized to invoke from tools/list.
            .AddAuthorizationFilters()
            .WithRequestFilters(filters => filters.AddCallToolFilter(DomainExceptionFilter))
            .WithToolsFromAssembly(toolAssembly, serializerOptions);

        return services;
    }

    /// <summary>
    /// MCP counterpart of the API projects' global <c>IExceptionHandler</c>s: translates the
    /// shared domain exceptions into descriptive tool errors instead of the SDK's generic
    /// "an error occurred" message. Unknown exceptions rethrow so internals never leak.
    /// </summary>
    private static McpRequestHandler<CallToolRequestParams, CallToolResult> DomainExceptionFilter(
        McpRequestHandler<CallToolRequestParams, CallToolResult> next
    ) =>
        async (context, cancellationToken) =>
        {
            try
            {
                return await next(context, cancellationToken);
            }
            catch (Exception ex)
                when (ex
                        is EntityNotFoundException
                            or ConflictException
                            or ValidationException
                            or ArgumentException
                )
            {
                var logger = context
                    .Services?.GetService<ILoggerFactory>()
                    ?.CreateLogger("StarterKit.Mcp.DomainExceptionFilter");
                logger?.LogWarning(
                    ex,
                    "MCP tool '{Tool}' rejected the request.",
                    context.Params?.Name
                );

                return new CallToolResult
                {
                    IsError = true,
                    Content = [new TextContentBlock { Text = ex.Message }],
                };
            }
        };
}
