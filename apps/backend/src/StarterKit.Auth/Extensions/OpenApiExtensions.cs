using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi;
using StarterKit.Auth.Dev;

namespace StarterKit.Auth.Extensions;

/// <summary>
/// Shared OpenAPI configuration for Bearer token authentication across all StarterKit APIs.
/// </summary>
public static class OpenApiExtensions
{
    private const string BearerScheme = "Bearer";

    public static IServiceCollection AddStarterKitOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(options =>
        {
            // Render enums as strings instead of integers
            options.AddSchemaTransformer(
                (schema, context, _) =>
                {
                    var type = context.JsonTypeInfo.Type;
                    var enumType = type.IsEnum ? type : Nullable.GetUnderlyingType(type);
                    if (enumType is { IsEnum: true })
                    {
                        schema.Type = JsonSchemaType.String;
                        schema.AnyOf = null;
                        schema.Enum = Enum.GetNames(enumType)
                            .Select(name => (JsonNode)JsonValue.Create(name)!)
                            .ToList();
                    }
                    return Task.CompletedTask;
                }
            );

            // Register the Bearer security scheme AND per-operation security requirements
            // in a single document transformer so the host document is available when
            // constructing OpenApiSecuritySchemeReference (required by Microsoft.OpenApi v2
            // for CanSerializeSecurityScheme to return true).
            options.AddDocumentTransformer(
                (document, context, _) =>
                {
                    // 1 — declare the scheme
                    document.Components ??= new OpenApiComponents();
                    document.Components.SecuritySchemes ??=
                        new Dictionary<string, IOpenApiSecurityScheme>();
                    document.Components.SecuritySchemes[BearerScheme] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.Http,
                        Scheme = "bearer",
                        BearerFormat = "JWT",
                        Description =
                            "Firebase ID token. Obtain one via the frontend sign-in or the "
                            + "signInWithPassword REST API, then paste it here.",
                    };

                    // 2 — build a set of (path, method) pairs that require auth
                    // Includes standard [Authorize] endpoints and any endpoint marked with
                    // [RequiresBearerToken] (used for endpoints that validate the token manually
                    // but are [AllowAnonymous] so the middleware doesn't block them).
                    var secured = context
                        .DescriptionGroups.SelectMany(g => g.Items)
                        .Where(d =>
                        {
                            var meta = d.ActionDescriptor.EndpointMetadata;
                            var hasAuthorize =
                                meta.OfType<IAuthorizeData>().Any()
                                && !meta.OfType<IAllowAnonymous>().Any();
                            var hasManualBearer = meta.OfType<RequiresBearerTokenAttribute>().Any();
                            return hasAuthorize || hasManualBearer;
                        })
                        .Select(d =>
                            (
                                path: "/" + (d.RelativePath?.TrimEnd('/') ?? string.Empty),
                                method: d.HttpMethod?.ToLower() ?? string.Empty
                            )
                        )
                        .ToHashSet();

                    // 3 — stamp security onto each matching operation
                    foreach (var (pathStr, pathItem) in document.Paths)
                    {
                        foreach (var (operationType, operation) in pathItem.Operations)
                        {
                            if (!secured.Contains((pathStr, operationType.ToString().ToLower())))
                                continue;

                            operation.Security =
                            [
                                new OpenApiSecurityRequirement
                                {
                                    {
                                        new OpenApiSecuritySchemeReference(BearerScheme, document),
                                        []
                                    },
                                },
                            ];
                        }
                    }

                    return Task.CompletedTask;
                }
            );
        });

        return services;
    }
}
