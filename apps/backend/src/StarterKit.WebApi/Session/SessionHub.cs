using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using StarterKit.Data.Extensions;

namespace StarterKit.WebApi.Session;

/// <summary>
/// Client-to-server hub for session lifecycle management.
///
/// On every connect (including reconnects after the WebSocket dropped), the server
/// immediately evaluates the user's current session state and pushes any pending
/// warning or expiry to the caller. This ensures that a user who returns after
/// 28 minutes of inactivity is immediately told about their expired/near-expiry
/// session — even though the SignalR connection was down for most of that time.
/// </summary>
[Authorize]
public sealed class SessionHub(
    ISessionTracker sessionTracker,
    IOptions<SessionTimeoutOptions> options,
    TimeProvider clock
) : Hub<ISessionHub>
{
    /// <summary>
    /// Called when the user explicitly clicks "Stay signed in".
    /// Always resets the idle timer — even during the warning window.
    /// </summary>
    public Task ExtendSessionAsync()
    {
        if (Context.UserIdentifier is { } userId)
            sessionTracker.RecordActivity(userId);

        return Task.CompletedTask;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = Context.UserIdentifier;
        if (userId is null)
        {
            await base.OnConnectedAsync();
            return;
        }

        sessionTracker.RegisterConnection(userId, Context.ConnectionId);
        await base.OnConnectedAsync();

        // Immediately evaluate the current session state and push it to this client.
        // This is the critical fix: a user whose WebSocket was down for 28 minutes
        // gets the correct state (warning or expiry) the moment they reconnect,
        // rather than silently starting a fresh idle cycle.
        await PushCurrentStateToCallerAsync(userId);
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        if (Context.UserIdentifier is { } userId)
            sessionTracker.UnregisterConnection(userId, Context.ConnectionId);

        return base.OnDisconnectedAsync(exception);
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private async Task PushCurrentStateToCallerAsync(string userId)
    {
        var session = sessionTracker.GetSession(userId);
        if (session is null)
            return;

        var opts = options.Value;
        var now = clock.Now();
        var idleFor = now - session.LastActivityAt;
        var connectedFor = now - session.SessionStartedAt;

        if (connectedFor >= opts.AbsoluteTimeout)
        {
            await Clients.Caller.ReceiveSessionExpiredAsync("absolute");
            return;
        }

        if (idleFor >= opts.IdleTimeout)
        {
            await Clients.Caller.ReceiveSessionExpiredAsync("idle");
            return;
        }

        var timeUntilIdleExpiry = opts.IdleTimeout - idleFor;
        if (timeUntilIdleExpiry <= opts.WarningPeriod)
        {
            // Compute remaining time from when the warning was first issued (WarningStartedAt),
            // not from the current idle arithmetic. This gives the user the correct countdown
            // across reconnects without silently re-extending the session.
            // If WarningStartedAt is null (warning issued by this reconnect, first time),
            // anchor it to now and grant the full warning period.
            if (!session.WarningSent)
            {
                session.WarningSent = true;
                session.WarningStartedAt = now;
            }

            var elapsed = now - (session.WarningStartedAt ?? now);
            var remainingSeconds = (int)(opts.WarningPeriod - elapsed).TotalSeconds;

            if (remainingSeconds <= 0)
            {
                // The full warning period has elapsed since the warning was first sent —
                // the user missed their window entirely.
                await Clients.Caller.ReceiveSessionExpiredAsync("idle");
                sessionTracker.RemoveSession(userId);
                return;
            }

            await Clients.Caller.ReceiveSessionWarningAsync(remainingSeconds);
        }
    }
}
