# SignalR Real-Time Standards — The Law

> **Applies to:** `StarterKit.Core`, `StarterKit.MobileApi`, `StarterKit.WebApi`, `apps/expo`, `apps/web`

This document covers the SignalR WebSocket architecture used for real-time push to the Expo
mobile app, how to add new hub events, authentication, and the Expo client hook conventions.

---

## Architecture

```text
StarterKit.Core
  IPushNotificationsService.CreateAndDeliverAsync()
      │
      ▼
  INotificationBroadcaster          ← abstraction lives in Core
      │
      ▼ (resolved by DI — MobileApi registers SignalRNotificationBroadcaster)
StarterKit.MobileApi
  SignalRNotificationBroadcaster
      │
      ▼
  IHubContext<NotificationHub, INotificationHub>
      │
      ▼  WebSocket
  Expo  useSignalR hook → queryClient.invalidateQueries / refetch()
```

**Why the abstraction?** `StarterKit.Core` must not reference `StarterKit.MobileApi` (Clean Architecture
dependency rule). `INotificationBroadcaster` is Core's boundary — the transport (SignalR) is an
implementation detail registered at the composition root.

---

## Key types

| Type | Location | Purpose |
|---|---|---|
| `INotificationBroadcaster` | `Core/PushNotifications/Interfaces/` | Abstraction Core uses to signal connected clients |
| `NoOpNotificationBroadcaster` | `Core/PushNotifications/Services/` | Default registered by `AddStarterKitCore` — silent no-op for WebApi |
| `NotificationHub` | `MobileApi/PushNotifications/` | SignalR hub — `[Authorize]`, server-to-client only |
| `INotificationHub` | `MobileApi/PushNotifications/Interfaces/` | Client-side contract (typed hub) |
| `InternalUserIdProvider` | `MobileApi/PushNotifications/` | Keys hub connections by `internal_user_id` GUID |
| `SignalRNotificationBroadcaster` | `MobileApi/PushNotifications/` | MobileApi implementation — delivers over the hub |
| `useSignalR` | `expo/src/features/notifications/infrastructure/hooks/` | Expo connection manager hook |

---

## Backend conventions

### Hub registration (MobileApi only)

SignalR is registered in `StarterKit.MobileApi/Program.cs`:

```csharp
builder.Services.AddSignalR();
builder.Services.AddSingleton<IUserIdProvider, InternalUserIdProvider>();
builder.Services.AddScoped<INotificationBroadcaster, SignalRNotificationBroadcaster>();

// After app.MapControllers():
app.MapHub<NotificationHub>("/hubs/notifications");
```

**Never register the mobile `NotificationHub` in `StarterKit.WebApi`** — the admin portal uses
`AdminRealtimeHub` for admin-only realtime signals such as logo processing and AI job status.
Each API host registers only the hub(s) it owns.

### User ID mapping — why `InternalUserIdProvider`

SignalR's default `DefaultUserIdProvider` uses `ClaimTypes.NameIdentifier`, which is the Firebase
UID. Our services address users by their internal StarterKit GUID (`internal_user_id` claim).
`InternalUserIdProvider` bridges the two so `IHubContext.Clients.User(userId.ToString())`
resolves correctly:

```csharp
internal sealed class InternalUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
        => connection.User.FindFirstValue(StarterKitClaims.InternalUserId);
}
```

**Always use this provider.** Never call `Clients.User(firebaseUid)` — the value must be the
internal GUID that services pass to `INotificationBroadcaster.BroadcastAsync`.

### JWT auth for WebSocket (query-string token)

WebSocket upgrade requests cannot carry `Authorization` headers. The `@microsoft/signalr` JS
client sends the Firebase token as `?access_token=<token>` on the negotiate/upgrade URL.
`FirebaseAuthHandler` already reads this for `/hubs/*` paths:

```csharp
else if (Request.Path.StartsWithSegments("/hubs"))
{
    var queryToken = Request.Query["access_token"].ToString();
    if (!string.IsNullOrEmpty(queryToken))
        idToken = queryToken;
}
```

**Do not add a second auth scheme for hubs.** The existing Firebase handler already handles
query-string tokens for all `/hubs/*` paths.

### Adding a new hub method

1. Add the method to `INotificationHub` (client-side contract):

   ```csharp
   // MobileApi/PushNotifications/Interfaces/INotificationHub.cs
   Task ReceiveNewEvent(string payload, CancellationToken ct = default);
   ```

2. Add a corresponding method to `INotificationBroadcaster`:

   ```csharp
   // Core/PushNotifications/Interfaces/INotificationBroadcaster.cs
   Task BroadcastNewEventAsync(Guid userId, string payload, CancellationToken ct = default);
   ```

3. Implement in `SignalRNotificationBroadcaster`:

   ```csharp
   public Task BroadcastNewEventAsync(Guid userId, string payload, CancellationToken ct = default)
       => hubContext.Clients.User(userId.ToString()).ReceiveNewEvent(payload, ct);
   ```

