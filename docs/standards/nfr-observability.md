# Observability Implementation Guide

Companion to `docs/standards/non-functional-requirements.md` — Monitoring & Logging section.

---

## Backend — Serilog + Application Insights

### Setup

Install packages in API projects:

```bash
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.ApplicationInsights
dotnet add package Serilog.Enrichers.Environment
dotnet add package Serilog.Enrichers.Thread
dotnet add package Serilog.Enrichers.CorrelationId
```

Configure in `Program.cs`:

```csharp
builder.Host.UseSerilog((ctx, services, config) =>
{
    config
        .ReadFrom.Configuration(ctx.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithCorrelationId()
        .Enrich.WithEnvironmentName()
        .Enrich.WithThreadId()
        // PII redaction — add your destructuring policies here
        .Destructure.ByTransforming<UserDto>(u => new
        {
            u.Id,
            Email = "[Redacted]",
            Name  = "[Redacted]",
        })
        .WriteTo.Console(new JsonFormatter())
        .WriteTo.ApplicationInsights(
            services.GetRequiredService<TelemetryConfiguration>(),
            TelemetryConverter.Traces);
});
```

Add minimum log levels in `appsettings.json`:

```json
"Serilog": {
  "MinimumLevel": {
    "Default": "Information",
    "Override": {
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore.Database.Command": "Warning",
      "Hangfire": "Warning"
    }
  }
}
```

### Log Level Guide

| Level | When to use | Example |
|---|---|---|
| `Verbose` | Diagnostic detail (dev only) | Every EF Core SQL query |
| `Debug` | Developer diagnostics (dev only) | Entering a method |
| `Information` | Normal application flow | "Quiz job {JobId} enqueued" |
| `Warning` | Recoverable / unexpected state | "Retry {Attempt} for job {JobId}" |
| `Error` | Exception caught; operation failed | "Failed to process job {JobId}" |
| `Fatal` | Application cannot start | "Database connection failed on startup" |

### PII Redaction Rules

```csharp
// VIOLATION: PII in structured log
_logger.LogInformation("User {Email} signed in from {IpAddress}.", user.Email, ipAddress);

// VIOLATION: object with PII destructured directly
_logger.LogInformation("Request from {@User}.", user); // logs all user properties

// CORRECT: use safe identifiers only
_logger.LogInformation("User {UserId} signed in.", user.Id);

// CORRECT: when context is needed, redact explicitly
_logger.LogWarning("Authentication failed for account {UserId} from {HashedIp}.",
    user.Id, HashIpAddress(ipAddress));
```

Add a global `IDontDestructurePolicy` in the Serilog config to block entire classes
from appearing in logs when they contain PII:

```csharp
.Destructure.ByTransforming<CreateUserDto>(_ => "[CreateUserDto — redacted]")
```

### Correlation IDs

Every request must carry a `X-Correlation-ID` header (generated if not present):

```csharp
// Program.cs
builder.Services.AddDefaultCorrelationId();
app.UseCorrelationId();
```

Include the correlation ID in all log events automatically via the
`Serilog.Enrichers.CorrelationId` enricher configured above.

Return the correlation ID in every response for client-side debugging:

```csharp
app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["X-Correlation-ID"] =
            context.TraceIdentifier;
        return Task.CompletedTask;
    });
    await next();
});
```

### Health Check Endpoints

Every API project must expose:

| Endpoint | Purpose | Includes external deps? |
|---|---|---|
| `/health` | Liveness — is the process running? | No |
| `/health/ready` | Readiness — can it serve traffic? | Yes (DB, dependencies) |

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database", tags: ["ready"])
    .AddUrlGroup(new Uri("https://fcm.googleapis.com"), "firebase", tags: ["ready", "external"]);

app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false, // liveness: no checks, just 200 if process is alive
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
});
```

---

## Frontend — Firebase Crashlytics (Expo)

### Setup

```bash
npx expo install @react-native-firebase/crashlytics
```

Add the plugin to `app.json`:

```json
"plugins": [
  "@react-native-firebase/app",
  "@react-native-firebase/crashlytics"
]
```

### CrashReporter abstraction (swap path to Sentry)

All crash reporting goes through the `CrashReporter` interface at `src/lib/crash-reporting/`.
Never import `@react-native-firebase/crashlytics` directly outside that module.

```text
src/lib/crash-reporting/
  types.ts      ← CrashReporter interface — the only import callsites use
  firebase.ts   ← @react-native-firebase/crashlytics impl
  noop.ts       ← silent no-op (active in __DEV__ and tests)
  index.ts      ← exports crashReporter singleton
```

Swapping to Sentry: write `sentry.ts` implementing `CrashReporter`, change the `index.ts` selection. Zero callsite changes.

```ts
// src/lib/crash-reporting/types.ts
export interface CrashReporter {
  recordError(error: Error, context?: Record<string, string>): void;
  log(message: string): void;
  setUserId(id: string | null): void;
  setAttribute(key: string, value: string): void;
}
```

```ts
// src/lib/crash-reporting/index.ts
import { firebaseReporter } from './firebase';
import { noopReporter } from './noop';
import type { CrashReporter } from './types';

