namespace StarterKit.WebApi.Session;

/// <summary>
/// Records session activity for every authenticated mutating HTTP request.
///
/// Updates <see cref="UserSessionState.LastActivityAt"/> on POST/PUT/PATCH/DELETE calls
/// so the idle timer resets naturally as the user takes actions in the application.
/// Read-only requests (GET/HEAD/OPTIONS) are intentionally excluded — background
/// React Query refetches must not silently reset the idle timer.
/// </summary>
public sealed class SessionActivityMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ISessionTracker sessionTracker)
    {
        await next(context);

        // Only track activity for authenticated non-hub requests.
        if (
            context.User.Identity?.IsAuthenticated is not true
            || context.Request.Path.StartsWithSegments("/hubs")
        )
            return;

        var userId = context.User.FindFirst("internal_user_id")?.Value;
        if (string.IsNullOrEmpty(userId))
            return;

        // Only record activity for mutating requests. GET/HEAD/OPTIONS are typically
        // React Query background refetches (e.g. refetchOnWindowFocus on tab wake) and
        // must not silently reset the idle timer.
        if (
            HttpMethods.IsGet(context.Request.Method)
            || HttpMethods.IsHead(context.Request.Method)
            || HttpMethods.IsOptions(context.Request.Method)
        )
            return;

        // Do NOT reset the idle timer while a warning is already in flight.
        var session = sessionTracker.GetSession(userId);
        if (session?.WarningSent is true)
            return;

        sessionTracker.RecordActivity(userId);
    }
}
