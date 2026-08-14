using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using StarterKit.Auth.Constants;

namespace StarterKit.Auth.Middleware;

/// <summary>
/// Rejects authenticated requests that carry no <c>internal_user_id</c> claim with
/// <see cref="StatusCodes.Status403Forbidden"/>.
///
/// <para>
/// The <c>internal_user_id</c> claim is added by <c>RoleClaimsTransformer</c> after
/// a successful database lookup. When a user's <c>IsActive</c> flag is <c>false</c>, the
/// transformer intentionally withholds claim enrichment, leaving the principal
/// authenticated (valid Firebase/Entra JWT) but without <c>internal_user_id</c>.
/// </para>
///
/// <para>
/// Without this middleware, disabled users would pass <c>[Authorize]</c> (they hold a valid
/// token) and cause an <see cref="InvalidOperationException"/> in controllers that call
/// <c>ICurrentSession.UserId</c>. This middleware short-circuits those requests cleanly
/// before they reach any controller action.
/// </para>
///
/// <para>
/// Registration order: must be placed after <c>UseAuthentication()</c> (so claims
/// transformation has already run) and before <c>UseAuthorization()</c> and
/// <c>MapControllers()</c>.
/// </para>
/// </summary>
public sealed class DisabledUserMiddleware(
    RequestDelegate next,
    IProblemDetailsService problemDetailsService
)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (
            context.User.Identity?.IsAuthenticated == true
            && context.User.FindFirst(StarterKitClaims.InternalUserId) is null
        )
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await problemDetailsService.TryWriteAsync(
                new ProblemDetailsContext
                {
                    HttpContext = context,
                    ProblemDetails =
                    {
                        Status = StatusCodes.Status403Forbidden,
                        Title = "Access Denied",
                        Detail =
                            "Your account could not be authorized for this application. Contact your administrator if the problem persists.",
                    },
                }
            );
            return;
        }

        await next(context);
    }
}
