using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Options;
using StarterKit.Data.Extensions;

namespace StarterKit.WebApi.Session;

/// <summary>
/// Background service that polls active sessions every 30 seconds and pushes
/// session warning / expiry events via SignalR.
///
/// Sessions with no active connections are silently cleaned up when their idle
/// timeout is reached — the user will receive the expiry event the moment they
/// reconnect (via <see cref="SessionHub.OnConnectedAsync"/>).
/// </summary>
public sealed class SessionMonitorService(
    ISessionTracker sessionTracker,
    IHubContext<SessionHub, ISessionHub> hubContext,
    IOptions<SessionTimeoutOptions> options,
    TimeProvider clock,
    ILogger<SessionMonitorService> logger
) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(PollInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CheckSessionsAsync(stoppingToken);
        }
    }

    private async Task CheckSessionsAsync(CancellationToken ct)
    {
        var config = options.Value;
        var now = clock.Now();

        foreach (var session in sessionTracker.GetAllSessions())
        {
            try
            {
                var idleFor = now - session.LastActivityAt;
                var connectedFor = now - session.SessionStartedAt;

                // ── Sessions with no active connections ──────────────────────────
                // We cannot push events to them. Clean up only if past the idle timeout
                // (they will receive the expiry event via OnConnectedAsync on reconnect).
                if (!session.HasActiveConnections)
                {
                    if (idleFor >= config.IdleTimeout || connectedFor >= config.AbsoluteTimeout)
                    {
                        logger.LogDebug(
                            "Removing ghost session for user {UserId} (no connections, idle {Minutes:F1}min)",
                            session.UserId,
                            idleFor.TotalMinutes
                        );
                        sessionTracker.RemoveSession(session.UserId);
                    }
                    continue;
                }

                // ── Sessions with active connections ─────────────────────────────

                // 1. Absolute timeout — hard logout, no warning
                if (connectedFor >= config.AbsoluteTimeout)
                {
                    logger.LogInformation(
                        "Absolute timeout for user {UserId} after {Hours:F1}h",
                        session.UserId,
                        connectedFor.TotalHours
                    );
                    await hubContext
                        .Clients.User(session.UserId)
                        .ReceiveSessionExpiredAsync("absolute", ct);
                    sessionTracker.RemoveSession(session.UserId);
                    continue;
                }

                // 2. Idle expired
                if (idleFor >= config.IdleTimeout)
                {
                    logger.LogInformation(
                        "Idle timeout for user {UserId} after {Minutes:F1}min idle",
                        session.UserId,
                        idleFor.TotalMinutes
                    );
                    await hubContext
                        .Clients.User(session.UserId)
                        .ReceiveSessionExpiredAsync("idle", ct);
                    sessionTracker.RemoveSession(session.UserId);
                    continue;
                }

                // 3. Approaching idle timeout — send warning once per idle cycle
                var timeUntilExpiry = config.IdleTimeout - idleFor;
                if (timeUntilExpiry <= config.WarningPeriod && !session.WarningSent)
                {
                    session.WarningSent = true;
                    session.WarningStartedAt = now; // anchor for reconnect remaining-time calculation
                    logger.LogDebug(
                        "Sending session warning to user {UserId} — {Seconds}s remaining",
                        session.UserId,
                        (int)config.WarningPeriod.TotalSeconds
                    );
                    await hubContext
                        .Clients.User(session.UserId)
                        .ReceiveSessionWarningAsync((int)config.WarningPeriod.TotalSeconds, ct);
                }

                // 4. User became active again after a warning — reset so next idle cycle re-warns
                if (timeUntilExpiry > config.WarningPeriod && session.WarningSent)
                {
                    session.WarningSent = false;
                    session.WarningStartedAt = null;
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error checking session for user {UserId}", session.UserId);
            }
        }
    }
}
