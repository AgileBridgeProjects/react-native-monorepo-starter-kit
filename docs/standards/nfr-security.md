# Security Implementation Guide

Companion to `docs/standards/non-functional-requirements.md` — Security section.
Follow every pattern here for all new backend and frontend code.

---

## TLS Configuration

### ASP.NET Core (Kestrel)

Enforce TLS 1.3 as the minimum in `Program.cs`:

```csharp
builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureHttpsDefaults(httpsOptions =>
    {
        httpsOptions.SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13;
    });
});
```

Enforce HTTPS for all requests:

```csharp
app.UseHttpsRedirection();
app.UseHsts();  // adds Strict-Transport-Security header
```

### iOS — App Transport Security (ATS)

ATS enforces HTTPS by default on iOS 9+. Do not add `NSAllowsArbitraryLoads: true` exceptions
in `app.json` / `Info.plist` unless a specific third-party domain requires it and is
explicitly whitelisted by domain name.

### Android — Network Security Config

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>
```

Reference it in `AndroidManifest.xml` via `android:networkSecurityConfig`.

---

## Secrets Management

### Azure Key Vault (backend)

Never read secrets from `appsettings.json` in production. Inject via Key Vault:

```csharp
// Program.cs — add Key Vault as a configuration provider
if (!builder.Environment.IsDevelopment())
{
    var keyVaultUri = new Uri($"https://{builder.Configuration["KeyVaultName"]}.vault.azure.net/");
    builder.Configuration.AddAzureKeyVault(keyVaultUri, new DefaultAzureCredential());
}
```

Local development: use `dotnet user-secrets` — never commit `.env` or
`appsettings.Development.json` files that contain real secrets.

### EAS Build — mobile secrets

Store secrets in EAS Secrets (not in `app.json` or `.env` files committed to the repo):

```bash
eas secret:create --scope project --name API_BASE_URL --value https://api.starterkit.app
```

Access in `app.config.js`:

```js
export default {
  extra: {
    apiBaseUrl: process.env.API_BASE_URL,
  },
};
```

### Rules

- `.env` files must be in `.gitignore` — commit only `.env.example` with placeholder values
- No real API keys, tokens, or passwords in any committed file
- CI/CD secrets go in GitHub Actions secrets or EAS Secrets — never in YAML files

---

## Token Storage on Mobile

### Use `expo-secure-store` for all auth tokens

```ts
// src/lib/storage/secure-storage.ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  },
  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
```

### Forbidden patterns

```ts
// VIOLATION: AsyncStorage stores tokens in plaintext on disk
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('accessToken', token); // ← never for tokens

// VIOLATION: MMKV is fast but not Keychain/Keystore-backed
storage.set('accessToken', token); // ← use secureStorage for tokens only
```

`AsyncStorage` and MMKV are acceptable for non-sensitive preferences (theme, last-viewed tab)
but are banned for any auth credential.

---

## Role-Based Access Control (RBAC)

StarterKit uses an **ABP-style permission-based RBAC** system. Permissions are fine-grained action
constants; roles are containers that bundle permissions. This keeps authorization decoupled from
role names and allows adding/removing permissions from roles in the DB without code changes.

### Permission constants — `StarterKit.Auth/Permissions/StarterKitPermissions.cs`

All permission strings are defined as constants grouped by module:

```csharp
public static class StarterKitPermissions
{
    public static class AI
    {
        public static class Games
        {
            public const string Generate = "ai.games.generate";
            public const string View     = "ai.games.view";
        }
        public static class Content
        {
            public const string Generate = "ai.content.generate";
            public const string View     = "ai.content.view";
        }
    }
    public static class Credits
    {
        public const string View   = "credits.view";
        public const string TopUp  = "credits.topup";
        public const string Adjust = "credits.adjust";
    }
    public static class Users
    {
        public const string Manage = "users.manage";
    }
    public static IReadOnlyList<string> All { get; } = [ ... ];
}
```

### Roles and DB mapping — `RolePermissions` table

Permissions are mapped to roles in the `RolePermissions` table (seeded via `RolePermissions.csv`):

| Role | Permissions |
|---|---|
| SuperAdmin | All 8 permissions |
| CompanyAdmin | All except `users.manage` |
| Employee | `*.view` + `*.generate` (no credit admin) |

### Auth flow

1. GoTrue JWT → `SupabaseAuthHandler` validates the token (HS256 against the shared `JWT_SECRET`;
   `iss = ${API_EXTERNAL_URL}/auth/v1`; `aud = authenticated`; `sub` = user UUID) → authenticates the
   principal. See `docs/standards/supabase.md` for the full JWT contract.
2. `RoleClaimsTransformer` runs on every authenticated request:
   - Upserts user record → adds `internal_user_id` claim
   - Loads DB roles → adds `ClaimTypes.Role` claims
   - Loads DB permissions for those roles → adds `"permission"` claims (one per permission)
3. ASP.NET Core Authorization evaluates the requested policy

### Policy registration — `StarterKit.Auth/Extensions/ServiceCollectionExtensions.cs`

Policies are auto-registered — one per permission in `StarterKitPermissions.All`. Each policy requires:

- Authenticated user
- The specific `"permission"` claim
- `CompanyMemberRequirement` — user's `company_id` claim must match the `companyId` route/query/form parameter

```csharp
// Auto-registered, equivalent to:
options.AddPolicy(StarterKitPermissions.AI.Games.Generate, policy => policy
    .RequireAuthenticatedUser()
    .AddRequirements(new PermissionRequirement(StarterKitPermissions.AI.Games.Generate))
    .AddRequirements(new CompanyMemberRequirement()));
