# Frontend Coding Conventions — Mobile (`apps/expo`) — The Law

> **Shared rules** (imports, DRY, HTTP, state, testing, feature structure, localization) live in
> `docs/standards/frontend.md`. This file covers **Expo/mobile-only** conventions.
>
> **App Store compliance** — every PR touching `apps/expo/` must be reviewed against all three
> store guidelines. See [docs/apple-app-store-review.md](../apple-app-store-review.md),
> [docs/google-play-store-review.md](../google-play-store-review.md), and
> [docs/huawei-appgallery-review.md](../huawei-appgallery-review.md).

## Styling

- **NativeWind `className`** for **all** styling — never `StyleSheet.create()`, never `style={{}}`
  inline styles
- All values from `@starterkit/shared` tokens — no hardcoded hex, px, or font sizes
- Semantic token names: `text-text`, `bg-surface`, `border-border`
- **Never use a border token for text colour** — `text-border` and `text-border-strong` will
  almost certainly fail WCAG contrast. Use `text-text-secondary` or `text-text-muted`.
- Class merging: always use `cn()` from `@/src/lib/cn` — never template literals and never
  from `@starterkit/shared/lib/cn`
- Component variants: always use `cva()` from `class-variance-authority` — never if/else chains
- **Dynamic values**: use NativeWind arbitrary values — `w-[${value}%]`, `h-[${value}px]` —
  not inline styles

### Centralised design token system

All design tokens live in `packages/shared/` — the single source of truth.

| File | Purpose |
|---|---|
| `packages/shared/tokens.css` | CSS primitive variables (`--starterkit-*`) |
| `packages/shared/src/lib/tokens.ts` | TypeScript runtime primitives |

**Rules:**

- Import `@import '@starterkit/shared/tokens.css'` in `apps/expo/global.css`
- Runtime JS/TS (React Navigation theme, Reanimated worklets, platform shadows): import from
  `apps/expo/constants/tokens.ts` — never duplicate raw values in feature code
- **Icon sizes**: `import { iconSize } from '@starterkit/shared'` — never hardcode `16`, `20`, `28`, `48`
  - `iconSize.xs` = 16 px — compact UI elements (nav items, dense lists)
  - `iconSize.sm` = 20 px — standard inline icons (buttons, form fields)
  - `iconSize.md` = 28 px — prominent action icons
  - `iconSize.lg` = 48 px — large display icons (empty states, achievements)
- **Product name / branding**: `import { appConfig } from '@starterkit/shared'` — never hardcode
  `"StarterKit"` or app titles

```tsx
// ❌ VIOLATION: hardcoded icon size
<Ionicons name="close" size={16} />

// ✅ CORRECT
import { iconSize } from '@starterkit/shared';
<Ionicons name="close" size={iconSize.xs} />
```

### Inline style exceptions (Expo only)

`style={{}}` is permitted **only** when all of the following are true:

1. The property has no Tailwind equivalent (e.g. `aspectRatio` with a runtime value, `transform`
   with calculated angles)
2. Multiple calculated properties must be applied together for a layout that cannot be expressed
   as static classes

Document the exception with a comment. If only `width` or `height` is dynamic, use an arbitrary
value class instead.

```tsx
// ❌ VIOLATION: inline style where Tailwind arbitrary value works
<View style={{ width: `${percentage}%` }} />

// ✅ CORRECT: NativeWind arbitrary value
<View className={cn('h-2 rounded-full bg-primary', `w-[${percentage}%]`)} />

// ✅ CORRECT EXCEPTION: absolute overlay with four calculated layout properties
// left/top/width/height all derived from grid dimensions; cannot be expressed as static classes
<Pressable
  style={{
    left: `${(cell.col / cols) * 100}%`,
    top: `${(cell.row / rows) * 100}%`,
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
  }}
/>
```

### Touch targets and breakpoints

- Use the shared `touch-target` utility class for tappable controls that must meet WCAG 44×44 px
- Do **not** repeat `min-h-[44px] min-w-[44px]` inline across components
- Prefer Tailwind responsive classes (`md:hidden`, `md:flex`, etc.) for layout/visibility
- Use `useBreakpoints()` only when the value is required in JavaScript logic (e.g. `FlatList`
  `numColumns`, algorithmic branching) — not just to show/hide UI that Tailwind can handle

```tsx
// ❌ VIOLATION
const { isTablet } = useBreakpoints();
{isTablet && <Sidebar />}
{!isTablet && (
  <Pressable className="min-h-[44px] min-w-[44px] items-center justify-center" />
)}

// ✅ CORRECT
<Sidebar className="hidden md:flex" />
<Pressable className="touch-target items-center justify-center md:hidden" />
```

