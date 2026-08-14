---
name: openapi-proxy-generation
description: "Use when adding/modifying backend controller endpoints, creating frontend API integrations, working with DTOs or enums that cross the API boundary, or when a user mentions proxy generation. Covers the full workflow: backend Tags, enum serialisation, schema fetching, Orval generation, and frontend consumption."
---

# OpenAPI Proxy Generation

**Use this skill whenever backend endpoints change or frontend code needs to call the API.**

The proxy layer auto-generates typed TypeScript functions and DTOs from backend OpenAPI schemas using Orval. Files in `src/proxy/` are **never hand-edited**.

## Architecture overview

See `docs/adr/005-openapi-proxy-generation.md` for full rationale.

```
Backend Controller  →  OpenAPI JSON schema  →  Orval  →  src/proxy/ (TypeScript)
     ↑                      ↑                              ↓
  [Tags]              openapi/*.json              models/ + services/
  JsonStringEnumConverter   (committed)           (auto-generated)
```

## When to trigger proxy regeneration

- A new controller action is added
- A controller action's route, parameters, or return type changes
- A DTO used in a controller request/response is added or modified
- An enum used in API contracts is added or modified
- **Do NOT regenerate** for changes to internal services, repositories, or domain logic that don't affect the API surface

## Backend checklist (before regeneration)

### 1. Controller must have `[Tags]`

Every controller needs a `[Tags("...")]` attribute for Orval to split files correctly.

```csharp
// REQUIRED
[Tags("AiJobs")]
[Route("api/ai")]
[ApiController]
public sealed class AiJobsController : ControllerBase { }
```

### 2. Enum serialisation is global — no per-enum attributes

Both MobileApi and WebApi have a global `JsonStringEnumConverter` in `Program.cs`. Never add `[JsonConverter(typeof(JsonStringEnumConverter))]` to individual enums.

```csharp
// WRONG — redundant per-enum attribute
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum QuestionDifficulty { Easy, Medium, Hard }

// CORRECT — plain enum, global converter handles it
public enum QuestionDifficulty { Easy, Medium, Hard }
```

### 3. Use `[ProducesResponseType]` on every action

This ensures the OpenAPI schema documents all possible response types, which Orval uses to generate accurate return types.

```csharp
[HttpGet("{id:guid}")]
[ProducesResponseType(typeof(AiJobResponse), StatusCodes.Status200OK)]
[ProducesResponseType(StatusCodes.Status404NotFound)]
public async Task<ActionResult<AiJobResponse>> GetJob(Guid id, CancellationToken ct)
```

## Regeneration commands

### Full regeneration (fetches fresh schema from running backend)

```bash
# Single app
cd apps/expo && npm run generate:proxy
cd apps/web && npm run generate:proxy

# All apps from monorepo root
npm run generate:proxy
```

**Prerequisites:** The backend must be running locally.
- MobileApi: `cd apps/backend/src/StarterKit.MobileApi && dotnet run` (port 5001)
- WebApi: `cd apps/backend/src/StarterKit.WebApi && dotnet run` (port 5002)

### Local-only regeneration (no backend needed, uses committed schema)

```bash
cd apps/expo && npm run generate:proxy:local
cd apps/web && npm run generate:proxy:local

# All apps
npm run generate:proxy:local
```

## What gets generated

```
src/proxy/
  models/           ← TypeScript interfaces, enums, request/response types
    index.ts        ← barrel re-export
  services/         ← Axios functions grouped by controller [Tags]
    ai-jobs/
      ai-jobs.ts    ← postApiAiQuiz(), getApiAiJobsId(), etc.
```

All files carry a header: `// AUTO-GENERATED — DO NOT EDIT.`

### Generated enum example
```typescript
export type QuestionDifficulty = typeof QuestionDifficulty[keyof typeof QuestionDifficulty];
export const QuestionDifficulty = {
  Easy: 'Easy',
  Medium: 'Medium',
  Hard: 'Hard',
} as const;
```

### Generated function example
```typescript
export const getApiAiJobsId = (id: string) => {
  return customInstance<AiJobResponse>({
    url: `/api/ai/jobs/${id}`,
    method: 'GET',
  });
};
```

## How to consume generated proxy in feature code

Import from `src/proxy/` — never call `apiClient` directly for endpoints that have a generated function.

```typescript
// CORRECT — use generated proxy
import { getApiAiJobsId } from '@/src/proxy/services/ai-jobs/ai-jobs';
import type { AiJobResponse } from '@/src/proxy/models';

const job = await getApiAiJobsId(jobId);

// WRONG — manual apiClient call for an endpoint that has a proxy function
const { data } = await apiClient.get<AiJobResponse>(`/api/ai/jobs/${id}`);
```

## How the mutator works

Generated functions delegate to `src/lib/http/orval-mutator.ts`, which wraps the app's `apiClient` singleton. This means **all proxy calls automatically get**:
- Auth token injection (request interceptor)
- 401 token refresh with queued retry (response interceptor)
- Error normalisation to `ApiError` (response interceptor)

## Adding a new endpoint — full workflow

1. **Backend**: Add the controller action with `[Tags]`, `[ProducesResponseType]`, and proper DTO types
2. **Backend**: Write tests (integration + unit + repository per project standards)
3. **Backend**: Start the API locally (`dotnet run`)
4. **Frontend**: Run `npm run generate:proxy` from the relevant app
5. **Frontend**: Import the generated function in your feature's datasource/hook
6. **Commit**: Include the updated `openapi/*.json` and `src/proxy/` files together

## Key files

| File | Purpose |
|------|---------|
| `apps/expo/orval.config.ts` | Orval configuration (Expo) |
| `apps/web/orval.config.ts` | Orval configuration (Web) |
| `apps/expo/src/lib/http/orval-mutator.ts` | Custom axios mutator (Expo) |
| `apps/web/src/lib/http/orval-mutator.ts` | Custom axios mutator (Web) |
| `apps/expo/scripts/fetch-openapi.mjs` | Schema fetch script (Expo) |
| `apps/web/scripts/fetch-openapi.mjs` | Schema fetch script (Web) |
| `apps/expo/openapi/mobile-api.json` | Committed MobileApi schema |
| `apps/web/openapi/web-api.json` | Committed WebApi schema |
| `docs/adr/005-openapi-proxy-generation.md` | Architecture decision record |
| `apps/expo/src/proxy/README.md` | Expo proxy README |
| `apps/web/src/proxy/README.md` | Web proxy README |
