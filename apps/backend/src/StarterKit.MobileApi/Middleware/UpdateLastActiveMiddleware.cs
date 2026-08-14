using Microsoft.EntityFrameworkCore;
using StarterKit.Data.Extensions;
using StarterKit.Data.Persistence;

namespace StarterKit.MobileApi.Middleware;

/// <summary>
/// Updates Users.LastActiveAt on every authenticated request.
/// Used by the push notification sweep job to suppress pushes for active users.
/// Runs after the response is sent (post-pipeline); the DB write is awaited but
/// happens after <c>await next(context)</c> so the client never waits for it.
/// Exceptions are swallowed to avoid disrupting in-flight requests.
/// </summary>
public sealed class UpdateLastActiveMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AppDbContext db, TimeProvider clock)
    {
        await next(context);

        var userId = context
            .User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)
            ?.Value;
        if (userId is not null && Guid.TryParse(userId, out var userGuid))
        {
            var now = clock.Now();
            try
            {
                await db
                    .Users.Where(u => u.Id == userGuid)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastActiveAt, now));
            }
            catch
            {
                // Non-critical — swallow exceptions so the response is unaffected
            }
        }
    }
}
