# Frontend Coding Conventions — Shared — The Law

> Platform-specific rules live in separate files:
>
> - **Web (Next.js)**: `docs/standards/frontend-web.md`
> - **Mobile (Expo)**: `docs/standards/frontend-mobile.md`

This file covers conventions that apply to **both** `apps/web` and `apps/expo`.

## Centralised design token system

All design tokens live in `packages/shared/` — the single source of truth shared across both apps.

| File | Purpose | Consumers |
|---|---|---|
| `packages/shared/tokens.css` | CSS primitive variables (`--starterkit-*`) | `apps/web/src/app/globals.css` and `apps/expo/global.css` via `@import '@starterkit/shared/tokens.css'` |
| `packages/shared/src/lib/tokens.ts` | TypeScript runtime primitives (`palette`, `spacing`, etc.) | `apps/expo/constants/tokens.ts` re-exports these; any code that needs token values at runtime |

**Rules:**

- Never hardcode hex, px, or font-size values — always derive from the shared tokens
- When adding a new design token: add it to `packages/shared/tokens.css` AND `packages/shared/src/lib/tokens.ts` together; then update the app-level semantic mapping in each app's global CSS file
- **Icon sizes**: import `iconSize` from `@starterkit/shared` — never hardcode pixel values (`16`, `20`, `28`, `48`)
- **Product name / branding**: import `appConfig` from `@starterkit/shared` — never hardcode the string `"StarterKit"` or portal titles

### When to promote a utility to `packages/shared`

A helper function or constant belongs in `packages/shared/src/lib/` (exported via `@starterkit/shared`) when **all three** are true:

1. **Pure** — no dependency on React, React Native, Expo, or any app-layer module; plain TypeScript
2. **Generic** — operates on generic inputs (arrays, numbers, strings); could be useful in `apps/expo`, `apps/web`, or any future app without modification
3. **Reused or reusable across apps** — already used (or clearly will be used) in more than one app

If a helper is only needed inside one app, keep it in `src/lib/` within that app.

**Examples of shared utilities already in `@starterkit/shared`:**

- `MathUtil.percentage` — pure numeric calculation used by both mobile and web progress indicators
- `cn` — class-name merging used by both Expo (NativeWind) and Next.js (Tailwind)
- `iconSize` — icon pixel sizes used by both Expo nav icons and web admin sidebar icons
- `appConfig` — product name and portal titles used across both apps

```tsx
// VIOLATION: hardcoded product name
<Text>StarterKit Admin Portal</Text>       // ← use appConfig.adminPortalTitle

// VIOLATION: importing from the wrong place (web code importing expo constants)
import { colors } from '@/constants/tokens'; // ← only valid in apps/expo

// CORRECT (web CSS): tokens.css is already imported via globals.css @theme inline block
<div className="bg-primary text-text" />

// CORRECT: icon size from shared tokens
import { iconSize } from '@starterkit/shared';
<Ionicons name="close" size={iconSize.sm} />

// CORRECT: branding from shared config
import { appConfig } from '@starterkit/shared';
<title>{appConfig.adminPortalTitle}</title>

// CORRECT (expo runtime): semantic values for React Navigation, Reanimated, etc.
import { palette } from '@starterkit/shared';
const navTheme = { colors: { primary: palette.primary[500] } };

// CORRECT (expo runtime via constants/tokens.ts):
import { colors } from '@/constants/tokens';
const style = useAnimatedStyle(() => ({ backgroundColor: colors.light.primary }));
```

### Inline style exceptions (Expo only)

`style={{}}` is permitted **only** when all of the following are true:

1. The property has no Tailwind equivalent (e.g. `aspectRatio` with a runtime value, `transform` with calculated angles)
2. Multiple calculated properties must be applied together for a layout that cannot be expressed as static classes (e.g. absolute-positioned overlays with `left/top/width/height` all derived from grid math)

Document the exception with a comment explaining why Tailwind cannot cover it. If only `width` or `height` is dynamic, use an arbitrary value class instead — that is never an exception.

```tsx
// VIOLATION: inline style where a Tailwind arbitrary value works
<View style={{ width: `${percentage}%` }} />

// CORRECT: NativeWind arbitrary value
<View className={cn('h-2 rounded-full bg-primary', `w-[${percentage}%]`)} />

// CORRECT EXCEPTION: absolute overlay — four calculated layout properties with no Tailwind equivalent
// left/top/width/height all derived from grid dimensions; cannot be expressed as static classes
<Pressable
  className={cn(cellOverlayVariants({ state, grid }))}
  style={{
    left: `${(cell.col / cols) * 100}%`,
    top: `${(cell.row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  }}