## Components

- Functional components with TypeScript `interface` for props (`{ComponentName}Props`)
- **Named exports only** — no `export default` for reusable components
- Pages in `app/` use `export default` (Expo Router requirement only)
- File naming: `kebab-case.tsx` — Component naming: `PascalCase`
- **One component per file** — extract each non-trivial internal component into its own file
- Platform-specific: `.ios.tsx`, `.android.tsx`, `.web.tsx` suffixes
- **`components/ui/` is flat** — never create subfolders; every shared primitive goes directly in
  `components/ui/` with a barrel export in `index.ts`
- **Shared vs feature component placement** — a component starts in the feature folder where it
  is first needed. Promote to `components/ui/` when any two are true: (a) no feature-specific
  logic, (b) useful in a second unrelated feature, (c) a reviewer flags it as generic

### Always use shared components

Never hand-roll a button, input, alert, or heading:

- `<Button>` not a raw `<Pressable>` with manual text and style classes
- `<Input>` not raw `<TextInput>` with manual label/error logic
- `<FormField>` not `<Controller>` + `<TextInput>` boilerplate
- `<Alert>` not inline error `<View>` + `<Text>`
- `<Skeleton>` not raw `<ActivityIndicator>` for content/page loading states; shape it with
  `shape` and `className` to match the content being loaded
- `<Typography variant="h1">` not `<Text className="text-4xl font-bold text-text">`

**Async page/query states**: prefer a shared state wrapper (e.g. `AsyncStateView`) to handle
loading skeletons, error presentation, retry actions, and optional empty states. Screens should
not duplicate `if (isLoading)` / `if (isError)` boilerplate around every query.

**Expo page shells**: use the shared `PageScrollView` for scroll-based screens that need the
standard page title + optional intro copy + children layout.

### Expo screen heading standard

Every screen must have **exactly one `h1`**.

| Variant | Context |
|---|---|
| `h1` | Screen / page title — one per screen |
| `h2` | Major section within a screen |
| `h3` | Sub-section or card heading |
| `h4` | Inline label-level heading inside dense/card content |

**Spacing below the screen title (`h1`) before first content:**

| Context | Class | px |
|---|---|---|
| In-app screens (tab/stack navigation) | `mb-lg` | 24 px |
| Auth / onboarding screens | `mb-2xl` | 48 px |

**Alignment — hard rule: screen titles are centred.**

Every mobile screen heading uses `text-center uppercase text-white` on the app's
dark surfaces. A left-aligned screen title is a violation — it reads as a section
label rather than the page title, and it makes the screen look unrelated to every
other tab. Section headings (`h2`) inside a screen stay left-aligned; only the
screen `h1` is centred.

```tsx
// ✅ CORRECT — centred, uppercase screen title on a dark surface
<Typography variant="h1" className="mb-lg text-center uppercase text-white">
  {t('titles:nav.skills')}
</Typography>

// ❌ VIOLATION: left-aligned screen title
<Typography variant="h1" className="mb-lg uppercase text-white">{t('skills')}</Typography>
```

**No double header — hard rule: a screen with its own big `h1` gets an untitled
native header, never a titled one.**