```

### Controller pattern

Apply `[Authorize]` at the class level (all actions require auth) and add per-action policies:

```csharp
[ApiController]
[Route("api/ai/games")]
[Authorize]                                                          // ← class-level: all actions require auth
public sealed class AiGamesController : ControllerBase
{
    [HttpGet("{id:guid}")]
    [Authorize(Policy = StarterKitPermissions.AI.Games.View)]           // ← fine-grained permission
    public async Task<ActionResult> GetResultAsync(Guid id, ...) { ... }

    [HttpPost("quiz/generate")]
    [Authorize(Policy = StarterKitPermissions.AI.Games.Generate)]       // ← generate permission
    public async Task<ActionResult> GenerateQuizJobAsync(...) { ... }
}
```

### CompanyMemberRequirement — cross-tenant IDOR protection

Every policy includes `CompanyMemberRequirement`. The handler extracts `companyId` from:

1. Route values: `{companyId:guid}` segments
2. Query string: `?companyId=...`
3. Form fields: `CompanyId` in `multipart/form-data` requests

If no `companyId` is present on the request, the requirement is vacuously satisfied (the endpoint
is not company-scoped). If it is present, the user's `company_id` claim must match — otherwise 403.

### VIOLATION — things that must never appear in this codebase

```csharp
// ❌ Role-based policy strings — bypasses permission system
[Authorize(Roles = "Admin")]

// ❌ Hardcoded permission strings — use constants
[Authorize(Policy = "ai.games.view")]           // use StarterKitPermissions.AI.Games.View

// ❌ Accessing companyId without CompanyMemberRequirement
// All standard policies include it automatically; don't create policies without it

// ❌ No [Authorize] on controller or action — all endpoints must be protected
public async Task<ActionResult> GetDataAsync(...) { ... }    // missing [Authorize]
```

### Supabase GoTrue — authorization data in `app_metadata`

Authorization data (`company_id`, and anything the backend trusts for access decisions) is set
**server-side only**, via the service-role Admin API, into GoTrue `app_metadata` — never
`user_metadata`, which is user-editable and must never be trusted for authorization. This replaces
Firebase custom claims.

```csharp
// ✅ CORRECT — set company_id in app_metadata via the service-role Admin API (server-only)
await supabaseAdmin.UpdateUserByIdAsync(userId, new AdminUserAttributes
{
    AppMetadata = new Dictionary<string, object> { ["company_id"] = companyId.ToString() },
});

// ❌ VIOLATION: writing/trusting authorization data in user_metadata (user-forgeable)
```

The backend validates the GoTrue JWT (HS256, issuer `${API_EXTERNAL_URL}/auth/v1`, audience
`authenticated`, `sub` = user UUID stored in `UserEntity.ExternalAuthId`). Full details:
`docs/standards/supabase.md`.

### Rule: never trust frontend-only gating

A frontend that hides a button is UX, not security. Every sensitive action must be protected
by a backend `[Authorize]` attribute. Frontend permission checks are acceptable for display logic only.

---

## OWASP Top 10 — Patterns

### SQL Injection

```csharp
// VIOLATION: string concatenation — injectable
var query = $"SELECT * FROM Users WHERE Email = '{email}'"; // ← never

// CORRECT: EF Core parameterised (safe by default)
var user = await _context.Users
    .Where(u => u.Email == email)
    .FirstOrDefaultAsync(ct);
```

Never pass user input to `FromSqlRaw`. If raw SQL is required, use `FromSqlInterpolated` or
`ExecuteSqlInterpolatedAsync` (EF Core handles parameterisation for interpolated strings).

### XSS — rendering HTML in Next.js

Next.js JSX auto-escapes all string values — standard JSX rendering is safe.

Rendering raw HTML is permitted only when the content has been explicitly sanitised with
a library such as DOMPurify before being passed to the React raw-HTML prop.
Never pass unsanitised user-generated content to any raw-HTML rendering API.

### SSRF (Server-Side Request Forgery)

Any endpoint that fetches a user-supplied URL must implement the full SSRF guard described in
`docs/standards/backend.md` (scheme validation → DNS resolution → private-range block).

### Insecure Direct Object Reference (IDOR)

Always verify the authenticated user owns or has permission to access the requested resource:

```csharp
// VIOLATION: no ownership check
var game = await _gameRepository.FindByIdAsync(gameId, ct);
return Ok(game); // ← returns any game to any authenticated user

// CORRECT
var game = await _gameRepository.FindByIdAsync(gameId, ct);
if (game is null || game.OwnerId != currentUserId)
    return NotFound();
return Ok(game.ToDto());
```

---

## Security Headers

Add in `Program.cs` via middleware:

```csharp
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "geolocation=(), microphone=()";
    await next();
});
```

`Strict-Transport-Security` (HSTS) is added by `app.UseHsts()` — do not add it manually.

---

## Certificate Pinning (Mobile — Advanced)

Certificate pinning prevents MITM attacks even if a CA is compromised. Implement via a
custom Expo native module or `react-native-ssl-pinning` when the threat model requires it.

This is an advanced control — document the decision in `docs/adr/` before implementing.
