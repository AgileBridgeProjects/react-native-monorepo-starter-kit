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

Some notifications should fire when a thing becomes *active*, not when it is created. Do
that with a Hangfire delayed job rather than firing from the create path:

```text
<Entity>Service.CreateAsync / UpdateAsync
    └── ScheduleNotificationJob(entityId, startsAt)
            │  delay = startsAt - clock.Now()
            ├── delay <= 0  → backgroundJobClient.Enqueue<I<Entity>NotificationJob>
            └── delay >  0  → backgroundJobClient.Schedule<I<Entity>NotificationJob>(delay)

<Entity>NotificationJob.ExecuteAsync(entityId)
    ├── FindByIdAsync → null (deleted since)? → return early
    ├── resolve the recipients
    └── Enqueue dispatch → CreateAndDeliverAsync → push + SignalR
```

Store the Hangfire job id on the entity (`NotificationJobId`) so `UpdateAsync` and
`DeleteAsync` can cancel and reschedule the pending job — without that you get
double-notifications on every edit. If the entity is deleted before the job fires,
`FindByIdAsync` returns `null` through the global soft-delete query filter and the job exits
cleanly, so the job needs no delete-awareness of its own.

**For any new content type that should be schedule-gated**, follow this pattern rather than
firing from the assignment service.

---

## Expo conventions

> **Not wired in this kit.** The backend hub, the broadcasters and the web client are real
> and covered below. The Expo client is not: `apps/expo` carries the `@microsoft/signalr`
> dependency and nothing else. The conventions in this section are the shape to build to
> when you add it, not a description of code you can go and read.

### `useSignalR` — the only place for hub connection logic

Put the hub connection lifecycle in exactly one hook, under the feature that owns realtime
for your app:

```text
apps/expo/src/features/<your-feature>/infrastructure/hooks/use-signal-r.ts
```

All hub connection lifecycle logic lives there. Never create a second `HubConnectionBuilder`
anywhere else in the app.

### The rules that matter when you wire it

- **One connection per app**, owned by that hook and torn down on sign-out. A second
  connection double-delivers every message.
- **Reconnect with backoff**, and treat a reconnect as a cache-invalidation event: messages
  sent while disconnected are gone, so refetch rather than assume continuity.
- **The hub is a signal, not a transport for state.** Handlers should invalidate a query,
  not write payloads into the store. Otherwise the socket becomes a second source of truth
  that disagrees with the API.
- **Always pair a live path with a polled or on-focus fallback**, so a spec (and a user) on
  a dead socket still converges.

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