Detail routes on the root stack (`app/_layout.tsx`'s `<Stack.Protected>` block)
normally set a `title` in `detailScreenOptions` so the platform's native header
shows the page name. But once a screen renders its OWN large in-page `h1` (the
pattern above, or a hero image carrying the title, as the Skill runner does),
a titled native bar on top of it repeats the same text twice — once in the
opaque/transparent chrome, once in the content. Set `title: ''` on that route's
`<Stack.Screen>` instead: the native header (and its back button) still
renders, it just carries no text of its own.

```tsx
// ✅ CORRECT — the screen owns the title, so the native header stays untitled
<Stack.Screen
  name="(detail)/skills/[categoryId]"
  options={{ ...detailScreenOptions, title: '' }}
/>

// ❌ VIOLATION: native title duplicates the screen's own big h1
<Stack.Screen
  name="(detail)/skills/[categoryId]"
  options={{ ...detailScreenOptions, title: t('titles:nav.skills') }}
/>
```

A screen is one or the other, never both: either it relies on the native
header's title (no in-page `h1` needed beyond what the header already shows),
or it renders its own `h1`/hero and the native header stays untitled.

One carve-out: a screen that must intercept EVERY exit (the Skill runner's
abandon confirmation) may use `headerShown: false` and draw its own close
control instead — an untitled native header would still offer a back button
that bypasses the interception. Pair it with a `beforeRemove` listener so the
hardware/gesture exits stay covered.

```tsx
// ✅ CORRECT — in-app tab screen
<Typography variant="h1" className="mb-lg">{t('profileHeading')}</Typography>

// ✅ CORRECT — auth/onboarding screen
<Typography variant="h1" className="mb-2xl">{t('login.title')}</Typography>

// ❌ VIOLATION: wrong variant for screen title
<Typography variant="h3">{t('titles:rewards')}</Typography>

// ❌ VIOLATION: no bottom-margin class
<Typography variant="h1">{t('profileHeading')}</Typography>
<SomeFirstSection />
```

### Conditional rendering — hard law

- Do **not** use inline JSX ternary operators for conditional rendering
- If the false branch means "render nothing", use `condition && <Component />`
- If both branches are meaningful, move the decision outside JSX into a variable or helper

```tsx
// ❌ VIOLATION: inline ternary with a fake fallback
{right ? <AchievementCard title={right.title} /> : <View />}

// ✅ CORRECT
{right && <AchievementCard title={right.title} />}

// ❌ VIOLATION: large inline branch in JSX
{isLoading ? <LoadingState /> : <Content items={items} />}

// ✅ CORRECT: decide before returning JSX
const body = isLoading ? <LoadingState /> : <Content items={items} />;
return <View>{body}</View>;
```

#### React 19 `<Activity>` for show/hide transitions

When you need to **keep a component tree mounted but visually hidden** (e.g. tab content staying
alive while another tab is active), prefer React 19's `<Activity>` over conditional unmounting:

```tsx
import { unstable_Activity as Activity } from 'react';

// ✅ PREFERRED — tree stays mounted, no remount cost when switching tabs
<Activity mode={isActive ? 'visible' : 'hidden'}>
  <ExpensiveTabContent />
</Activity>

// ❌ AVOID for show/hide — unmounts and remounts every time
{isActive && <ExpensiveTabContent />}
```

## Haptics — hard law

**Never call `expo-haptics` directly in components or hooks.** All haptic feedback must go
through the shared util at `apps/expo/src/lib/utils/haptics.ts`.

```ts
// ❌ VIOLATION: raw expo-haptics import in a component
import * as Haptics from 'expo-haptics';
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
Haptics.selectionAsync();

// ✅ CORRECT: named function from the shared util
import { hapticLight, hapticSelection } from '@lib/utils/haptics';
hapticLight();
hapticSelection();
```

### Haptic intent guide

Pick the function that matches the user's **intent**, not the underlying vibration strength:

| Function | Intent | Example usage |
|---|---|---|
| `hapticLight` | Drag start, minor tap confirmation | Pan gesture `.onStart`, toggle a switch |
| `hapticMedium` | Item placed / partial completion | Chip dropped on a zone, partial fill |
| `hapticHeavy` | Strong / destructive confirmation | Irreversible delete, hard commit |
| `hapticSelection` | Navigation tick, hover over drop zone | Dragging over a new zone, picker scroll |
| `hapticSuccess` | All correct / game complete | All blanks filled, quiz passed |
| `hapticWarning` | Soft alert / needs attention | Partial match, degraded-mode notice |
| `hapticError` | Incorrect answer, failed action | Wrong answer selected, destructive failure |

**Rules:**

- Never call haptics from Reanimated worklets — always wrap with `runOnJS`:
  `runOnJS(hapticLight)()`
- Never fire haptics during render — only inside event handlers or `runOnJS` callbacks
- Never add a new raw `expo-haptics` call; add a named export to `haptics.ts` with a JSDoc
  comment explaining the intent, then import that export everywhere

## Drag-and-Drop Gestures — hard law

All drag-and-drop interactions use the **`DraggableOptionChip`** shared component from
`apps/expo/src/features/games/presentation/components/draggable-option-chip.tsx`. Never
duplicate the gesture, ghost, or animation logic in a feature component.

```tsx
// ❌ VIOLATION: local gesture + ghost in a feature component
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle } from 'react-native-reanimated';
// ... 80 lines of pan-gesture + ghost style boilerplate ...

// ✅ CORRECT
import {
  AnimatedView,
  DraggableOptionChip,
  useGhostStyle,
} from '@features/games/presentation/components/draggable-option-chip';
```

### DraggableOptionChip props quick-ref

| Prop | Required | Default | Notes |
|---|---|---|---|
| `chipId` | ✅ | — | Unique chip identifier |
| `label` | ✅ | — | Display text |
| `isConsumed` | ✅ | — | `true` when placed/used — stays in layout but invisible |
| `isActive` | ✅ | — | `true` while this chip is being dragged |
| `ghostX / ghostY` | ✅ | — | `SharedValue<number>` from `useSharedValue` in the parent card |
| `cardPageX / cardPageY` | ✅ | — | Absolute page position of the card container |
| `ghostHalfWidth` | — | `60` | Half of chip width — centres ghost under finger (120 px chip default) |
| `ghostHalfHeight` | — | `20` | Half of chip height — centres ghost under finger (40 px chip default) |
| `className` | — | — | NativeWind classes for chip size/layout, e.g. `"h-10 w-[120px]"` |
| `onDragStart` | ✅ | — | `(chipId, label) => void` |
| `onDragChange` | ✅ | — | `(absX, absY) => void` |
| `onDragEnd` | ✅ | — | `(chipId, absX, absY) => void` |

### Ghost chip rendering

Use `useGhostStyle` + the exported `AnimatedView` for the floating ghost that follows the finger:

```tsx
const ghostStyle = useGhostStyle(ghostX, ghostY);

{draggingChip && (
  <AnimatedView
    pointerEvents="none"
    style={[
      ghostStyle,
      { elevation: 10, shadowOpacity: 0.2, shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }, shadowColor: '#000' },
    ]}
    className="h-10 w-[120px] items-center justify-center rounded-full border-2 border-primary bg-surface"
  >
    <Typography variant="caption" className="font-black text-text">
      {draggingChip.label}
    </Typography>
  </AnimatedView>
)}
```

**Rules:**

- `ghostHalfWidth` / `ghostHalfHeight` must match the ghost chip's rendered size so it stays
  centred under the finger
- Always set `pointerEvents="none"` on the ghost
- `DRAG_MIN_DISTANCE = 4` (from the shared file) is the pan threshold — do not override it
- If a new game type needs a chip shape `className` cannot express, extend `DraggableOptionChip`
  with a new optional prop rather than creating a new component

## Lists And Scrolling

- Do **not** use `ScrollView` to render repeatable lists of data
- For vertical data lists, prefer `FlatList`; use `SectionList` for grouped data
- Use `ScrollView` only for short, mostly static content (forms, settings, detail screens)
- If a list can grow from API data, user-generated content, or pagination, use a virtualized list
- For multi-column lists, use `FlatList` with `numColumns` instead of `flexWrap` in a `ScrollView`

```tsx
// ❌ VIOLATION: mapped list inside ScrollView
<ScrollView>
  {items.map((item) => <RewardCard key={item.id} item={item} />)}
</ScrollView>

// ✅ CORRECT: virtualized list
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <RewardCard item={item} />}
/>

// ✅ CORRECT: multi-column
<FlatList data={items} numColumns={2} keyExtractor={(item) => item.id}
  renderItem={({ item }) => <RewardCard item={item} />}
/>
```

### `flex-1` on FlatList items — hard law

On React Native, `flex-1` compiles to `flexGrow: 1, flexShrink: 1, flexBasis: 0`.
The `flexBasis: 0` collapses FlatList item height to zero during re-renders, causing
items to disappear (especially noticeable when filtering/searching).

**Never apply `flex-1` directly to a FlatList `renderItem` root element on native.**

- For multi-column equal-width items, wrap in a `<View className="flex-1">` **inside
  `ResponsiveGrid`** (already done) — not on the consumer's component.
- For multi-column equal-height items, use `md:h-full` on the card and
  `alignItems: 'stretch'` on the `columnWrapperStyle`.
- On single-column mobile, let items size to content — do not force equal heights.

```tsx
// ❌ VIOLATION: flex-1 on native FlatList item — collapses during re-renders
renderItem={({ item }) => <TopicCard className="flex-1" topic={item} />}

// ✅ CORRECT: ResponsiveGrid handles the flex-1 wrapper internally
// Card uses md:h-full for equal height only on tablet/desktop
<Pressable className="… md:h-full">
```

## Testing (Mobile-specific)

**Tooling:** Vitest + `@testing-library/react-native`. Run with `npm run test` from `apps/expo/`.

- Tests in `__tests__/` mirroring source path exactly
- `describe/it` blocks — never bare `test()` calls
- **Shared factories**: all test fixtures come from `test/factories/` — never define inline
- **Global mocks**: RN, Expo, MMKV, and expo-secure-store mocks live in `test/setup.ts` —
  never re-declare per file
- **Assertion rules**: `toBeTruthy()`/`toBeFalsy()` — never `toBe(true)`/`toBe(false)`

| File type | What to cover |
|---|---|
| Screen component | Key elements render; interaction handlers fire; loading/error states |
| Presentation hook | State transitions; side-effects (haptics suppressed in tests) |
| Game logic hook | All progression states; edge cases (empty questions, overflow) |
| Utility / pure function | All branches; boundary values |

Mock `expo-haptics` in `test/setup.ts` — never let real haptic calls fire in tests.
