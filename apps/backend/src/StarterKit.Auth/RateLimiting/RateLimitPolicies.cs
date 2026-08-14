namespace StarterKit.Auth.RateLimiting;

public static class RateLimitPolicies
{
    // ── Sensitive anonymous endpoints (account setup + password reset) ────────
    public const string PasswordResetRequest = "setup-password-reset-request";
    public const string SetupValidate = "setup-validate";
    public const string SetupComplete = "setup-complete";

    // ── Baseline applied to all controller endpoints via convention ───────────
    // 300 req/min per user (or 60/min per IP for anonymous fallback).
    // Configurable via RateLimiting:ApiDefault:PermitLimit for testing.
    public const string ApiDefault = "api-default";

    // ── Anonymous auth endpoints (Microsoft token exchange) ──────────────────
    // 20 req per 5 min per IP — prevents token-exchange brute forcing.
    public const string AnonymousAuth = "anonymous-auth";

    // ── AI generation endpoints ───────────────────────────────────────────────
    // 10 req/min per user — each request burns credits and compute.
    public const string AiGeneration = "ai-generation";

    // ── File upload / Excel import endpoints ─────────────────────────────────
    // 20 req/min per user — payloads are heavier than typical API requests.
    public const string UploadOrImport = "upload-or-import";

    // ── Mobile game-session sync / download flows ─────────────────────────────
    // 60 req/min per user — burst-tolerant for offline-flush and reconnect retries.
    public const string GameSync = "game-sync";
}