4. Add a no-op implementation to `NoOpNotificationBroadcaster`:

   ```csharp
   public Task BroadcastNewEventAsync(Guid userId, string payload, CancellationToken ct = default)
       => Task.CompletedTask;
   ```

5. Register the Expo listener in `useSignalR` and route the refetch in `useNotificationListeners`
   / `ToastTriggers` (see Expo conventions below).

**Do not add client-invokable hub methods.** The hub is server-to-client only. If you need
client-to-server communication, use the REST API.

### Broadcasting from services

Always go through `INotificationBroadcaster` — never inject `IHubContext` directly into Core
services:

```csharp
// VIOLATION: Core directly using MobileApi transport
public class SomeService(IHubContext<NotificationHub, INotificationHub> hub) { }

// CORRECT: Core uses the abstraction
public class SomeService(INotificationBroadcaster broadcaster) { }

// Then broadcast:
await broadcaster.BroadcastAsync(userId, PushNotificationType.NewContent, ct);
```

### Schedule-gated notifications

Game assignment notifications are delivered when a `GameSchedule` becomes active, not when the
assignment is created. This is implemented via a Hangfire delayed job:

```text
GameScheduleService.CreateAsync / UpdateAsync
    └── ScheduleNotificationJob(scheduleId, startDate)
            │  delay = startDate - clock.Now()
            ├── delay <= 0  → backgroundJobClient.Enqueue<IGameScheduleNotificationJob>
            └── delay >  0  → backgroundJobClient.Schedule<IGameScheduleNotificationJob>(delay)

GameScheduleNotificationJob.ExecuteAsync(scheduleId)
    ├── FindByIdAsync → null (schedule deleted)? → return early
    ├── Game null (soft-deleted)? → return early
    ├── GetUserIdsForScheduleAsync → find assigned users
    └── Enqueue<IContentAssignedDispatchJob> → CreateAndDeliverAsync → FCM + SignalR
```

`GameSchedule.NotificationJobId` stores the Hangfire job ID so `UpdateAsync` and `DeleteAsync`
can cancel and reschedule the pending job, preventing double-notifications. If the schedule is
deleted before the job fires, `FindByIdAsync` returns `null` (global soft-delete query filter)
and the job exits cleanly.

**For any new content type that should be schedule-gated**, follow this pattern rather than
firing from the assignment service.

---

## Expo conventions

### `useSignalR` — the only place for hub connection logic

```text
apps/expo/src/features/notifications/infrastructure/hooks/use-signal-r.ts
```

All hub connection lifecycle logic lives here. Never create a second `HubConnectionBuilder`
anywhere else in the app.

```ts
// ✅ CORRECT — use the shared hook
import { useSignalR } from '@features/notifications/infrastructure/hooks/use-signal-r';
useSignalR({ onNotificationReceived, enabled: isAuthenticated });

// ❌ VIOLATION — building a connection elsewhere
import { HubConnectionBuilder } from '@microsoft/signalr';
const conn = new HubConnectionBuilder().withUrl(...).build();
```

### `enabled` guard — never connect unauthenticated

Always pass `enabled: isAuthenticated` (or equivalent auth-state boolean). The hook uses this
flag in its `useEffect` dependency array; the connection is only established when `enabled` is
`true` and is torn down on logout:

```ts
// ✅ CORRECT
useSignalR({ onNotificationReceived, enabled: isAuthenticated });

// ❌ VIOLATION — hook always attempts to connect regardless of auth
useSignalR({ onNotificationReceived });
```

### Token factory — always use the auth store

The `accessTokenFactory` reads the cached Firebase token first, then force-refreshes if absent:

```ts
accessTokenFactory: async () => {
  const cached = authStoreUtils.getIdToken();
  if (cached) return cached;
  const fresh = await firebaseAuth.currentUser?.getIdToken(true);
  return fresh ?? '';
},
```

Never hard-code a token or bypass the auth store.

### AppState handling — built into `useSignalR`

The hook automatically disconnects on `background`/`inactive` and reconnects on `active`.
Do not add duplicate `AppState` listeners in screens or other hooks. The `enabledRef` guard
ensures a connection is not restarted when `enabled` is `false` (e.g. after logout).

### Routing hub events to React Query

`useSignalR` accepts an `onNotificationReceived(notificationType: string)` callback. Mount it
in `ToastTriggers` (`src/lib/toast-triggers.tsx`) — the single place for all global event
listeners. Call `refetch()` directly on query observers mounted in the same component:

```tsx
// ToastTriggers.tsx — correct pattern
const { refetch: refetchGameAssignments } = useGameAssignments();
const { refetch: refetchRewards } = useRewards();

const onNotificationReceived = useCallback((_notificationType: string) => {
  void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
  void refetchGameAssignments();
  void refetchRewards();
  void queryClient.invalidateQueries({ queryKey: ['learn'] });
}, [queryClient, refetchGameAssignments, refetchRewards]);

useSignalR({ onNotificationReceived, enabled: isAuthenticated });
```

