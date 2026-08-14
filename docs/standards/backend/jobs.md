# Backend Jobs (Hangfire) — The Law

Load this file when: adding a new background job type, modifying an existing processor, or reviewing Hangfire registration. For service-layer transaction rules see the `IDbExecutionStrategy` section below.

---

## Hangfire — Background Job Processing

Hangfire executes AI jobs off the HTTP request thread.

### Architecture

```text
HTTP request → AiJobService.QueueJobAsync()
                  │  persists AiJob row (Status = Queued)
                  │  IBackgroundJobClient.Enqueue<AiJobProcessor>(p => p.ProcessAsync(jobId, ...))
                  ▼
            Hangfire queue
                  │
                  ▼
            AiJobProcessor.ProcessAsync()   ← resolved from DI scope per execution
                  │  transitions: Queued → Running → Completed / Failed
                  ▼
            IAiJobHandlerFactory → IAiJobHandler → IAiProvider
```

### Processor Conventions

- The processor class lives in `StarterKit.Core/<Module>/Services/` and is registered as **`Scoped`** — Hangfire resolves a fresh DI scope per job execution
- The entry-point method signature must accept `IJobCancellationToken` (not `CancellationToken`) — Hangfire passes its own token that signals graceful shutdown
- Convert to a plain `CancellationToken` via `.ShutdownToken` immediately inside the method
- Always mark the entry-point with `[AutomaticRetry(Attempts = 0)]` — retries must not re-run a job that has already transitioned to `Failed`
- Always transition the job to `Running` at the very start of processing
- Wrap `Complete` + any side-effect writes (e.g. ledger debit) in a `TransactionScope` so they succeed or roll back atomically
- Use `TransactionScopeAsyncFlowOption.Enabled` — without it, `await` inside a `TransactionScope` abandons the ambient transaction
- Terminal DB writes (`Completed` or `Failed`) use `default` for the cancellation token so a server shutdown cannot abort the final status record
- Guard the failure write with `result.Status != AiJobStatus.Failed` — if `Complete()` ran in-memory but the `TransactionScope` rolled back, the DB record is still `Running`
- Wrap the failure write in its own inner `try/catch` — if recording the failure itself throws, log it but allow the original exception to propagate

```csharp
// VIOLATION: using CancellationToken instead of IJobCancellationToken
public async Task ProcessAsync(Guid jobId, CancellationToken cancellationToken) { ... }

// VIOLATION: missing [AutomaticRetry(Attempts = 0)]
public async Task ProcessAsync(Guid jobId, IJobCancellationToken cancellationToken) { ... }

// VIOLATION: using the request CancellationToken for terminal DB writes
job.Complete(response.Content, costDto.Credits, _clock);
await _jobRepository.UpdateAsync(job, cancellationToken); // ← use default here

// CORRECT
[AutomaticRetry(Attempts = 0)]
public async Task ProcessAsync(Guid resultId, IJobCancellationToken cancellationToken)
{
    var ct = cancellationToken.ShutdownToken;
    AiJobResult? result = null;

    try
    {
        result = await _resultRepository.GetAsync(resultId, ct);
        result.Start(_clock);
        await _resultRepository.UpdateAsync(result, ct);

        var configModel = await _configModelRepository.GetWithNavigationPropertiesAsync(
            result.AiConfigModelId, ct);
        var handler = _handlerFactory.Resolve(result.JobType);
        var provider = _providerFactory.Create(configModel.AiConfiguration);

        var request = await handler.BuildRequestAsync(result, ct);
        var response = await provider.CompleteAsync(request, ct);
        var costDto = await _creditService.GetCostAsync(result.JobType, result.AiConfigModelId, default);

        using (var tx = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
        {
            result.Complete(response.Content, costDto.Credits, _clock);
            await _resultRepository.UpdateAsync(result, default);
            await _ledgerService.DebitAsync(result.CompanyId, result.Id, costDto.Credits, default);
            tx.Complete();
        }
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to process AI job {ResultId}.", resultId);

        if (result is not null && result.Status != AiJobStatus.Failed)
        {
            try
            {
                result.Fail(ex.Message, _clock);
                await _resultRepository.UpdateAsync(result, default);
            }
            catch (Exception failEx)
            {
                _logger.LogError(failEx, "Failed to record failure state for AI job {ResultId}.", resultId);
            }
        }

        throw;
    }
}
```

### Enqueueing Jobs

