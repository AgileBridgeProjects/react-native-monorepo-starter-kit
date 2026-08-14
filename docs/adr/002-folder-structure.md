# ADR 002: Feature-Based Clean Architecture Folder Structure

**Date:** 2026-03-11
**Status:** Accepted

---

## Context

As the app grows beyond a handful of screens, flat folder structures (`hooks/`, `lib/`, `components/`) become hard to navigate and create tight coupling. We needed a structure that:

- Groups code by what it does (business domain), not where it lives technically
- Enforces separation of concerns so UI never knows about HTTP
- Scales to a team — features can be owned and developed independently
- Maps 1:1 to the backend's controller structure for predictability

---

## Decision

**Hybrid architecture: Feature-based at the macro level, Clean Architecture layers within each feature.**

```text
src/
  features/<name>/
    domain/          # Pure TS — entities, VOs, repo interfaces, failures
    infrastructure/  # HTTP datasources, repo impls, mappers, DTOs
    application/     # Services, use cases
    presentation/    # React screens, hooks, components
  lib/               # Shared infra (HTTP client, storage)
  store/             # Global Zustand stores (cross-feature state)
app/                 # Expo Router (thin routing shells only)
components/ui/       # Design system primitives
constants/           # Tokens and theme (existing)
```

### Why feature-based at the top level?

- All code for one domain lives together — faster to find, easier to delete
- Teams can own features without stepping on each other
- A feature can be removed without touching every layer across the project

### Why clean architecture layers within each feature?

- The presentation layer never knows about HTTP status codes
- The domain layer never changes when we swap the HTTP library
- Use cases and services are trivially testable without mounting a React tree
- Mirrors the backend (controller → service → repository) so the naming is predictable

### The 1:1 backend mirror rule

Every backend controller maps to exactly one frontend datasource:

```text
Backend: AuthController  →  Frontend: AuthDataSource + AuthRepositoryImpl
Backend: GameController  →  Frontend: GameDataSource + GameRepositoryImpl
```

---

## Dependency Rule

Dependencies point **inward only**:

```text
presentation → application → domain
infrastructure             → domain
```

A domain class importing from infrastructure is a violation.

---

## Consequences

- Adding a new feature requires creating 4 directories + their README files
- The `_template` pattern (copying `auth/`) is the onboarding path for new features
- `app/` files are routing shells only — logic lives in `presentation/screens/`
- Cross-feature imports are restricted to `domain/entities/` — never `infrastructure/` or `application/`