/>
```

### Touch targets and breakpoints (Expo)

- Use the shared `touch-target` utility class for tappable controls that must meet the WCAG minimum 44x44 target size
- Do **not** repeat `min-h-[44px] min-w-[44px]` inline across components; use `touch-target` instead
- Prefer Tailwind responsive classes (`md:hidden`, `md:flex`, etc.) for layout/visibility behavior
- Use `useBreakpoints()` only when the value is required in JavaScript logic and cannot be expressed in Tailwind classes (for example: `FlatList` `numColumns`, algorithmic branching, or non-style calculations)
- Do **not** use `useBreakpoints()` just to show/hide UI that Tailwind can handle directly

```tsx
// VIOLATION: duplicated touch target dimensions and JS breakpoint toggle for visibility
const { isTablet } = useBreakpoints();
{isTablet && <Sidebar />}
{!isTablet && (
  <Pressable className="min-h-[44px] min-w-[44px] items-center justify-center" />
)}

// CORRECT: Tailwind controls visibility; shared utility controls target size
<Sidebar className="hidden md:flex" />
<Pressable className="touch-target items-center justify-center md:hidden" />

// CORRECT: useBreakpoints where JS values are required (no Tailwind equivalent)
const { numColumns } = useBreakpoints();
<FlatList numColumns={numColumns} />
```

## Components

- Functional components with TypeScript `interface` for props (`{ComponentName}Props`)
- **Named exports only** — no `export default` for reusable components
- Pages in `app/` use `export default` (Expo Router requirement only)
- File naming: `kebab-case.tsx` — Component naming: `PascalCase`
- **One component per file** — never define multiple exported (or non-trivial internal) components in a single file; extract each into its own `kebab-case.tsx` file in the same folder
- Platform-specific: `.ios.tsx`, `.android.tsx`, `.web.tsx` suffixes
- **`components/ui/` is flat** — never create subfolders inside `components/ui/` (e.g. no `components/ui/admin/`, `components/ui/forms/`); every shared primitive goes directly in `components/ui/` with a barrel export in `index.ts`
- **Shared vs feature component placement** — a component starts in the feature folder where it is first needed (`features/<name>/presentation/components/`). Promote it to `components/ui/` when **any two of these are true**: (a) it contains no feature-specific domain logic or imports, (b) it could be useful in a second unrelated feature, (c) a reviewer flags it as generic. Components that render design-system tokens (`bg-surface`, `text-content`, `border-border`) without any feature state or business logic are almost always candidates for shared UI. Add a `{ComponentName}Props` interface, re-export from `index.ts`, then update the original import site to use `@/components/ui`.
- **Always use shared components** — never hand-roll a button, input, alert, or heading:
  - `<Button>` not `<TouchableOpacity>` / `<Pressable>` with manual text classes
  - **Web**: `<Button>` from `@/components/ui` (with `variant`, `size`, `isLoading`, `fullWidth` props) — **never** a raw `<button>` element. This includes secondary actions such as "Resend", "Cancel", "Clear", etc. Pick the right variant:
    - `variant="primary"` — primary call-to-action (submit, save, create)
    - `variant="outlined"` — secondary action alongside a primary (e.g. Cancel)
    - `variant="ghost"` — low-emphasis in-flow actions (e.g. Resend, Back, inline links styled as buttons)
  - **Expo**: `<Button>` not a raw `<Pressable>` with manual text and style classes
  - `<Input>` not raw `<TextInput>` with manual label/error logic
  - `<FormField>` not `<Controller>` + `<TextInput>` boilerplate
- **Expo**: `<Alert>` not inline error `<View>` + `<Text>`
- **Web**: `toast.error(message)` not inline error `<div>` banners
- **Web**: `<Typography variant="h1">` not raw `<h1>`, `<h2>`, or `<p className="text-…">` — the `Typography` component applies correct tokens and screen-reader semantics automatically. Use it for **all** headings on web pages, not just Expo screens.
- **Expo**: `<Typography variant="h1">` not `<Text className="text-4xl font-bold text-text">`
- **Expo**: `<Skeleton>` not raw `<ActivityIndicator>` for content/page loading states; shape it with `shape` and `className` to match the content being loaded. `<Button loading>` remains the correct pattern for button-local pending state.
- **Web**: `<Skeleton>` from `@/components/ui` not raw `<div className="animate-pulse bg-border">` for content/data loading states; use `className` to control dimensions matching the content being loaded. For `<EntityDataGrid>`, use the purpose-built `<GridSkeleton>` overlay rather than a plain `<Skeleton>`. DevExtreme's built-in `<LoadPanel>` must **not** be used — it leaves the grid interactive during loading and cannot be themed. `<Button isLoading>` remains the correct pattern for button-local pending state.
- **Expo async page/query states**: prefer a shared state wrapper (for example `AsyncStateView`) to handle loading skeletons, error presentation, retry actions, and optional empty states. Screens should provide the page-specific skeleton/content, not duplicate `if (isLoading)` / `if (isError)` boilerplate around every query.
- **Web async page/query states**: use `<AsyncPageState>` from `@/components/ui` to handle the loading / no-data / ready states for page-level content. Pass `isLoading`, `hasData={!!data}`, a `skeleton` element, and the ready `children`. Handle error states with an early return **before** rendering `<AsyncPageState>`. Do not inline `isLoading || !data ? <skeleton> : <content>` ternaries in page components.

  ```tsx
  if (isError) return <ErrorView />;

  return (
    <AsyncPageState isLoading={isLoading} hasData={!!entity} skeleton={<MySkeleton />}>
      <MyContent entity={entity!} />
    </AsyncPageState>
  );
  ```

- **Expo page shells**: use the shared `PageScrollView` component for scroll-based screens that need the standard page title + optional intro copy + children layout, instead of hand-rolling the same `ScrollView` shell per feature
- New shared components: define with CVA, export variant function + props type, add barrel export, add test

### Web page heading and text standard

**Never use raw HTML heading or paragraph tags** (`<h1>`, `<h2>`, `<p className="text-…">`) in web page components. Always use `<Typography>` from `@/components/ui`.

```tsx
// ❌ VIOLATION: raw HTML heading
<h1 className="text-3xl font-bold text-text">Sign in</h1>

