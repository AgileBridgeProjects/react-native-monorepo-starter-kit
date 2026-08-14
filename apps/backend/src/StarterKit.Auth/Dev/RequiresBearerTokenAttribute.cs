namespace StarterKit.Auth.Dev;

/// <summary>
/// Marks an endpoint that performs manual Bearer token validation and should
/// display the lock icon in the OpenAPI/Scalar UI, even when decorated with
/// <see cref="Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute"/> to
/// bypass the ASP.NET Core auth middleware.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class RequiresBearerTokenAttribute : Attribute;
