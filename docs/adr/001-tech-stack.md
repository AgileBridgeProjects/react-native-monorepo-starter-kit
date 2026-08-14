# ADR 001: Core Tech Stack

**Date:** 2026-03-11
**Status:** Accepted

---

## Context

We are building a cross-platform mobile app targeting iOS, Android, and Web from a single codebase. We needed to choose a runtime, language, routing, styling, and tooling stack.

---

## Decisions

### Expo SDK 54 (Managed Workflow)

**Chosen over:** Bare React Native, Capacitor, Flutter

Expo's managed workflow gives us OTA updates, a unified native module API, and a fast iteration cycle without needing to maintain native Xcode/Android Studio projects directly. Expo SDK 54 targets React Native 0.81.

### TypeScript (strict mode)

**Chosen over:** JavaScript

Strict TypeScript eliminates entire classes of runtime errors and makes the codebase self-documenting. `strict: true` is non-negotiable.

### Expo Router v6 (File-based routing)

**Chosen over:** React Navigation standalone

Expo Router is built on React Navigation but adds file-system conventions, deep linking, and web URL support out of the box. The `app/` directory structure mirrors Next.js, making it intuitive and consistent.

### Uniwind v1.5 + Tailwind CSS v4

**Chosen over:** StyleSheet.create, Styled Components, Restyle, NativeWind

Uniwind is a drop-in NativeWind replacement that is 2.4× faster. It compiles Tailwind classes to React Native styles at build time with zero runtime overhead. Tailwind v4's CSS-first configuration model (`@theme` / `@layer theme` in `global.css`) replaces the JS-based `tailwind.config.js`.

Design tokens are defined in `global.css` for class generation and mirrored in `constants/tokens.ts` for runtime access.

**Key constraint:** All style values must go through the token system. No inline styles with raw values.

### Vitest + React Native Testing Library

**Chosen over:** Jest

Vitest is significantly faster than Jest for TypeScript projects, has a compatible API, and integrates cleanly with the Expo build pipeline. RNTL provides React Native-aware queries and matchers.

### Biome

**Chosen over:** ESLint + Prettier

Single tool for linting and formatting. Faster than the ESLint + Prettier combination, and eliminates the configuration conflicts between the two. Config lives in `biome.json`.

### React Native Reanimated v4

**Chosen over:** Animated API, Moti

Reanimated v4 runs animations on the native UI thread, making them performant even during JS thread load. Required for any gesture-driven or complex animation work.

### Axios + React Query

**Chosen over:** native `fetch`, SWR, Redux Toolkit Query

Axios provides request/response interceptors for cross-cutting concerns (auth header injection, token refresh, error normalisation). React Query manages server-data lifecycle (caching, background refetch, loading/error state). See ADR 003 for full details.

### Zustand + react-native-mmkv

**Chosen over:** Redux, MobX, Context + useReducer, AsyncStorage

Zustand is minimal and allows reading state outside React components (critical for interceptors). MMKV provides synchronous, high-performance key-value storage for Zustand's `persist` middleware. See ADR 004 for full details.

### MSW (Mock Service Worker)

**Chosen over:** mocking axios directly, nock

MSW intercepts at the network level, giving integration tests realistic HTTP behaviour. Datasource tests exercise real axios ↔ HTTP logic without hitting servers. Handlers are defined once in `test/mocks/handlers.ts` and shared across all test files.

---

## Consequences

- All contributors must use Uniwind classes — no `StyleSheet.create` in pages/components
- Design tokens are defined in `global.css` (`@theme` block) and `constants/tokens.ts`
- Semantic colors use CSS custom properties via `@layer theme` with `@variant light/dark` — no hex values in components
- The `@/` path alias is required for internal imports
- Biome replaces both ESLint and Prettier — do not install either
- All datasources use the shared `apiClient` instance — no custom axios instances
- Interceptors use lazy `import()` — never `require()` — for Vite alias compatibility
- Sensitive data in expo-secure-store, non-sensitive in MMKV — never mix them
- Datasource tests use MSW — never mock axios directly
- All test fixtures come from `test/factories/` — no inline fixture duplication
- Feature work requires a spec before implementation (see `CLAUDE.md` SDW)