// ❌ VIOLATION: raw paragraph with manual token classes
<p className="text-sm text-text-secondary">{t('auth:phone.subtitle')}</p>

// ✅ CORRECT: Typography for all headings
<Typography variant="h1">{t('auth:phone.title')}</Typography>

// ✅ CORRECT: Typography for body/subtitle copy on auth/form pages
<Typography variant="body">{t('auth:phone.subtitle')}</Typography>
```

The `<Typography>` component ensures:

- Consistent token usage (`text-text`, `text-text-secondary`, correct font sizes)
- Correct HTML element semantics (`<h1>` for `variant="h1"`, etc.) for accessibility
- A single place to update type scale project-wide

### Web button standard

**Never use a raw `<button>` element** in web page or component files. Always use `<Button>` from `@/components/ui`:

```tsx
// ❌ VIOLATION: raw <button> element
<button
  type="button"
  onClick={onResend}
  className="text-primary underline-offset-4 hover:underline"
>
  Resend code
</button>

// ✅ CORRECT: Button component with appropriate variant
<Button variant="ghost" type="button" onClick={onResend}>
  {t('auth:otp.resendButton')}
</Button>

// ✅ CORRECT: primary submit
<Button type="submit" fullWidth isLoading={isPending}>
  {t('auth:otp.submitButton')}
</Button>

// ✅ CORRECT: outlined secondary action
<Button variant="outlined" onClick={onCancel}>
  {t('common:actions.cancel')}
</Button>
```

Exceptions (the only cases where a raw `<button>` is acceptable):

- Inside a **design-system component** (`components/ui/`) that is itself implementing a button primitive
- Inside a **third-party component** integration where the library requires a native element

### Expo screen heading standard

Use the `<Typography>` variant hierarchy below. Every screen must have **exactly one `h1`** — screen-reader users and automated accessibility audits rely on this.

| Variant | Context | Token size |
|---|---|---|
| `h1` | Screen / page title — one per screen | `text-4xl` (36 px) bold |
| `h2` | Major section within a screen (e.g. "Your Stats", "Weekly Activity") | `text-3xl` (30 px) bold |
| `h3` | Sub-section or card heading within a section | `text-2xl` (24 px) semibold |
| `h4` | Inline label-level heading inside dense/card content | `text-xl` (20 px) semibold |

**Spacing below the screen title (`h1`) before first content:**

| Context | Class | px |
|---|---|---|
| In-app screens (tab/stack navigation) | `mb-lg` | 24 px |
| Auth / onboarding screens (full-screen focus, no tab bar) | `mb-2xl` | 48 px — heavier breathing room suits an isolated form layout |

**Expo alignment:** mobile screen titles are **centred**
(`text-center uppercase text-white`) — see `docs/standards/frontend-mobile.md`.
Section headings inside a screen stay left-aligned.

```tsx
// ✅ CORRECT — in-app tab screen
<Typography variant="h1" className="mb-lg">{t('profileHeading')}</Typography>
// first section or content follows here

