# Performance Implementation Guide

Companion to `docs/standards/non-functional-requirements.md` — Performance & Scalability section.

---

## Backend — ASP.NET Core / EF Core

### Polly Resilience Pipeline

Every service that calls an external dependency (HTTP, AI provider, third-party API) must
wrap calls in a Polly resilience pipeline. Register in DI:

```csharp
// StarterKit.Core/<Module>/Extensions/ServiceCollectionExtensions.cs
services.AddResiliencePipeline("external-http", builder =>
{
    builder
        .AddRetry(new RetryStrategyOptions
        {
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromMilliseconds(200),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true,          // prevents thundering-herd on retry storms
            ShouldHandle = new PredicateBuilder()
                .Handle<HttpRequestException>()
                .HandleResult<HttpResponseMessage>(r =>
                    r.StatusCode >= HttpStatusCode.InternalServerError ||
                    r.StatusCode == HttpStatusCode.TooManyRequests),
        })
        .AddCircuitBreaker(new CircuitBreakerStrategyOptions
        {
            FailureRatio = 0.5,
            SamplingDuration = TimeSpan.FromSeconds(30),
            MinimumThroughput = 10,
            BreakDuration = TimeSpan.FromSeconds(15),
        })
        .AddTimeout(TimeSpan.FromSeconds(10));
});
```

Consume in a service:

```csharp
public sealed class MyExternalService(ResiliencePipelineProvider<string> pipelines)
{
    private readonly ResiliencePipeline _pipeline =
        pipelines.GetPipeline("external-http");

    public async Task<string> FetchAsync(CancellationToken ct)
    {
        return await _pipeline.ExecuteAsync(
            async token => await _httpClient.GetStringAsync("/endpoint", token),
            ct);
    }
}
```

### Pagination — `PagedResult<T>`

All list endpoints must return paginated results. Use this shared DTO shape in `StarterKit.Core`:

```csharp
// StarterKit.Core/DTOs/PagedResult.cs
public sealed record PagedResult<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
    public bool HasNextPage => Page * PageSize < TotalCount;
}
```

Enforce a maximum page size at the service layer:

```csharp
// CORRECT: cap at 100
private const int MaxPageSize = 100;

public async Task<PagedResult<GameDto>> GetGamesAsync(int page, int pageSize, CancellationToken ct)
{
    pageSize = Math.Clamp(pageSize, 1, MaxPageSize);
    var total = await _gameRepository.CountAsync(ct);
    var items = await _gameRepository.GetPageAsync(page, pageSize, ct);
    return new PagedResult<GameDto>
    {
        Items = items.Select(g => g.ToDto()).ToList(),
        TotalCount = total,
        Page = page,
        PageSize = pageSize,
    };
}
```

### EF Core Performance Rules

```csharp
// VIOLATION: full entity load for a read-only display query
var games = await _context.Games.ToListAsync(ct);

// CORRECT: projection + AsNoTracking for reads
var games = await _context.Games
    .AsNoTracking()
    .Select(g => new GameSummaryDto { Id = g.Id, Title = g.Title, Rating = g.AverageRating })
    .ToListAsync(ct);

// VIOLATION: separate queries for related data (N+1)
foreach (var game in games)
{
    game.Reviews = await _context.Reviews.Where(r => r.GameId == game.Id).ToListAsync();
}

// CORRECT: eager loading in one query
var games = await _context.Games
    .AsNoTracking()
    .Include(g => g.Reviews)
    .ToListAsync(ct);

// CORRECT: split query for large collections (avoids Cartesian explosion)
var games = await _context.Games
    .AsNoTracking()
    .Include(g => g.Reviews)
    .AsSplitQuery()
    .ToListAsync(ct);
```

### Response Compression

Enable in `Program.cs`:

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
    options.Level = CompressionLevel.Fastest);

// ...

app.UseResponseCompression(); // must be before UseStaticFiles / UseRouting
```

### Health Check Endpoints

```csharp
// Program.cs
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>("database")
    .AddUrlGroup(new Uri("https://api.firebase.com"), "firebase-auth", tags: ["external"]);

// ...

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => !check.Tags.Contains("external"),
});
```

---

## Frontend — React Native / Expo

### React Query — Recommended `staleTime` / `gcTime` per Resource Type

| Resource | `staleTime` | `gcTime` | Rationale |
|---|---|---|---|
| Current user profile | 5 minutes | 10 minutes | Changes infrequently |
| Game catalogue / list | 2 minutes | 5 minutes | Moderately dynamic |
| Leaderboard | 30 seconds | 2 minutes | High churn |
| Game session (in-progress) | 0 (always fresh) | 1 minute | Real-time accuracy required |
| Static reference data (categories) | 1 hour | 2 hours | Rarely changes |

Configure in the QueryClient default options:

```ts
// src/lib/http/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 minutes default
      gcTime: 5 * 60 * 1000,      // 5 minutes default
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});
```

Override per-query when needed:

```ts
const { data } = useQuery({
  queryKey: ['leaderboard'],
  queryFn: fetchLeaderboard,
  staleTime: 30_000,   // 30 seconds
  gcTime: 2 * 60_000,  // 2 minutes
});
```

### List Virtualisation — `FlashList`

Use `FlashList` from `@shopify/flash-list` for any list with more than 50 items:

```tsx
// VIOLATION: FlatList for large lists causes dropped frames
<FlatList data={games} renderItem={renderGame} />

// CORRECT: FlashList with estimatedItemSize
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={games}
  renderItem={({ item }) => <GameCard game={item} />}
  estimatedItemSize={88}   // measure your actual item height
  keyExtractor={(item) => item.id}
/>
```

### Image Caching — `expo-image`

```tsx
// VIOLATION: bare Image for remote URLs (no caching)
import { Image } from 'react-native';
<Image source={{ uri: game.thumbnailUrl }} />

// CORRECT: expo-image with disk cache
import { Image } from 'expo-image';
<Image
  source={game.thumbnailUrl}
  contentFit="cover"
  cachePolicy="memory-disk"
  className="w-full h-[200px] rounded-lg"
/>
```

### Bundle Size

- Never barrel-import entire icon libraries: `import * as Icons from '@expo/vector-icons'` loads every icon
- Import specific icons: `import { Ionicons } from '@expo/vector-icons'`
- Use dynamic `import()` for heavy screens that are not on the critical path
- Run `npx expo export --dump-assetmap` to inspect bundle sizes before a release

### 60 fps Animations — Reanimated v4

All animations must run on the UI thread via Reanimated:

```tsx
// VIOLATION: JS-thread animation (causes dropped frames under load)
const [opacity, setOpacity] = useState(1);
Animated.timing(opacity, { toValue: 0, duration: 300 }).start();

// VIOLATION: setNativeProps (deprecated, bypasses Reanimated)
viewRef.current?.setNativeProps({ opacity: 0 });

// CORRECT: Reanimated v4 UI-thread animation
import { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

const opacity = useSharedValue(1);
const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

const fadeOut = () => {
  opacity.value = withTiming(0, { duration: 300 });
};

return <Animated.View style={animatedStyle}>...</Animated.View>;
```

Use `withSpring`, `withTiming`, `withSequence`, and `withDelay` from Reanimated.
Never call `setState` from inside a worklet — use `runOnJS` to bridge back to the JS thread.

---

## Axios — Response Compression on the Client

Axios sends `Accept-Encoding: gzip, br` by default in Node.js environments. In React Native,
confirm the header is set:

```ts
// src/lib/http/api-client.ts
const apiClient = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Accept-Encoding': 'gzip, br',
    'Content-Type': 'application/json',
  },
});
```
