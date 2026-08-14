# ADR 005: OpenAPI Proxy Generation — Orval

**Date:** 2025-07-23
**Status:** Accepted

---

## Context

The frontend apps (Expo mobile + Next.js web) need typed HTTP functions and DTOs that mirror
the backend controllers 1:1. Previously, datasources, DTOs, and request/response types were
written by hand in each feature's `infrastructure/` layer. This was error-prone:

- Endpoints could drift between backend and frontend without detection
- DTO shapes required manual synchronisation on every change
- Enum serialisation had to be replicated by hand

We needed a system where the backend API surface is the single source of truth and the
frontend proxy layer is always in sync — automatically.

---

## Decisions

### Orval for code generation

**Chosen over:** openapi-typescript, swagger-typescript-api, custom codegen

Orval generates typed axios functions (not just types) from OpenAPI JSON, supports custom
axios mutators, splits output by controller tag, and produces idiomatic TypeScript. It
integrates naturally with our existing axios singleton and does not require React Query hooks
(we compose those ourselves in the presentation layer).

Configuration lives in `orval.config.ts` at each app root.

### Committed OpenAPI schemas

Each app commits its OpenAPI JSON to `openapi/`:

- `apps/expo/openapi/mobile-api.json` — from `StarterKit.MobileApi`
- `apps/web/openapi/web-api.json` — from `StarterKit.WebApi`

This makes proxy generation reproducible without a running backend. The fetch scripts
(`scripts/fetch-openapi.mjs`) download from the local dev server when a full refresh is
needed.

### Custom axios mutator

Generated functions delegate to each app's `apiClient` singleton via a custom mutator at
`src/lib/http/orval-mutator.ts`. This means all proxy calls automatically use auth
interceptors, token refresh, and error normalisation — no per-function setup required.

### Tags-split mode

Orval splits generated service files by OpenAPI tag (which maps to controller `[Tags]`
attributes). Each controller gets its own file under `src/proxy/services/<tag>/`.

### Global `JsonStringEnumConverter`

Both API projects register `JsonStringEnumConverter` globally in `AddJsonOptions()` so all
enums serialise as strings over the wire. A schema transformer in `AddOpenApi()` ensures the
OpenAPI document reflects `"type": "string"` with named enum values (handling both regular
and nullable enum types). This gives Orval the information it needs to generate string union
types instead of numeric enums.

### Types + functions only (no hooks)

Orval generates plain axios functions and TypeScript types/enums. React Query hooks are
composed manually in the presentation layer, keeping the proxy layer framework-agnostic.

---

## Generated output

```text
src/proxy/
  models/       ← TypeScript interfaces, enums, request/response types
    index.ts    ← barrel re-export
  services/     ← Axios functions grouped by controller tag
    ai-jobs/
      ai-jobs.ts
```

All generated files carry a header comment:

```ts
// AUTO-GENERATED — DO NOT EDIT.
// Regenerate with: npm run generate:proxy
```

---

## Workflow

### When a backend endpoint changes

1. Start the backend locally
2. Run `npm run generate:proxy` (fetches schema + regenerates + formats)
3. Commit the updated `openapi/*.json` and `src/proxy/` together

### Local-only regeneration (no backend needed)

```bash
npm run generate:proxy:local
```

### Monorepo-level

```bash
npm run generate:proxy        # all apps
npm run generate:proxy:local  # all apps, schema already committed
```

---

## Consequences

- `src/proxy/` files are **never hand-edited** — all changes come from regeneration
- Backend controllers must have `[Tags("...")]` attributes for clean file splitting
- New enums must use the global `JsonStringEnumConverter` (no per-enum attributes needed)
- The OpenAPI schema is the contract — breaking backend changes are caught at generation
  time (TypeScript compile errors in consuming code)
- Feature `infrastructure/datasources/` files should import from `src/proxy/` rather than
  calling `apiClient` directly for endpoints that have been generated