**Why `refetch()` over `invalidateQueries` for domain queries?** `invalidateQueries` marks
queries as stale and triggers a background refetch only for observers that React Query considers
"active" at that moment. `refetch()` called on an observer mounted in `ToastTriggers` always
issues the network request regardless of observer state elsewhere in the tree — the same
mechanism as pull-to-refresh.

**Why `invalidateQueries` for notifications?** The notification list uses `refetchOnMount: 'always'`
and has observers mounted in many places; invalidation reliably triggers a refetch there.

### FCM ↔ SignalR — dual delivery

The Expo app receives real-time signals from two sources:

| Source | Handled by | Fires when |
|---|---|---|
| SignalR `ReceiveNotification` | `useSignalR` → `ToastTriggers.onNotificationReceived` | App is **connected to the hub** |
| FCM foreground | `useNotificationListeners` → `addNotificationReceivedListener` | App is **in the foreground** |
| FCM background tap | `useNotificationListeners` → `addNotificationResponseReceivedListener` | User **taps the OS banner** |

Both paths call the same refetch logic. Do not put query refetches in only one path — always
handle both so coverage is complete regardless of hub connectivity.

---

## Testing

### Backend — integration test for hub auth

Test the negotiate endpoint (`POST /hubs/notifications/negotiate?negotiateVersion=1`) rather
than a full WebSocket upgrade (which requires a real Kestrel server, not `WebApplicationFactory`):

```csharp
// ✅ CORRECT — tests the auth pipeline for hub paths
var response = await client.PostAsync("/hubs/notifications/negotiate?negotiateVersion=1", null);
response.StatusCode.Should().Be(HttpStatusCode.OK);

// Unauthenticated
var anonResponse = await anonClient.PostAsync("/hubs/notifications/negotiate?negotiateVersion=1", null);
anonResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
```

See `StarterKit.MobileApi.Tests/PushNotifications/Hubs/NotificationHubTests.cs` as the reference.

### Backend — unit test for broadcaster calls

Mock `INotificationBroadcaster` in service unit tests; verify `BroadcastAsync` is called after
the domain operation:

```csharp
_broadcasterMock
    .Setup(b => b.BroadcastAsync(userId, It.IsAny<PushNotificationType>(), It.IsAny<CancellationToken>()))
    .Returns(Task.CompletedTask);

// ... call the service ...

_broadcasterMock.Verify(b => b.BroadcastAsync(userId, PushNotificationType.NewContent, It.IsAny<CancellationToken>()), Times.Once);
```

**Never assert on `IHubContext` in Core unit tests** — Core knows nothing about SignalR.

### Expo — `useSignalR` tests

Mock `@microsoft/signalr` using `vi.hoisted()` (Vitest hoists `vi.mock` before variable
initialization). The mock must expose `on`, `onreconnecting`, `onreconnected`, `onclose`,
`start`, and `stop` as `vi.fn()` instances:

```ts
const { mockStart, mockStop, mockOn } = vi.hoisted(() => ({
  mockStart: vi.fn().mockResolvedValue(undefined),
  mockStop: vi.fn().mockResolvedValue(undefined),
  mockOn: vi.fn(),
}));

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn().mockReturnValue({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue({ on: mockOn, start: mockStart, stop: mockStop, ... }),
  }),
  HubConnectionState: { Disconnected: 'Disconnected' },
}));
```

See `__tests__/src/features/notifications/infrastructure/hooks/use-signal-r.test.ts` as the
reference.

---

## Violations — never do this

```csharp
// VIOLATION: Core directly imports IHubContext
using Microsoft.AspNetCore.SignalR;
public class GameService(IHubContext<NotificationHub, INotificationHub> hub) { }

// VIOLATION: using Firebase UID as the hub user ID
hubContext.Clients.User(firebaseUid).ReceiveNotification("NewContent", ct);
// ← must be the internal GUID; use broadcaster.BroadcastAsync(internalGuid, ...)

// VIOLATION: mobile NotificationHub registered in WebApi
// StarterKit.WebApi/Program.cs: app.MapHub<NotificationHub>("/hubs/notifications");  ← mobile hub belongs in MobileApi only
// ✅ WebApi registers AdminRealtimeHub at /hubs/admin-realtime for admin portal events
```

```ts
// VIOLATION: creating a SignalR connection outside useSignalR
import { HubConnectionBuilder } from '@microsoft/signalr';
const conn = new HubConnectionBuilder().withUrl('/hubs/notifications').build();

// VIOLATION: connecting without the enabled guard
useSignalR({ onNotificationReceived }); // enabled defaults to true — fires unauthenticated

// VIOLATION: putting refetch logic directly in a screen component
// GamesScreen.tsx:
connection.on('ReceiveNotification', () => refetch()); // hub logic belongs in useSignalR
```
