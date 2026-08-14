using Microsoft.Extensions.DependencyInjection;
using StarterKit.Auth.Extensions;

namespace StarterKit.MobileApi.Extensions;

internal static class OpenApiExtensions
{
    /// <summary>
    /// Configures StarterKit OpenAPI documentation with Bearer token authentication.
    /// Delegates to the shared implementation in StarterKit.Auth.
    /// </summary>
    public static IServiceCollection AddStarterKitOpenApi(this IServiceCollection services) =>
        StarterKit.Auth.Extensions.OpenApiExtensions.AddStarterKitOpenApi(services);
}