// ✅ CORRECT — auth/onboarding screen
<Typography variant="h1" className="mb-2xl">{t('login.title')}</Typography>
// first form field follows here

// ✅ CORRECT — section within a screen
<Typography variant="h2" className="mb-md">{t('yourStats')}</Typography>

// ✅ CORRECT — card / sub-section heading
<Typography variant="h3">{cardTitle}</Typography>

// ❌ VIOLATION: screen title uses the wrong variant
<Typography variant="h3">{t('titles:rewards')}</Typography>

// ❌ VIOLATION: the same heading uses different variants to work around responsive layouts
{isTablet
  ? <Typography variant="h1">{t('notifications')}</Typography>
  : <Typography variant="h2">{t('notifications')}</Typography>}
// Fix: always h1 for screen title; use className for any size/position adjustments

// ❌ VIOLATION: screen title has no bottom-margin class — spacing left to chance
<Typography variant="h1">{t('profileHeading')}</Typography>
<SomeFirstSection />
```

### Form error handling (Web)

Two distinct error types require two distinct display patterns:

| Error type | When | Display |
|---|---|---|
| **Field validation** (Zod / react-hook-form) | Before/on submit, field-level | Inline below the field via `<FormField error={…} />` — required by WCAG |
| **API / submission errors** | After a failed server call | `notify(message, 'error', uiConfig.toast.errorDurationMs)` toast |

**Rules:**

- Never add an `error` prop to form shell components (`EntityFormShell`, etc.) for API errors — use `notify` in the mutation's `onError` callback
- Never show API errors inline in the form body — they belong in a toast so they are visible above modals and other overlays
- Never show field validation errors as toasts — they must be inline and associated with their input (WCAG `aria-describedby`)

```tsx
// VIOLATION: API error shown as inline banner in the form shell
<EntityFormShell error={apiError}>...</EntityFormShell>

// VIOLATION: field validation error shown as a toast (not associated with the input)
notify(errors.name?.message, 'error', 3000);

// CORRECT: field validation inline, API error as toast
<FormField label="Name" error={errors.name?.message}>
  <TextBox ... />
</FormField>

// in mutation callback:
onError: () => notify('Failed to save. Please try again.', 'error', uiConfig.toast.errorDurationMs),
```

### Localization copy — hard law

**Every UI-visible string MUST use `useTranslation()`.**
Hardcoded English strings in component JSX or Zod validation messages are a violation. There are no exceptions.

```tsx
// ❌ VIOLATION: hardcoded string in JSX
<Typography variant="h1">Sign in</Typography>

// ❌ VIOLATION: hardcoded Zod validation message
const schema = z.object({ email: z.string().email('Enter a valid email address.') });

// ✅ CORRECT: all strings from the locale file
const { t } = useTranslation('auth');
<Typography variant="h1">{t('login.title')}</Typography>

// ✅ CORRECT: Zod schema defined inside the component so t() is available
const schema = z.object({ email: z.string().email(t('login.emailError')) });
```

**Locale files live in** `src/lib/i18n/locales/en-ZA/<namespace>.json`.
When you add a new feature, add a new namespace JSON file and register it in `src/lib/i18n/index.ts` and `src/lib/i18n/i18n.d.ts`.
Each feature's presentation layer must also have a `<feature>.copy.ts` file exporting `<FEATURE>_TEST_IDS` for `testID` props.

- Localization files must store **neutral, sentence-case content only** — never bake in presentation styling
- Do **not** encode casing in translations for visual effect; use Tailwind `uppercase`, `lowercase`, or `capitalize` classes in the component
- Do **not** add decorative whitespace, line breaks, or punctuation to locale strings just to influence layout
- This applies to **all** strings: labels, headings, button text, list items — everything starts lowercase or sentence-case

**Why this matters:** If casing is hardcoded in the locale file, changing the UI style later requires editing translations. Keeping casing in the component layer means a single `className` change affects all languages at once.

```tsx
// ❌ VIOLATION: ALL CAPS encoded in locale (cannot change without editing translations)
{ "rewardsLabel": "REWARDS", "topicsHeading": "LEARNING TOPICS FOR THE DAY" }

// ❌ VIOLATION: Title case baked in (breaks re-use if heading style changes)
{ "pageTitle": "User Profile Settings" }

// ✅ CORRECT: neutral, lowercase/sentence-case in locale
{ "rewardsLabel": "Rewards", "topicsHeading": "Learning topics for the day", "pageTitle": "User profile settings" }

// ✅ CORRECT: casing applied in component via className
<Typography variant="label" className="uppercase">
  {t('labels:rewardsLabel')}
