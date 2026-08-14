# AI Engine — Architecture & Folder Structure

The AI Engine is the brain of the StarterKit Content Studio. It is responsible for receiving AI job
requests, routing them to the correct handler, calling the correct AI provider, and returning
structured results. It lives entirely inside `StarterKit.Core` and is consumed by both
`StarterKit.WebApi` and `StarterKit.MobileApi`.

---

## Folder Structure

```text
src/
├── StarterKit.Core/
│   └── AI/
│       ├── Entities/               Domain models — map 1:1 to DB tables
│       ├── Enums/                  Shared enumerations
│       ├── Repositories/           Interfaces only — no EF Core here
│       ├── Providers/              AI provider abstraction + implementations
│       ├── Factories/              Factory pattern — resolves provider and handler at runtime
│       ├── Handlers/               One handler per job type — owns the prompt and logic
│       ├── Services/               Orchestration layer — entry point for API controllers
│       ├── Messaging/              Message bus abstraction for async job processing
│       ├── Schema/                 Output schema enforcement — tells the AI what to return
│       └── Guardrails/             Guardrail framework — appended to every prompt
│
├── StarterKit.Data/
│   └── AI/
│       ├── Configurations/         EF Core entity type configurations
│       └── Repositories/           EF Core implementations of the Core interfaces
│
├── StarterKit.WebApi/
│   └── AI/
│       └── AiJobsController.cs     POST /jobs · GET /jobs · GET /jobs/{id}
│
└── StarterKit.MobileApi/
    └── AI/
        └── AiJobsController.cs     GET /jobs/{id} — read-only for mobile
```

---

## StarterKit.Core/AI — Explained

### `Entities/`

Plain C# classes representing the five DB tables. No EF Core attributes — all mapping is handled
by the EF configurations in `StarterKit.Data`.

| File | Table | Purpose |
|---|---|---|
| `AiConfiguration.cs` | `AI_CONFIGURATION` | AI provider connection config (provider name, endpoint) |
| `AiConfigModel.cs` | `AI_CONFIG_MODEL` | A specific model within a config, scoped to a purpose |
| `JobType.cs` | `JOB_TYPE` | Lookup — the canonical list of job types the engine can run |
| `AiJob.cs` | `AI_JOB` | A single unit of AI work, tracked from Queued to Completed |
| `AiJobLog.cs` | `AI_JOB_LOG` | Append-only log of every step during a job execution |

---

### `Enums/`

| File | Values |
|---|---|
| `AiJobStatus.cs` | `Queued` `Running` `Completed` `Failed` `Cancelled` |

---

### `Repositories/`

Interfaces only. Implementations live in `StarterKit.Data/AI/Repositories/`.
`StarterKit.Core` never references EF Core directly.

| Interface | Responsibility |
|---|---|
| `IAiConfigurationRepository` | Read provider configurations |
| `IAiConfigModelRepository` | Resolve model by purpose (e.g. `generation`) |
| `IJobTypeRepository` | Look up a job type by name |
| `IAiJobRepository` | Create, update status, and read AI jobs |
| `IAiJobLogRepository` | Append log entries to a job |

---

### `Providers/`

The abstraction over external AI SDKs. Each provider implements `IAiProvider`.

```text
IAiProvider               Interface — CompleteAsync(request)
├── OpenAiProvider        Calls api.openai.com
├── AzureOpenAiProvider   Calls Azure OpenAI endpoint
└── AnthropicProvider     Calls api.anthropic.com
```

> **Note:** Provider implementations depend on external SDKs. These will be moved to a
> `StarterKit.Infrastructure` project in a future refactor.

---

### `Factories/`

Two factories resolve the correct implementation at runtime using the registered
`IEnumerable<T>` pattern — no switch statements, no conditionals.

#### `AiProviderFactory` — resolves by `AiConfiguration.Provider`

```text
"OpenAI"      →  OpenAiProvider
"AzureOpenAI" →  AzureOpenAiProvider
"Anthropic"   →  AnthropicProvider
```

#### `AiJobHandlerFactory` — resolves by `JobType.Name`

```text
"QuizGenerate"             →  QuizGenerateHandler
"QuestionRate"             →  QuestionRateHandler
"CrosswordGenerate"        →  CrosswordGenerateHandler
"FillInTheBlanksGenerate"  →  FillInTheBlanksHandler
"ContentGenerate"          →  ContentGenerateHandler
"CourseSummarise"          →  CourseSummariseHandler
```

Adding a new provider or job type requires only a new class + DI registration.
The factories never need to change.

---

### `Handlers/`

Each handler owns everything specific to its job type:

- The base system prompt
- How the payload is interpreted
- Which `purpose` model to request from `AiConfigModelRepository`
- How the AI response is parsed and stored

All handlers implement `IAiJobHandler`:

```csharp
public interface IAiJobHandler
{
    string JobTypeName { get; }
    Task HandleAsync(AiJob job, CancellationToken cancellationToken);
}
```

Every handler follows the same internal flow:

```text
1. Load AiConfigModel WHERE purpose = '[handler purpose]'
2. Build system prompt  (hardcoded in handler)
3. Append output schema (OutputSchemaBuilder — ABC-123)
4. Append guardrails    (GuardrailProvider   — ABC-123)
5. Build user prompt from job.Payload
6. Call IAiProvider.CompleteAsync(systemPrompt, userPrompt)
7. Deserialise result
8. Update AiJob.Result + Status via IAiJobRepository
9. Write log entries via IAiJobLogRepository
```

---

### `Services/`

`AiJobService` is the single entry point the API controllers call. It does not contain
AI logic — it orchestrates:

1. Validate the job type exists (`IJobTypeRepository`)
2. Resolve the correct `AiConfigModel` for the job
3. Create the `AiJob` record with `Status = Queued`
4. Publish an `AiJobMessage` to the message bus
5. Return the `AiJob.Id` to the caller immediately

---

### `Messaging/`

Decouples job creation from job processing. The API controller returns instantly;
the job is processed asynchronously.

| File | Purpose |
|---|---|
| `IMessageBus` | Interface — `PublishAsync(AiJobMessage)` |
| `InMemoryMessageBus` | Development/test implementation — no external broker needed |
| `AiJobMessage` | The message payload: `JobId` + `JobTypeName` |

> In production this is replaced by Azure Service Bus + MassTransit.
> Swap the `IMessageBus` registration in `Program.cs` — nothing else changes.

---

### `Schema/`

`OutputSchemaBuilder` solves the problem of the AI returning inconsistent structures.
It takes a C# type and appends a strict JSON schema instruction to the system prompt.

```text
Before:  "Generate 5 quiz questions about photosynthesis."
After:   "Generate 5 quiz questions about photosynthesis.

          You MUST return your response as valid JSON conforming to:
          { "questions": [{ "questionText": "string", ... }] }"
```

Every handler calls `OutputSchemaBuilder.For<TResponse>().AppendTo(systemPrompt)`
before sending to the provider.

---

### `Guardrails/`

`GuardrailProvider` appends a standard set of safety and quality rules to every
prompt, regardless of job type.

```text
Guardrails/
├── IGuardrailProvider.cs      Interface — Apply(prompt)
├── GuardrailProvider.cs       Iterates all registered IGuardrailRule instances
├── GuardrailSet.cs            Value object holding the compiled ruleset
├── IGuardrailRule.cs          Interface — Append(prompt)
└── Rules/
    ├── JsonOnlyRule.cs        "Return only raw valid JSON — no markdown, no code fences"
    ├── NoHarmfulContentRule.cs "Never produce harmful, offensive or political content"
    ├── ToneRule.cs            "Maintain an educational, neutral, encouraging tone"
    └── StayOnTopicRule.cs     "Only complete the task given — no unrequested commentary"
```

Adding a new guardrail = add a class implementing `IGuardrailRule` and register it.
`GuardrailProvider` picks it up automatically.

---

## StarterKit.Data/AI

EF Core plumbing only. Contains no business logic.

### `Configurations/`

One configuration class per entity, registered in `AppDbContext.OnModelCreating`.
Defines table names, column types, constraints, indexes, and seed data.

### `Repositories/`

EF Core implementations of the Core interfaces. The only place in the solution
that has access to `AppDbContext`.

---

## Controllers

### `StarterKit.WebApi` — content creators and admins

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/jobs` | Queue a new AI job |
| `GET` | `/api/ai/jobs` | List all jobs for the authenticated user |
| `GET` | `/api/ai/jobs/{id}` | Get job status and result |

### `StarterKit.MobileApi` — students and learners

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/ai/jobs/{id}` | Get job result — read-only |

Students consume the output of AI jobs (generated quizzes, crosswords, etc.) but
never trigger generation directly.

---

## End-to-End Flow

```text
Frontend
  │
  │  POST /api/ai/jobs  { jobType: "QuizGenerate", payload: { topic: "...", count: 5 } }
  ▼
AiJobsController        (thin — calls IAiJobService only)
  │
  ▼
AiJobService
  ├── Look up JobType by name
  ├── Look up AiConfigModel WHERE purpose = "generation"
  ├── INSERT AiJob  (status = Queued)
  └── Publish AiJobMessage → IMessageBus
          │
          │  Returns JobId to frontend immediately
          ▼
InMemoryMessageBus / Azure Service Bus
  │
  ▼
AiJobProcessor  (background consumer)
  ├── AiJobHandlerFactory.Resolve("QuizGenerate")  →  QuizGenerateHandler
  ├── AiProviderFactory.Create(config)             →  OpenAiProvider
  ├── UPDATE AiJob  (status = Running, startedAt = now)
  │
  ▼
QuizGenerateHandler
  ├── Build system prompt
  ├── OutputSchemaBuilder.For<QuizGenerateResponse>().AppendTo(prompt)
  ├── GuardrailProvider.Apply(prompt)
  ├── Build user prompt from job.Payload
  ├── IAiProvider.CompleteAsync(systemPrompt, userPrompt)
  ├── Deserialise → QuizGenerateResponse
  ├── UPDATE AiJob  (status = Completed, result = JSON, completedAt = now)
  └── INSERT AiJobLog entries
          │
          ▼
Frontend polls  GET /api/ai/jobs/{id}
  └── Returns AiJob.Result when status = Completed
```

---

## Adding a New Job Type

1. Add a row to the `JOB_TYPE` seed data in the migration
2. Create `[Name]Handler.cs` in `StarterKit.Core/AI/Handlers/` implementing `IAiJobHandler`
3. Define the response type and call `OutputSchemaBuilder.For<TResponse>()`
4. Register the handler in `Program.cs` — the factory picks it up automatically
5. Add `[Name]HandlerTests.cs` in `StarterKit.Core.Tests/AI/Handlers/`

## Adding a New AI Provider

1. Create `[Name]Provider.cs` in `StarterKit.Core/AI/Providers/` implementing `IAiProvider`
2. Register the provider in `Program.cs` — the factory picks it up automatically
3. Add a row to `AI_CONFIGURATION` in the database with `provider = "[Name]"`
4. Store the API key in user secrets / Key Vault under the matching key
