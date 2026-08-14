# Subagent brief — Expo unit-test hardening (ABC-123)

You are writing **bulletproof unit tests** for ONE assigned feature of the Expo app
(`apps/expo`). A green run must mean "safe to ship." Read this fully before writing code.

## The bar (every file)

See `test/TEST_HARDENING_PLAN.md` → "The Robustness Bar" for the full matrix. Summary:

- **Screens/components:** assert EVERY element by `testID`/role/copy; EVERY state
  (loading/error/empty/success/offline); EVERY interaction fires the right handler with the
  right args; EVERY navigation asserts exact `router.push/replace` pathname + params; EVERY
  branch (mode/flag/role/param); form validation blocks invalid + submits transformed payload.
  PLUS a `toMatchSnapshot()` for the default render and each major state.
- **Hooks:** initial state, every transition, success + error of each query/mutation, side-effects
  (navigation/store/toast), edge cases (empty/nullish/rapid rerender).
- **Pure utils:** every branch + boundary + invalid input; determinism where claimed.
- **Datasources:** happy path + each error status → typed Failure; assert request URL/body. Use MSW
  (`test/mocks/server.ts` + `handlers.ts`) — do NOT `vi.mock('axios')`.

## Use the shared harness — DRY IS MANDATORY (do not re-invent)

- `@/test/utils/rtr` → `renderTree`, `TestNode`, `byTestId`, `queryAllByTestId`, `hostByTestId`
  (rendered accessibilityState), `inputByTestId` (drills wrapper→host TextInput), `textChildren`,
  `pressableWithText`, `firePress`, `fireChangeText`.
- `@/test/utils/render-hook` → `renderHook` (wraps QueryClientProvider) for hook tests.
- `@/test/mocks/ui` → `makeUiMock(overrides)` for `@/components/ui`
  (`vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock())`),
  and `controllerField(control, name, extra)` for react-hook-form-wired inputs.
- `@/test/mocks/shared` → `i18nPassthrough()`, `tokensMock()`, `iconMock()`.

## Copy these exemplars' structure

- Screen w/ form + branches: `__tests__/src/features/auth/presentation/screens/login-screen.test.tsx`
- Screen w/ list + AsyncStateView: `.../select-organisation-screen.test.tsx`
- Screen w/ guard states: `.../setup-account-screen.test.tsx`, `.../otp-verify-screen.test.tsx`

## Conventions (hard law)

- `describe`/`it` (never bare `test()`). `toBeTruthy()`/`toBeFalsy()` (never `toBe(true/false)`).
- Tests in `__tests__/` mirroring source path 1:1. Snapshots auto-write on first run.
- TypeScript: use `TestNode` from rtr. **Never** `import { type ReactTestInstance }` (it's a
  namespace — tsc error). Your files MUST pass `npx tsc --noEmit`.
- `vi.mock` factories are hoisted: never CALL a top-level helper inside a factory (TDZ). Router
  mocks read per-test spy fns lazily (inside `() => ({...})`), like the exemplars.

## File ownership — STAY IN YOUR LANE (other agents run in parallel)

- CREATE only test files under your feature's `__tests__/.../<feature>/` path.
- You MAY edit your feature's `*.copy.ts` to ADD `testID` registry entries, and wire those testIDs
  into your feature's source components/screens where elements lack them.
- You MAY create/extend `test/factories/<feature>.factory.ts`. Import factories by DIRECT path
  (`@/test/factories/<feature>.factory`) — do **NOT** edit `test/factories/index.ts`.
- Do **NOT** edit: `test/utils/*`, `test/mocks/ui.tsx`, `test/mocks/shared.ts`, `test/setup.ts`,
  `TEST_HARDENING_PLAN.md`, `test/factories/index.ts`, or any OTHER feature's files.
- Need a UI component not in `makeUiMock`? Pass it via `makeUiMock({ Foo: ... })` overrides locally.
  Need an extra global module mocked? `vi.mock` it locally in your test file.

## Run + verify (only YOUR files)

- Run ONLY your feature: `npm test -- <feature-keyword>` (e.g. `npm test -- features/rewards`).
  **Never run the full suite** — other agents are mid-write.
- Iterate until ALL your files pass. Then confirm no type errors in your files.

## Report back

List: files created (+ test count each), any source testIDs you added, any file you could NOT make
pass (with the reason). Be concise.