</Typography>

<Typography variant="h2" className="capitalize">
  {t('headings:pageTitle')}
</Typography>

// ✅ CORRECT: StatBlock example — locale has neutral text, component applies uppercase
// Locale: { "streakLabel": "Streak" }
// Component:
<Typography variant="caption" className="uppercase text-text-secondary">
  {label}
</Typography>
```

### Conditional rendering — hard law

- Do **not** use inline JSX ternary operators for conditional rendering
- If the false branch means "render nothing", use `condition && <Component />`
- If both branches are meaningful, move the decision outside JSX into a variable, helper function, or extracted component
- Never render placeholder elements such as empty `<View />`, empty fragments, or spacer wrappers just to satisfy a false branch

```tsx
// VIOLATION: inline ternary with a fake fallback element
{right ? <AchievementCard title={right.title} /> : <View />}

// CORRECT: render only when the item exists
{right && <AchievementCard title={right.title} />}

// VIOLATION: large inline branch logic in JSX
{isLoading ? <LoadingState /> : <Content items={items} />}

// CORRECT: decide before returning JSX
const body = isLoading ? <LoadingState /> : <Content items={items} />;

return <View>{body}</View>;
```

#### React 19 `<Activity>` for show/hide transitions

When you need to **keep a component tree mounted but visually hidden** (e.g. tab content staying alive while another tab is active), prefer React 19's `<Activity>` component over conditional unmounting:

```tsx
import { unstable_Activity as Activity } from 'react';

// PREFERRED — tree stays mounted, no remount cost when switching tabs
<Activity mode={isActive ? 'visible' : 'hidden'}>
  <ExpensiveTabContent />
</Activity>

// AVOID for show/hide — unmounts and remounts the tree every time
{isActive && <ExpensiveTabContent />}
```

`<Activity mode="hidden">` keeps the subtree alive in memory but does not render to screen. Use it for **performance-sensitive** show/hide (navigation tabs, slide-over panels). For simple conditional content (loading states, error banners) the variable-outside-JSX pattern above is sufficient.

## Imports (4-group order, enforced)

```ts
import { useState } from 'react';                    // 1. External libs
import { View } from 'react-native';

import { UserCard } from '@/components/ui';          // 2. Internal (@/ or @alias/)
import { useAuth } from '@features/auth/...';

import type { User } from '@features/auth/...';     // 3. Type-only imports

import { colors } from '@/constants/tokens';        // 4. Constants
```

### Path aliases — hard rule

- Within a feature slice, **never use relative imports** (`../` or `../../`) — always use
  `@features/<name>/...` path aliases for any import that crosses a folder boundary
- Within `apps/web`, use `@/` for anything outside a feature (`@/components/ui`, `@/lib/...`)
- Within `apps/expo`, use `@features/`, `@lib/`, `@store/` aliases; use `@/` only for files
  under `apps/expo/` not covered by the other aliases
- **`useTranslation`** must be imported from `@lib/i18n` — never from `@/src/lib/i18n` or a
  relative path
- **`cn()`** (expo) must be imported from `@/src/lib/cn` — never from `@starterkit/shared/lib/cn`

```ts
// ❌ VIOLATION: relative import crossing feature layers
import { companyDatasource } from '../../infrastructure/datasources/company-datasource';

// ✅ CORRECT
import { companyDatasource } from '@features/companies/infrastructure/datasources/company-datasource';
```

## HTTP

- All datasources import `apiClient` from `@lib/http/api-client` — never create their own
- Services catch `ApiError` → throw domain `Failure` — HTTP errors never reach presentation
- `useMutation` for writes, `useQuery` for reads — never `useState + useEffect` for data fetching
- Token refresh on 401 uses a queue to prevent concurrent refresh races

## Proxy Layer (Auto-Generated)

- **Never hand-edit** files in `src/proxy/` — they are generated by Orval from committed OpenAPI schemas
- Regenerate with `npm run generate:proxy` (full) or `npm run generate:proxy:local` (schema already committed)
- Generated functions use the shared `apiClient` via `src/lib/http/orval-mutator.ts`
- When a backend endpoint changes, run `generate:proxy` and commit the updated schema + proxy together

### Proxy scope — hard rule (never cross)

- `apps/expo/src/proxy/` contains **MobileApi** endpoints **only**
- `apps/web/src/proxy/` contains **WebApi** endpoints **only**
- Each app's `orval.config.ts` enforces this by pointing to its own schema

### Datasource ↔ Proxy relationship

- Datasources (`infrastructure/datasources/`) are the **only** layer that imports from `src/proxy/`
- When a generated proxy function exists for an endpoint, the datasource **must** use it
- As soon as `generate:proxy` produces a function for an endpoint, swap the datasource and delete
  the hand-written DTO

### Proxy type safety — hard rule

The proxy-generated request models are the **single source of truth** for API contracts.
Datasources must never weaken them:

- **Never make a required proxy field optional** in the datasource method signature. If the proxy
  model says `categoryId: string`, the datasource must accept `categoryId: string` — not
  `categoryId?: string`.
- **Never coerce `undefined`/`null` into required fields** (e.g. `categoryId ?? null`). This
  silently passes invalid data and bypasses TypeScript's compile-time safety.
- **Never use raw `apiClient.post/get/put/delete`** when a generated proxy function exists.
  A Biome lint rule (`noRestrictedImports`) enforces this — importing `@lib/http` or
  `@lib/http/api-client` in any `infrastructure/datasources/` file is a lint error.
- **Response mapping is fine.** Datasources may map proxy response types into domain types with
  `?? null` / `?? 0` fallbacks for optional response fields — this is a read-side concern and
  does not weaken the API contract.

```ts
// VIOLATION: datasource weakens required proxy field
async startSession(assignmentId: string, categoryId?: string) {
  return await postApiGameSessions({ assignmentId, categoryId: categoryId ?? null });
}

