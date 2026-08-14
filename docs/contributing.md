# Contributing Guide

## Workflow

All work follows the **Spec-Driven Workflow (SDW)**. No feature gets implemented without an approved spec.

```text
spec:new → spec:requirements → spec:approve requirements
       → spec:design → spec:approve design
       → spec:tasks → spec:approve tasks
       → spec:implement
```

For bugs and small fixes, a spec is not required. Use your judgement — if it changes behaviour in a non-obvious way, write a spec.

## Branches

| Branch | Purpose | Direct push |
|---|---|---|
| `main` | Production-ready | No — PR only |
| `dev` | Integration branch | No — PR only |
| `feature/<name>` | New features | Yes |
| `fix/<name>` | Bug fixes | Yes |
| `chore/<name>` | Tooling, deps, config | Yes |

Branch from `dev`. PR into `dev`. `dev` → `main` is a release.

## PR Process

1. Branch from `dev`: `git checkout -b feature/my-feature dev`
2. Write code + tests
3. Run `npm run check` — must pass cleanly before opening a PR
4. Open PR against `dev`
5. Fill in the PR template
6. CI must pass (lint + typecheck + tests)
7. Get at least one approval
8. Squash merge

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: add game card component
fix: correct token value for border-strong in dark mode
chore: update biome to 2.5
docs: add design system spacing table
test: add tests for use-auth hook
refactor: extract shared list logic to lib/list-utils
```

Types: `feat` · `fix` · `chore` · `docs` · `test` · `refactor` · `perf` · `ci`

## Code Standards

See `.github/copilot-instructions.md` for the full machine-readable rules. Key points:

- **Styling**: Uniwind `className` only. No `StyleSheet.create` in pages/components.
- **Tokens**: All colors, spacing, and typography from `constants/tokens.ts`.
- **Components**: Named exports, functional, TypeScript interfaces for props. Always use shared `components/ui/` primitives.
- **Imports**: Use `@/` alias. Follow the 4-group import order.
- **Testing**: Tests in `__tests__/` mirroring source. `describe/it` blocks. Use shared factories from `test/factories/`.

## Testing

### Infrastructure

- **Vitest** as the test runner (jsdom environment)
- **MSW** (Mock Service Worker) for HTTP-level integration tests
- **React Native Testing Library** for component tests
- **Shared factories** in `test/factories/` for all test fixtures

### DRY Test Rules

- **Never duplicate fixtures** — use factories from `test/factories/` (`makeUser`, `makeTokens`, `makeUserDto`, etc.)
- **Never duplicate mock builders** — use `makeMockAuthRepo()`, `makeMockAuthService()` from factories
- **Never use `toBe(true)` / `toBe(false)`** — use `toBeTruthy()` / `toBeFalsy()`
- **Never use bare `test()`** — wrap in `describe()` / `it()` blocks
- **Mock at boundaries only** — services mock repos, use-cases mock services, hooks mock use-cases
- **Global mocks** for RN, Expo, MMKV, and expo-secure-store are in `test/setup.ts` — don't re-declare them in individual test files
- **MSW handlers** in `test/mocks/handlers.ts` use factory fixtures — don't hardcode DTOs inline
- **Keep hook input fixtures stable across rerenders** unless the test is explicitly about changing them — recreating objects inline can trigger reset effects and misleading rerender loops

### Adding a New Factory

1. Add the factory function to `test/factories/auth.factory.ts` (or create a feature-specific factory file)
2. Export it from `test/factories/index.ts`
3. Use `Partial<T>` overrides pattern for customisability

See `test/README.md` for the full testing guide.

## Running Checks Locally

```bash
npm run lint          # Biome lint check
npm run lint:fix      # Auto-fix lint issues
npm run typecheck     # TypeScript
npm run test          # Vitest
npm run check         # All three in sequence
```

Fix all issues before opening a PR. The CI will catch them anyway, but fix them earlier.

## Adding Dependencies

- Discuss before adding new dependencies — keep the bundle small
- Mobile apps have strict size budgets; check bundle impact
- Prefer packages with Expo SDK support and active maintenance
- Add an ADR in `docs/adr/` if the dependency is architectural (e.g., a new state manager)
- Update `CLAUDE.md` and `docs/architecture.md` tech stack tables when adding architectural deps

## Documentation

- Keep `docs/` up to date with code changes
- Design system changes → update `docs/design-system.md`
- Architectural decisions → add a new `docs/adr/NNN-description.md`
- Reference the spec in your PR description

## Questions

Open a GitHub Discussion or check `docs/` first.