export type { CrashReporter };
export { firebaseReporter };

export const crashReporter: CrashReporter = __DEV__ ? noopReporter : firebaseReporter;
```

### Auto-capture vs manual recordError

Once the package is installed and built, **unhandled JS exceptions and native crashes are captured automatically** — no per-callsite code needed.

Manual `crashReporter.recordError()` is only needed for *handled* errors:

| Callsite | File |
|---|---|
| React ErrorBoundary `onError` | `app/_layout.tsx` |
| React Query global `onError` (via `QueryCache`/`MutationCache`) | `src/lib/http/query-client.ts` |
| Auth errors | `src/lib/auth-error-logger.ts` |

### Collection init

`firebase.ts` calls `setCrashlyticsCollectionEnabled(!__DEV__)` at module load — never call this elsewhere.

### User identity

```ts
// On successful auth — opaque internal ID only, never email or display name
crashReporter.setUserId(user.id);

// On logout / session expiry
crashReporter.setUserId(null);
```

### Navigation breadcrumbs

```tsx
// In root layout — renders null, logs pathname on every route change
function NavigationBreadcrumb() {
  const pathname = usePathname();
  useEffect(() => {
    crashReporter.log(`nav: ${pathname}`);
  }, [pathname]);
  return null;
}
```

### PII rules

- Never pass email, display name, phone number, or any identifier linkable to a real person
- Only opaque internal UUIDs in `setUserId`
- `context` keys in `recordError` describe the feature/layer, not user data
- Never call `setAttribute` with raw request bodies or response payloads

---

## Frontend — Sentry

### Setup in Expo

```bash
npx expo install @sentry/react-native
```

Initialise in `app/_layout.tsx` (root layout):

```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV,
  tracesSampleRate: process.env.EXPO_PUBLIC_ENV === 'production' ? 0.1 : 1.0,
  // Never enable sendDefaultPii — Sentry would include device identifiers
  sendDefaultPii: false,
});
```

### Capturing errors

```ts
// In React Query onError callbacks
const { data } = useQuery({
  queryKey: ['games'],
  queryFn: fetchGames,
  onError: (error) => {
    Sentry.captureException(error, {
      tags: { feature: 'games', operation: 'fetch' },
      // DO NOT include user PII in extra context
    });
  },
});

// In catch blocks (only for unexpected errors — let React Query handle API errors)
try {
  await someNonQueryOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error; // always re-throw
}
```

### Breadcrumbs for navigation (without PII)

```ts
// src/lib/observability/breadcrumbs.ts
import * as Sentry from '@sentry/react-native';

export function addNavigationBreadcrumb(routeName: string) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${routeName}`,
    level: 'info',
  });
}
```

Call `addNavigationBreadcrumb` from the root layout's `onNavigationStateChange`.

### Performance Tracing for Critical Flows

```ts
import * as Sentry from '@sentry/react-native';

export async function tracedLogin(credentials: LoginCredentials) {
  const transaction = Sentry.startTransaction({
    name: 'user.login',
    op: 'auth',
  });
  Sentry.getCurrentHub().configureScope(scope =>
    scope.setSpan(transaction));

  try {
    const result = await loginMutation(credentials);
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    Sentry.captureException(error);
    throw error;
  } finally {
    transaction.finish();
  }
}
```

---

## Required Dashboard Panels

Every API service must have a monitoring dashboard with these panels:

| Panel | Metric | Warning threshold | Critical threshold |
|---|---|---|---|
| Request error rate | `requests.failed / requests.total` | > 1% | > 5% |
| p95 response time | 95th-percentile request duration | > 1 s | > 2 s |
| Background job failure rate | Hangfire `Failed` jobs / total | > 5% | > 20% |
| Active users (1h) | Unique authenticated requests | — (informational) | — |
| DB connection pool | Current connections / pool max | > 70% | > 90% |

### Alert routing

- Warning → team Slack channel `#starterkit-alerts`
- Critical → PagerDuty on-call rotation

Configure alerts in Azure Monitor or Application Insights Smart Detection.

---

## Structuring Logs for Queryability

Use consistent property names across all services so logs can be filtered in Application Insights:

| Property | Type | Description |
|---|---|---|
| `UserId` | `Guid` | Internal user identifier (safe) |
| `JobId` | `Guid` | Hangfire / AI job identifier |
| `Feature` | `string` | Domain feature name (`"auth"`, `"games"`, `"ai"`) |
| `Operation` | `string` | Operation name (`"Login"`, `"GenerateQuiz"`) |
| `DurationMs` | `long` | Operation duration in milliseconds |
| `CorrelationId` | `string` | Request correlation ID |

Example:

```csharp
using (LogContext.PushProperty("Feature", "ai"))
using (LogContext.PushProperty("JobId", jobId))
{
    _logger.LogInformation("AI job {JobId} started. Operation: {Operation}.", jobId, "GenerateQuiz");
}
```