// VIOLATION: raw apiClient call bypasses proxy
const { data } = await apiClient.post<{ customToken: string }>('/api/auth/microsoft/exchange', { idToken });

// CORRECT: datasource mirrors proxy's required fields exactly
async startSession(assignmentId: string, categoryId: string) {
  return await postApiGameSessions({ assignmentId, categoryId });
}

// CORRECT: uses generated proxy function
const data = await postApiAuthMicrosoftExchange({ idToken });
```

### Domain types — no duplication rule

- **Never hand-write a domain type that duplicates a proxy-generated model.** If a proxy type exists
  for the same shape, re-export it with a domain alias from `domain/types/`:

  ```ts
  // domain/types/my-feature.types.ts
  export type { TopicSummaryResponse as Topic } from '@/src/proxy/models/topicSummaryResponse';
  ```

- If the domain type needs a different shape (additional fields, optional variants, etc.), derive it
  from the proxy type using TypeScript utilities — never copy-paste:

  ```ts
  export type TopicCard = Pick<TopicSummaryResponse, 'id' | 'title'>;
  export type TopicWithExtra = TopicSummaryResponse & { isSelected: boolean };
  ```

- Hand-written types in `domain/types/` are **only** permitted when there is no proxy equivalent
  (e.g. a type used exclusively on the frontend, or a stub pending a future backend endpoint).
  Mark these with a `// TODO(<ticket>): derive from proxy once <endpoint> is generated` comment.

## State

- Server data → React Query cache (never duplicate in Zustand)
- Component-local state → `useState`
- Global client state → Zustand store in `src/store/`
- Form state → `react-hook-form` with Zod resolver
- Non-sensitive persistence → MMKV via Zustand `persist` middleware
- Sensitive persistence → expo-secure-store via `secureStorage` (auth tokens only)

### Pagination — server owns everything, client owns nothing

**Paging, filtering, and sorting MUST always be handled server-side via the backend API. Client-side alternatives are a violation — no exceptions.**

The backend exposes a consistent paginated `list()` contract on every collection endpoint:

```text
GET /api/<resource>?Page=1&PageSize=10&FilterText=...&SortBy=name&SortDescending=false
→ { items, totalCount, page, pageSize, hasNextPage }
```

This is wired into the frontend via `createGridStore` (DevExtreme grids) or directly via `useQuery` + `companyDatasource.list()`. Both paths delegate every operation — page number, page size, search text, sort column, sort direction — entirely to the server.

**Hard rules:**

- **Never slice, filter, or sort an in-memory array** to implement paging, search, or sorting on the frontend. This includes `Array.filter()`, `Array.sort()`, `Array.slice()`, `useMemo` chains, or any other client-side transform applied to an already-fetched list.
- **Never fetch a large page (e.g. `pageSize=500`) and page the results yourself** — that is client-side paging with extra network cost.
- `useCompanies`, `useDepartments`, or any React Query hook wrapping a list endpoint **must accept `page`, `pageSize`, `filterText`, and `sort` as params and forward them directly to the datasource.**
- The query key **must include all params** so React Query re-fetches automatically when any of them change: `queryKey: ['resource', 'list', params]`.
- After a create/update/delete mutation, invalidate using the list **prefix key** (`['resource', 'list']`), not a full key. This ensures all paginated variants are invalidated regardless of which page the user is on.
- `pageSize` state belongs in the calling component — not as a hardcoded default inside a hook or datasource.
- Datasource `list()` signatures must declare `page` and `pageSize` as **required** parameters — no default values.
- Grid constants (`allowedPageSizes`, `searchDebounceMs`) live in `apps/web/src/lib/ui-config.ts` — never hardcode them in components or datasources.

