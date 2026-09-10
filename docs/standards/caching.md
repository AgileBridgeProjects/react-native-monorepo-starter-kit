# Caching — The Law

This file governs all caching decisions in StarterKit. It covers the backend
(`IDistributedCache`) and the frontend (datasource-level TTL cache). Follow
these rules whenever you add, modify, or review cached data.

---

## Backend — `IDistributedCache` (ASP.NET Core)

### Why `IDistributedCache` and not `IMemoryCache`

`IDistributedCache` is registered with `AddDistributedMemoryCache()` (in-memory, no network)
for single-instance deployments. When scaling to multiple instances, swap **one DI registration**:

```csharp
// Current (single instance — appsettings wired, no code change needed):
services.AddDistributedMemoryCache();

// Future (multi-instance / Redis — one line swap):
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = configuration.GetConnectionString("Redis");
});
```

No callers change. `ICacheService` is the abstraction; `DistributedCacheService` is the only
implementation. Every feature that needs caching injects `ICacheService`.

> **Multi-instance checklist:** When switching to Redis, you must **also** add the
> SignalR Redis backplane in the same PR — SignalR messages sent from one instance will
> not reach clients connected to another without it:
>
> ```csharp
> builder.Services.AddSignalR().AddStackExchangeRedis(connectionString);
> ```
>
> These are two separate Redis configurations on the same Redis instance.

### `ICacheService` — the only caching API

`StarterKit.Core.Caching.Interfaces.ICacheService` exposes three methods:

```csharp
// Get from cache or call factory and store result.
Task<T?> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken ct = default) where T : class;

// Explicitly set (or overwrite) a cache entry — e.g. for eviction tokens.
Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) where T : class;

// Remove a single entry.
Task RemoveAsync(string key, CancellationToken ct = default);
```

**Never** inject `IDistributedCache`, `IMemoryCache`, or any concrete cache type directly
in a service — always inject `ICacheService`.

### Cache Keys — `CacheKeys` (no magic strings)

All cache keys are defined as static methods in `StarterKit.Core.Caching.CacheKeys`.
Every key method is the **single source of truth** for that key's shape.

```csharp
// ✅ CORRECT
var key = CacheKeys.<Feature>RowsKey(evictionToken, metric, period);
cache.GetOrCreateAsync(key, ...);

// ❌ VIOLATION: magic string
cache.GetOrCreateAsync($"ranked-rows:{metric}:{period}", ...);
```

When adding a new cached resource:

1. Add a new `static string <Name>Key(...)` method to `CacheKeys`.
2. Include all tenant-scope parameters (at minimum `companyId`).
3. Include all parameters that affect the result (metric, period, category, etc.).

### Tenant safety — hard law

**Every cache key for tenant-scoped data must start with `companyId` (and `departmentId`
where applicable).** Failure to include tenant segments is a security violation — it can
serve one company's data to another.

```csharp
// ✅ CORRECT — tenant segments in key
CacheKeys.<Feature>RowsKey(evictionToken, metric, period)
// key shape: ranked-rows:rows:{evictionToken}:{metric}:{period}
// (evictionToken is scoped to companyId:departmentId — see below)

// ❌ VIOLATION — no tenant segment
$"ranked-rows:{metric}"   // cross-tenant data leak
```

### Eviction tokens — department-scoped cache busting

For data that changes when a domain event fires, rather than merely going stale on a
clock, use the **eviction-token pattern**:

1. Store a GUID token per tenant scope at a well-known key:
   `CacheKeys.<Feature>TokenKey(clubId, scopeId)`
2. Include the token in every data key for that scope.
3. On the invalidating event: write a **new** GUID at the token key via `ICacheService.SetAsync`.
   Old data keys become unreachable; they expire naturally by their own TTL.

```csharp
// In <Feature>CacheEvictionHandler (INotificationHandler<YourDomainEvent>):
var tokenKey = CacheKeys.<Feature>TokenKey(companyId, departmentId);
await cache.SetAsync(tokenKey, Guid.NewGuid().ToString("N"), CacheProfiles.<Feature>Token, ct);
```

This pattern works identically with in-memory storage and Redis.

### TTL configuration — `CacheOptions` and `CacheProfiles`

TTL values live in `appsettings.json` under the `"Cache"` section and are bound to
`StarterKit.Core.Caching.Options.CacheOptions` via the Options pattern.
`CacheProfiles` contains the fallback defaults (used in tests and edge cases).

```json
"Cache": {
  "UserPreferencesTtlSeconds": 300
}
```

```csharp
// ✅ CORRECT — read TTL from injected options
private TimeSpan UserPreferencesTtl => _cacheOptions.Value.UserPreferencesTtl;

// ❌ VIOLATION — hardcoded TTL
cache.GetOrCreateAsync(key, factory, TimeSpan.FromSeconds(60));
```

| Profile | Default TTL | When to use |
|---|---|---|
| `UserPreferencesTtlSeconds` | 300 s | The example profile shipped in `CacheOptions` |
| `CacheProfiles.<Feature>Token` | 1 h | Per-scope eviction token, when you add one |

### Extending caching to new features

When caching a new resource:

1. Add a `static string <Resource>Key(...)` method to `CacheKeys`.
2. Add a TTL property to `CacheOptions` + both `appsettings.json` files.
3. Add the TTL constant to `CacheProfiles` as a fallback.
4. If data changes on domain events — create an `INotificationHandler<TEvent>` that writes a new eviction token (ranked-rows pattern).
   If changes are infrequent admin operations — TTL-only eviction is sufficient (question pool pattern).
5. Inject `ICacheService` into the service; never put caching in controllers.
6. Add unit tests: cache-hit (factory not called), cache-miss (factory called), eviction.

### Why TTL values appear in multiple places

| Location | Role |
|---|---|
| `CacheProfiles.cs` | Compile-time constants — fallbacks for tests and non-DI contexts |
| `CacheOptions.cs` | Runtime-configurable via Options pattern — what production services read |
| `appsettings.json` (MobileApi + WebApi) | Deployed values — single source of truth for production |
| A frontend `*_CACHE_TTL_MS` | Frontend TTL — must be manually kept in sync with its backend counterpart; document the coupling in the datasource file |

This is intentional Options-pattern design, not a DRY violation.

### Testing caching infrastructure

Use the real `MemoryDistributedCache` in unit tests — no mocking of `IDistributedCache`.
For services that use `ICacheService`, inject the `PassThroughCacheService` stub
(calls the factory directly, stores nothing) so existing tests remain independent of cache behaviour:

```csharp
private sealed class PassThroughCacheService : ICacheService
{
    public Task<T?> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> factory, TimeSpan ttl, CancellationToken ct = default)
        where T : class => factory(ct)!;
    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) where T : class => Task.CompletedTask;
    public Task RemoveAsync(string key, CancellationToken ct = default) => Task.CompletedTask;
}
```

---

## Frontend — Datasource-level TTL cache (Expo)

### Why datasource-level, not React Query `staleTime`

A cached datasource hook uses a custom
`useState + useEffect` state machine with bidirectional pagination. Migrating them to
`useInfiniteQuery` would be a non-trivial refactor. The datasource-level TTL cache
achieves the same goal (no re-fetch on navigation within the TTL window) without
changing the hook interfaces.

For **new** data-fetching hooks that use `useQuery`, always set an explicit `staleTime`
via `queryCacheConfig` from `@lib/http/query-config`:

```ts
// ✅ CORRECT — new hook using React Query
useQuery({
  queryKey: ['ranked-rows', params],
  queryFn: () => rankedRowsDatasource.getRows(params),
  ...queryCacheConfig.leaderboard,   // staleTime: 30s, gcTime: 2min
});
```

### Datasource cache rules

- The cache is a module-level `Map<string, { data; expiresAt }>` — shared across all hook instances.
- Cache keys include all parameters that affect the result (type, metric, page, pageSize, anchorToCurrentUser, gameCategoryId).
- TTL is `60_000 ms` (60 s), matching its backend counterpart.
- **Pull-to-refresh** must pass `{ bypass: true }` to the datasource call, which clears the
  **entire** module-level cache and forces a fresh fetch. Clearing all entries (not just the
  current key) ensures that `loadMore` pages also get fresh data after a refresh, and that
  switching metric/period after a refresh is consistent.

```ts
// ✅ CORRECT — pull-to-refresh bypasses cache
const refresh = useCallback(() => initialize(true), [initialize]);

// In initialize:
const result = await dataSource.getRows(params, { bypass });

// In datasource (withCache helper):
if (options?.bypass) {
  rowsCache.clear();  // clears ALL cached ranked-rows pages — not just current key
}
```

- `loadMore` and `loadEarlier` calls do **not** bypass the cache — they load different pages
  which have their own cache entries keyed by page number.

### queryCacheConfig presets

All React Query hooks must use a named preset from `@lib/http/query-config`. Never inline
raw millisecond values.

| Preset | `staleTime` | `gcTime` | Use for |
|---|---|---|---|
| `profile` | 5 min | 10 min | Current user profile |
| `list` | 2 min | 5 min | Generic paginated lists |
| `leaderboard` | 30 s | 2 min | RankedRows / leaderboard (high churn) |
| `session` | 0 | 1 min | In-progress game session |
| `static` | 1 h | 2 h | Reference data (categories, roles) |

Add a new preset to `apps/expo/src/lib/http/query-config.ts` when none of the above fits.

---

## Violations — never do this

```csharp
// ❌ Inject IMemoryCache or IDistributedCache directly
public class MyService(IMemoryCache memoryCache) { }

// ❌ Magic string keys
cache.GetOrCreateAsync($"ranked-rows:{metric}", ...);

// ❌ Cache key without tenant scope
CacheKeys.<Feature>RowsKey(token, metric, period)  // if token is not scoped to company+dept

// ❌ Hardcoded TTL in service code
cache.GetOrCreateAsync(key, factory, TimeSpan.FromSeconds(60));

// ❌ Caching in a controller
public async Task<IActionResult> Get() {
  return Ok(await _cache.GetOrCreateAsync("key", ...)); // ← belongs in the service
}
```

```ts
// ❌ Inline raw staleTime
useQuery({ ..., staleTime: 30000 });

// ❌ No bypass on pull-to-refresh
const refresh = () => initialize();  // must pass bypass: true
```