- Always enqueue via `IBackgroundJobClient.Enqueue<TProcessor>` — never `BackgroundJob.Enqueue` (static, untestable)
- The enqueue call must happen **after** the job row is persisted — never before
- Pass `JobCancellationToken.Null` as the `IJobCancellationToken` argument in the lambda

```csharp
// VIOLATION: static API
BackgroundJob.Enqueue<AiJobProcessor>(p => p.ProcessAsync(job.Id, JobCancellationToken.Null));

// VIOLATION: enqueueing before the row is saved
_backgroundJobClient.Enqueue<AiJobProcessor>(p => p.ProcessAsync(job.Id, JobCancellationToken.Null));
await _jobRepository.AddAsync(job, cancellationToken); // ← too late

// CORRECT
await _jobRepository.AddAsync(job, cancellationToken);
_backgroundJobClient.Enqueue<AiJobProcessor>(p =>
    p.ProcessAsync(job.Id, JobCancellationToken.Null));
```

### Storage and Dashboard

- PostgreSQL storage (`Hangfire.PostgreSQL` via `UsePostgreSqlStorage`) is used in production; InMemory is the fallback when the connection string is missing or the placeholder `"#"` value is detected
- `AddHangfireServer()` is always registered regardless of storage backend
- The Hangfire dashboard (`/hangfire`) and OpenAPI UIs are only mapped inside `if (app.Environment.IsDevelopment())` — never expose them in production

```csharp
// VIOLATION: dashboard exposed unconditionally
app.UseHangfireDashboard("/hangfire");

// CORRECT
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
    app.UseHangfireDashboard("/hangfire");
}
```

### Adding a New Background Job Type

1. Create the processor class in `StarterKit.Core/<Module>/Services/` with `[AutomaticRetry(Attempts = 0)]` and `IJobCancellationToken`
2. Register it as `Scoped` in the module's `ServiceCollectionExtensions`
3. Add a service method (e.g. `Queue{JobType}JobAsync`) to the service interface + implementation that persists the entity then enqueues via `IBackgroundJobClient`
4. The controller calls the service method — it must never call `IBackgroundJobClient` directly

---

## `IDbExecutionStrategy` — When to Use It

`IDbExecutionStrategy` wraps EF Core's `CreateExecutionStrategy` + an explicit `BeginTransactionAsync` so that the operation **and** the `COMMIT` are retried atomically on transient PostgreSQL failures.

### Use it when ALL of the following are true

1. **Multiple writes must succeed or fail together**
2. **At least one write is not idempotent**

### Do NOT use it when

- There is only a single `SaveChangesAsync` call (EF Core's built-in retry strategy already covers that)
- The operation is purely a read

### NEVER use `System.Transactions.TransactionScope` in EF Core services

`NpgsqlRetryingExecutionStrategy` **does not support user-initiated `TransactionScope`**. Using it will throw `InvalidOperationException` at runtime:

> The configured execution strategy 'NpgsqlRetryingExecutionStrategy' does not support user-initiated transactions.

**Exception:** Hangfire processors are NOT running inside the EF Core retry strategy scope, so `TransactionScope` IS correct inside processor `ProcessAsync` methods (see Processor Conventions above). This exception applies only to `TransactionScope` in service methods called from the HTTP pipeline.

```csharp
// VIOLATION: TransactionScope in a service method called from HTTP pipeline
using (var tx = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
{
    await _gameRepository.AddAsync(game, cancellationToken);
    await _gameCategoryRepository.AddManyAsync(categories, cancellationToken);
    tx.Complete();
}
// ← throws InvalidOperationException at runtime; use IDbExecutionStrategy instead

// CORRECT: two writes that must be atomic and retry-safe (service layer)
await _executionStrategy.ExecuteInTransactionAsync(async () =>
{
    await _gameRepository.AddAsync(game, cancellationToken);
    await _gameCategoryRepository.AddManyAsync(categories, cancellationToken);
});

// VIOLATION: single SaveChangesAsync — wrap is unnecessary overhead
await _executionStrategy.ExecuteInTransactionAsync(async () =>
{
    await _batchRepository.UpdateAsync(batch, ct);   // only one write
});
```

### Mocking `IDbExecutionStrategy` in Unit Tests

```csharp
_executionStrategyMock
    .Setup(x => x.ExecuteInTransactionAsync(It.IsAny<Func<Task>>()))
    .Returns<Func<Task>>(fn => fn());
```