```ts
// ❌ VIOLATION: fetching 500 records and slicing client-side
export function useCompanies() {
  return useQuery({
    queryKey: ['companies', 'list-all'],
    queryFn: () => companyDatasource.list(1, 500),       // ← large fetch + client slice = violation
    select: (result) => result.items,
  });
}

// ❌ VIOLATION: client-side filtering in a useMemo
const filtered = useMemo(
  () => allCompanies.filter((c) => c.name.toLowerCase().includes(search)),
  [allCompanies, search],
);

// ❌ VIOLATION: client-side sort
const sorted = useMemo(
  () => [...filtered].sort((a, b) => a.name.localeCompare(b.name)),
  [filtered],
);

// ❌ VIOLATION: client-side pagination
const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

// ✅ CORRECT: all paging/filtering/sorting delegated to the server
export interface UseCompaniesParams {
  page: number;
  pageSize: number;
  filterText?: string;
  sort?: GridSortItem[];
}

export function useCompanies(params: UseCompaniesParams) {
  return useQuery({
    queryKey: ['companies', 'list', params] as const,    // params in the key → auto re-fetch
    queryFn: () =>
      companyDatasource.list(params.page, params.pageSize, params.filterText, params.sort),
    ...queryCacheConfig.list,
  });
}

// ✅ CORRECT: calling the hook from the page — state drives params
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [search, setSearch] = useState('');
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

const { data } = useCompanies({
  page: currentPage,
  pageSize,
  filterText: search.trim() || undefined,
  sort: [{ selector: 'name', desc: sortOrder === 'desc' }],
});

// ✅ CORRECT: mutation invalidates by prefix, not full key
onSuccess: () => {
  void queryClient.invalidateQueries({ queryKey: ['companies', 'list'] });
}
```

The backend controls pagination defaults (page size, max page size) via `PagingConstants`.
Frontend code must not set its own `pageSize` defaults.

**DevExtreme grid stores:** `createGridStore` already implements this correctly — it maps DX `loadOptions` (skip/take/sort/filter) directly to the backend's `page`/`pageSize`/`filterText`/`sort` parameters. Never replace a `createGridStore`-backed component with an in-memory alternative.

### React Query cache config — use named constants

Never inline raw millisecond values for `staleTime` / `gcTime`:

```ts
// ❌ VIOLATION
useQuery({ ..., staleTime: 120000, gcTime: 300000 });

// ✅ CORRECT
import { queryCacheConfig } from '@lib/http/query-config';
useQuery({ ..., ...queryCacheConfig.list });
```

Available presets: `profile`, `list`, `leaderboard`, `session`, `static`.

## Localization copy — hard law

**Every UI-visible string MUST use `useTranslation()`.** Hardcoded English strings in component
JSX or Zod validation messages are a violation. There are no exceptions.

```tsx
// ❌ VIOLATION
<Typography variant="h1">Sign in</Typography>

// ✅ CORRECT
const { t } = useTranslation('auth');
<Typography variant="h1">{t('login.title')}</Typography>
```

**Locale files** live in `src/lib/i18n/locales/en-ZA/<namespace>.json`.

- Locale strings must be **neutral, sentence-case** — never bake in ALL CAPS or Title Case for
  visual effect; apply casing via Tailwind `uppercase`, `lowercase`, or `capitalize` in the
  component
- Do not encode decorative whitespace, line breaks, or punctuation in locale strings

```tsx
// ❌ VIOLATION: casing encoded in locale
{ "rewardsLabel": "REWARDS" }

// ✅ CORRECT: neutral in locale, casing in component
{ "rewardsLabel": "Rewards" }
<Typography variant="label" className="uppercase">{t('labels:rewardsLabel')}</Typography>
```

## DRY — it is a law

- Shared logic → entity method or value object (not copy-pasted between services)
- Shared UI → `components/ui/` with CVA variants (not duplicated per feature)
- Shared types → `src/types/` (not re-declared per feature)
- If a Tailwind class combination appears on 2+ screens → extract to a shared component
- If a runtime color value is needed → import from `constants/tokens.ts`, never hardcode hex

### Config files — no magic numbers in feature code

