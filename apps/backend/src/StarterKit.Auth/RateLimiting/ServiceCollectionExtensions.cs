using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StarterKit.Auth.Constants;

namespace StarterKit.Auth.RateLimiting;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Returns a partition key that identifies the authenticated user when possible,
    /// falling back to the remote IP address for anonymous requests.
    /// Authentication middleware must run <em>before</em> <c>UseRateLimiter()</c> in the
    /// pipeline so that <c>context.User</c> is populated when this is evaluated.
    /// </summary>
    private static string GetPartitionKey(HttpContext context, string prefix)
    {
        var userId = context.User?.FindFirst(StarterKitClaims.InternalUserId)?.Value;
        return string.IsNullOrEmpty(userId)
            ? $"{prefix}ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}"
            : $"{prefix}user:{userId}";
    }

    /// <summary>
    /// Registers all StarterKit rate-limiting policies.
    /// Pass <paramref name="configuration"/> to allow the <c>ApiDefault</c> permit limit to
    /// be overridden via <c>RateLimiting:ApiDefault:PermitLimit</c> (useful for integration
    /// tests that need a low limit to trigger 429 without sending hundreds of requests).
    /// </summary>
    public static IServiceCollection AddStarterKitRateLimiting(
        this IServiceCollection services,
        IConfiguration? configuration = null
    )
    {
        var apiDefaultPermitLimit =
            configuration?.GetValue<int?>("RateLimiting:ApiDefault:PermitLimit") ?? 300;
        var apiDefaultWindowSeconds =
            configuration?.GetValue<int?>("RateLimiting:ApiDefault:WindowSeconds") ?? 60;

        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = (context, _) =>
            {
                // Use limiter-provided retry time when available (FixedWindow); fall back to 900 s
                // for limiters that don't expose timing metadata (SlidingWindow on .NET 10).
                var retryAfterSeconds = context.Lease.TryGetMetadata(
                    MetadataName.RetryAfter,
                    out var retryAfter
                )
                    ? Math.Max(1, (int)retryAfter.TotalSeconds)
                    // SlidingWindowRateLimiter (.NET 10) doesn't expose RetryAfter metadata;
                    // 900 s = the 15-min PasswordResetRequest window (most restrictive policy).
                    : 900;

                context.HttpContext.Response.Headers["Retry-After"] = retryAfterSeconds.ToString(
                    System.Globalization.NumberFormatInfo.InvariantInfo
                );

                return ValueTask.CompletedTask;
            };

            // ── Baseline for all controller endpoints ─────────────────────────────
            // Applied via app.MapControllers().RequireRateLimiting(ApiDefault) in Program.cs.
            // Authenticated users get apiDefaultPermitLimit req per window (user-ID partition).
            // Anonymous fallback: 1/5 of the authenticated limit per window (IP partition).
            options.AddPolicy(
                RateLimitPolicies.ApiDefault,
                context =>
                {
                    var key = GetPartitionKey(context, "api-default:");
                    var isAuthenticated = key.StartsWith(
                        "api-default:user:",
                        StringComparison.Ordinal
                    );
                    return RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: key,
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = isAuthenticated
                                ? apiDefaultPermitLimit
                                : Math.Max(1, apiDefaultPermitLimit / 5),
                            Window = TimeSpan.FromSeconds(apiDefaultWindowSeconds),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    );
                }
            );

            // ── Anonymous auth endpoints (Microsoft token exchange) ───────────────
            // 20 req per 5 min per IP — prevents token-exchange brute forcing.
            options.AddPolicy(
                RateLimitPolicies.AnonymousAuth,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: $"anon-auth:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(5),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // ── AI generation endpoints ───────────────────────────────────────────
            // 10 req/min per user — each request burns credits and compute.
            options.AddPolicy(
                RateLimitPolicies.AiGeneration,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: GetPartitionKey(context, "ai-gen:"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // ── File upload / Excel import endpoints ──────────────────────────────
            // 20 req/min per user — payloads are heavier than typical API requests.
            options.AddPolicy(
                RateLimitPolicies.UploadOrImport,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: GetPartitionKey(context, "upload:"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 20,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // ── Mobile game-session sync / download flows ─────────────────────────
            // 60 req/min per user — burst-tolerant for offline-flush and reconnect retries.
            options.AddPolicy(
                RateLimitPolicies.GameSync,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: GetPartitionKey(context, "game-sync:"),
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 60,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // ── Sensitive anonymous endpoints (account setup + password reset) ────

            // 5 requests per IP per 15 min — sliding window prevents burst abuse at window boundary
            options.AddPolicy(
                RateLimitPolicies.PasswordResetRequest,
                context =>
                    RateLimitPartition.GetSlidingWindowLimiter(
                        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new SlidingWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(15),
                            SegmentsPerWindow = 5,
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // 10 requests per IP per minute
            options.AddPolicy(
                RateLimitPolicies.SetupValidate,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 10,
                            Window = TimeSpan.FromMinutes(1),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );

            // 5 requests per IP per 5 min
            options.AddPolicy(
                RateLimitPolicies.SetupComplete,
                context =>
                    RateLimitPartition.GetFixedWindowLimiter(
                        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        factory: _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 5,
                            Window = TimeSpan.FromMinutes(5),
                            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                            QueueLimit = 0,
                        }
                    )
            );
        });

        return services;
    }
}
