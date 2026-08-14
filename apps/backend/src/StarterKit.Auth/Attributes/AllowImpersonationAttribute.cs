namespace StarterKit.Auth.Attributes;

/// <summary>
/// Marks a controller or action as supporting impersonation context.
///
/// When present, <see cref="StarterKit.Auth.Middleware.ImpersonationMiddleware"/> will inject
/// club/team impersonation claims from the <c>X-Impersonate-Club</c> and
/// <c>X-Impersonate-Team</c> request headers. The EF Core global query filter in
/// <see cref="StarterKit.Data.Persistence.AppDbContext"/> will then scope results to the
/// impersonated tenant for the duration of the request.
///
/// <para>
/// Endpoints <b>without</b> this attribute always run with cross-tenant access — impersonation
/// headers are silently ignored even if present in the request.
/// </para>
///
/// <para>
/// Apply at the controller level to opt the entire controller in to impersonation, or at
/// the action level for per-endpoint control.
/// </para>
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AllowImpersonationAttribute : Attribute { }