| What | Where | Import |
|---|---|---|
| Toast durations, grid search debounce, UI timing | `apps/web/src/lib/ui-config.ts` | `import { uiConfig } from '@lib/ui-config'` |
| React Query `staleTime` / `gcTime` | `apps/web/src/lib/http/query-config.ts` | `import { queryCacheConfig } from '@lib/http/query-config'` |
| Product name, portal title | `packages/shared/src/lib/app-config.ts` | `import { appConfig } from '@starterkit/shared'` |
| Icon pixel sizes | `packages/shared/src/lib/tokens.ts` | `import { iconSize } from '@starterkit/shared'` |

## Testing — mandatory for all non-trivial files

**Tooling:**

- **Web (`apps/web`)**: Vitest + `@testing-library/react` + jsdom
- **Expo (`apps/expo`)**: Vitest + `@testing-library/react-native`
- **Shared (`packages/shared`)**: Vitest — pure logic only

**Rules (apply to all apps):**

- Tests in `__tests__/` mirroring source path exactly
- `describe/it` blocks — never bare `test()` calls
- Mock at the boundary: services mock repos, use-cases mock services, hooks mock use-cases
- Domain layer tests need no mocks (pure logic)
- **Every new file with logic gets a test file before the PR is merged — no exceptions**
- **Shared factories**: all test fixtures come from `test/factories/` — never define `makeUser()`
  or DTO fixtures inline
- **MSW integration tests**: datasource tests run against `test/mocks/handlers.ts` with MSW
- **Assertion rules**: `toBeTruthy()`/`toBeFalsy()` — never `toBe(true)`/`toBe(false)`

## E2E Testing — mandatory when a full frontend-to-backend flow exists

Any feature that completes a user-facing flow from the UI through to the backend API **must**
have E2E tests before the PR is merged.

### When E2E tests are required

A flow requires E2E tests when **all three** are true:

1. There is a screen/page the user interacts with
2. That interaction calls the backend API (not Firebase alone)
3. The result is visible in the UI (redirect, data rendered, toast, etc.)

| App | Suite | Location |
|---|---|---|
| Admin Portal (Next.js) | Playwright | `e2e/playwright/tests/<domain>/` |
| Mobile (Expo) | Maestro | `e2e/maestro/<domain>/` |

### Test structure for full flows

- **Happy path**: valid input → API succeeds → correct UI state
- **Server error path**: API returns error → correct error message/toast
- **Form validation** (if applicable): client-side errors fire before the network call

### Updating existing E2E tests

When you change any of the following, check `e2e/` and update:

| What changed | What to check |
|---|---|
| Screen/page route | All `goto()` calls and `toHaveURL()` assertions |
| `testID` on any interactive element | `e2e/playwright/selectors.ts` and `e2e/maestro/` YAML `id:` references |
| API response shape or status code | Assertions on toasts, redirects, or rendered data |
| Auth flow | `e2e/playwright/tests/auth/` and `e2e/maestro/auth/` |
| i18n key text in an assertion | Any `getByText()` or Maestro `assertVisible: text:` |

**Never rename a `testID` or change a route without searching `e2e/` first.**

## Adding a New Feature

### Feature structure (API features)

```text
features/<name>/
├── domain/
│   └── failures/           ← Typed error classes. Pure TS, no deps.
├── infrastructure/
│   └── datasources/        ← HTTP calls via proxy or apiClient.
│       └── *.dto.ts        ← Hand-written DTOs only when proxy doesn't cover it yet.
└── presentation/
    ├── hooks/              ← useQuery / useMutation wrapping the datasource.
    ├── screens/
    ├── components/
    └── utils/              ← Pure helpers (display formatting, initials, etc.).
```

**Rules:**

- The datasource is your repository — no separate `IRepository` interface or `RepositoryImpl`
- The hook is your use-case — no separate `UseCase` or `Service` class
- Error translation (`ApiError` → domain `Failure`) happens in the datasource, not a service
- DTOs stay inside the datasource file (or a sibling `*.dto.ts`) — they never leave infrastructure

### When extra layers are earned

Use `domain/entities/` and `application/services/` only when a feature has genuinely complex
business logic. The game features (crossword, fill-in-the-blank, etc.) are the reference example.
See `docs/standards/architecture.md` for the full rule.

### Steps

1. `/spec:new <feature-name>` — complete the SDW
2. Create `src/features/<name>/` with the 3-layer structure above
3. Use `src/features/auth/` as the reference implementation
4. Add the controller→datasource mapping row to `src/features/README.md`

## Spec-Driven Workflow (SDW)

**Never start implementing a feature without an approved spec.**

```text
/spec:new → /spec:requirements → /spec:approve requirements
         → /spec:design → /spec:approve design
         → /spec:tasks → /spec:approve tasks
         → /spec:implement
```
