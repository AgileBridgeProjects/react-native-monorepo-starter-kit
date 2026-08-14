# Design System

Design values are defined in two independent sources:

1. **`global.css`** — CSS-first token definitions via Tailwind v4's `@theme` directive. Uniwind uses these to generate utility classes (`bg-primary`, `p-md`, etc.).
2. **`constants/tokens.ts`** — TypeScript runtime values for programmatic access (React Navigation theme, Reanimated, shadows). These are self-contained and do **not** derive from `global.css`.

## Token Sources

```text
global.css @theme block  →  Uniwind  →  utility classes (bg-primary, p-md, text-lg, etc.)
constants/tokens.ts      →  runtime JS access (theme.ts, shadows, animations)
```

Tailwind v4 uses a CSS-first configuration model. All token definitions live in `global.css`:

- **`@theme { }`** — palette colors, spacing, font sizes, border radii
- **`@layer theme { :root { @variant light/dark { } } }`** — semantic color variables per color scheme
- **`@source`** — tells Uniwind where to scan for class usage (monorepo paths)

Adding a new token to the `@theme` block makes it available as a Tailwind class — no separate config file needed.

---

## Colors

> **Mobile only.** The tables below describe `apps/expo`. The admin portal carries a separate
> identity (volt `#aaff00` on onyx black, dark-only) from its own primitive ramps — see
> `docs/standards/frontend-web.md` § *Two brands, one primitive file*. Do not apply these
> values to `apps/web`.

### Brand Palette

| Token | Value | Use |
|---|---|---|
| `primary-500` | `#2C2C2C` | Primary charcoal (light mode) |
| `primary-50` | `#F0F0F0` | Primary off-white (dark mode) |
| `accent-500` | `#757575` | Mid-gray accent / highlights |

### Semantic Colors

Use semantic names in components — never raw palette values. The theme adapts these for light/dark automatically.

| Semantic Token | Light | Dark | Use |
|---|---|---|---|
| `text` | `#212121` | `#FAFAFA` | Primary text |
| `text-secondary` | `#757575` | `#BDBDBD` | Supporting text |
| `text-muted` | `#BDBDBD` | `#757575` | Placeholders, disabled |
| `background` | `#FFFFFF` | `#121212` | Page background |
| `surface` | `#FAFAFA` | `#212121` | Cards, sheets |
| `surface-elevated` | `#FFFFFF` | `#424242` | Modals, dropdowns |
| `border` | `#EEEEEE` | `#424242` | Default borders |
| `border-strong` | `#E0E0E0` | `#616161` | Emphasis borders |
| `primary` | `#2C2C2C` | `#F0F0F0` | Buttons, links, active |
| `primary-foreground` | `#FFFFFF` | `#212121` | Text on primary bg |
| `icon` | `#757575` | `#9E9E9E` | Default icons |
| `icon-active` | `#2C2C2C` | `#F0F0F0` | Active/selected icons |

### Status Colors

| Token | Value | Use |
|---|---|---|
| `success` | `#4CAF50` | Success states |
| `warning` | `#FF9800` | Warning states |
| `error` | `#F44336` | Error states, destructive |
| `info` | `#2196F3` | Info, neutral notifications |

### Usage in components

```tsx
// Correct — semantic tokens via Uniwind classes
<View className="bg-surface border border-border rounded-lg">
  <Text className="text-text">Primary content</Text>
  <Text className="text-text-secondary">Supporting info</Text>
</View>

// Wrong — hardcoded values
<View style={{ backgroundColor: '#FAFAFA' }}>
```

---

## Spacing

All spacing comes from the scale below. Use as Tailwind utilities (`p-`, `m-`, `gap-`, etc.).

| Token | px | Tailwind class examples |
|---|---|---|
| `xs` | 4 | `p-xs` `mt-xs` `gap-xs` |
| `sm` | 8 | `p-sm` `mx-sm` |
| `md` | 16 | `p-md` `px-md` (default page padding) |
| `lg` | 24 | `p-lg` `py-lg` |
| `xl` | 32 | `p-xl` |
| `2xl` | 48 | `p-2xl` |
| `3xl` | 64 | `p-3xl` |

```tsx
// Correct
<View className="px-md pt-lg gap-sm">

// Wrong — Tailwind default scale (not our tokens)
<View className="px-4 pt-6 gap-2">
```

---

## Typography

### Font Sizes

| Token | px | Tailwind class |
|---|---|---|
| `xs` | 12 | `text-xs` |
| `sm` | 14 | `text-sm` |
| `base` | 16 | `text-base` |
| `lg` | 18 | `text-lg` |
| `xl` | 20 | `text-xl` |
| `2xl` | 24 | `text-2xl` |
| `3xl` | 30 | `text-3xl` |
| `4xl` | 36 | `text-4xl` |

### Font Weights

| Token | Value | Tailwind class |
|---|---|---|
| `normal` | 400 | `font-normal` |
| `medium` | 500 | `font-medium` |
| `semibold` | 600 | `font-semibold` |
| `bold` | 700 | `font-bold` |

### Common text patterns

Use the `<Typography>` component from `components/ui/` — never raw `<Text>` with heading/body classes:

```tsx
// Page title
<Typography variant="h1">Title</Typography>

// Section heading
<Typography variant="h3">Heading</Typography>

// Body text
<Typography variant="body">Body</Typography>

// Supporting / caption
<Typography variant="caption">Caption</Typography>

// Label
<Typography variant="label">Email</Typography>
```

See the **Typography** section under **Component Library** below for the full variant table.

---

## Border Radius

| Token | px | Tailwind class |
|---|---|---|
| `none` | 0 | `rounded-none` |
| `sm` | 4 | `rounded-sm` |
| `md` | 8 | `rounded-md` |
| `lg` | 12 | `rounded-lg` |
| `xl` | 16 | `rounded-xl` |
| `2xl` | 20 | `rounded-2xl` |
| `full` | 9999 | `rounded-full` |

Standard usage: `rounded-2xl` for grouped cards, `rounded-md` for inputs, `rounded-full` for
pills, chips and avatars.

### Nesting rounded corners — the concentric rule

When a rounded element sits **inside** another rounded element, the two radii are not
independent. Apple's grouped-list styling keeps them *concentric*, so a constant-width band of
the outer surface shows around the inner element:

```text
R_inner = R_outer − padding          (equivalently R_outer = R_inner + padding)
```

Get it wrong and it reads as a mistake even if you can't name why: when `R_inner` is **too
large** the corner band pinches toward zero; when it's **too small** the inner element looks
squarer than its container.

**This only binds when the inner element reaches the outer corner.** A pill that is inset and
vertically centred in a row — the "Update"/"Open" buttons in Apple's App Store, our unread
count pill — has no corner relationship with the card, so its capsule shape is unconstrained.
That is *why* Apple insets those buttons rather than resizing them.

Worked examples against our tokens (card = `rounded-2xl`, 20px):

| Card padding | Required inner radius | Class |
|---|---|---|
| `p-sm` (8) | 12 | `rounded-lg` |
| `p-md` (16) | 4 | `rounded-sm` |
| `p-lg` (24) | −4 → impossible | use `rounded-none`, or drop to `p-md` |

So for an edge-hugging child (a full-bleed image, a nested card, a pressed-row highlight that
spans the padding), pair `p-md` with `rounded-sm`, or `p-sm` with `rounded-lg`. `p-lg` leaves no
radius budget at all — with 24px of padding inside a 20px corner, the child should be square.

**Corner-anchored pills are the case to avoid.** A 40px-tall pill is a 20px radius; anchored in
a corner with `p-md` it would demand a `20 + 16 = 36px` card radius — larger than any token we
have. Inset the pill instead of inflating the card or shrinking the button.

---

## Shadows

Shadows are applied via runtime styles (Uniwind doesn't support RN shadow props as classes). Import from `constants/tokens.ts`:

```tsx
import { shadows } from '@/constants/tokens';

<View style={shadows.md} className="bg-surface rounded-lg p-md">
```

| Token | Use |
|---|---|
| `shadows.sm` | Subtle lift (inputs, chips) |
| `shadows.md` | Cards, floating elements |
| `shadows.lg` | Modals, sheets |

---

## Z-Index

| Token | Value | Use |
|---|---|---|
| `base` | 0 | Default |
| `dropdown` | 10 | Dropdowns, tooltips |
| `sticky` | 20 | Sticky headers |
| `overlay` | 30 | Overlay backgrounds |
| `modal` | 40 | Modals, dialogs |
| `toast` | 50 | Toast notifications |

Use via runtime styles: `import { zIndex } from '@/constants/tokens'`.

---

## Adding New Tokens

1. Add the CSS variable to the `@theme { }` block in `global.css` (this makes it available as a Tailwind class)
2. If the token is a semantic color, add it to the `@layer theme` light/dark `@variant` blocks
3. Add the runtime value to `constants/tokens.ts` for programmatic access
4. Use the semantic name, not the raw value, in components
5. Document the new token in this file

Never add one-off values inline — if you need a value, it belongs in the token system.

---

## Component Library (`components/ui/`)

All reusable UI primitives live in `components/ui/` with a barrel export at `components/ui/index.ts`. Import from the barrel:

```tsx
import { Button, Input, FormField, Alert } from '@/components/ui';
```

### Variant system (CVA + cn)

Components use **class-variance-authority** (CVA) for variant definitions and `cn()` from `@/src/lib/cn` for class merging. Every component with visual variants must use this pattern:

```tsx
import { cva } from 'class-variance-authority';
import { cn } from '@/src/lib/cn';

const myVariants = cva('base-classes', {
  variants: {
    variant: { primary: '...', secondary: '...' },
    size: { sm: '...', md: '...', lg: '...' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});
```

### Button

Variant-driven button with loading state and accessibility baked in.

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `primary \| secondary \| outline \| ghost \| destructive` | `primary` | Visual style |
| `size` | `sm \| md \| lg` | `md` | Size tier |
| `fullWidth` | `boolean` | `false` | Stretches to container width |
| `loading` | `boolean` | `false` | Shows spinner, disables press |
| `disabled` | `boolean` | `false` | Disables press |

Press feedback (`active:opacity-80`) is built in — no manual handling required.

```tsx
<Button variant="primary" size="lg" fullWidth onPress={submit} loading={isPending}>
  Sign in
</Button>
```

### Input

Text input with optional label, error state, hint text, and focus border highlight.

| Prop | Type | Description |
|---|---|---|
| `label` | `string?` | Label text above the input |
| `error` | `string?` | Error message below; turns border red |
| `hint` | `string?` | Helper text (hidden when error is shown) |

```tsx
<Input label="Email" error={errors.email} placeholder="you@example.com" />
```

### FormField

Connects `Input` to `react-hook-form` — eliminates boilerplate `Controller` wrappers.

```tsx
<FormField control={control} name="email" label="Email" placeholder="you@example.com" />
```

### Alert

Dismissable inline alert for form-level or page-level messages. Renders nothing when `message` is nullish.

| Variant | Use |
|---|---|
| `error` | Form submission errors, validation failures |
| `warning` | Non-blocking warnings |
| `info` | Informational messages |
| `success` | Success confirmations |

```tsx
<Alert message={errorMessage} variant="error" />
```

### Typography

Themed text component with semantic variants. Prevents duplicating heading/body/caption classes across screens.

| Variant | Maps to |
|---|---|
| `h1` | `text-4xl font-bold text-text` |
| `h2` | `text-3xl font-bold text-text` |
| `h3` | `text-2xl font-semibold text-text` |
| `h4` | `text-xl font-semibold text-text` |
| `body` (default) | `text-base font-normal text-text` |
| `body-sm` | `text-sm font-normal text-text` |
| `label` | `text-sm font-medium text-text-secondary` |
| `caption` | `text-xs font-normal text-text-muted` |

```tsx
<Typography variant="h1" className="mb-2xl">Sign in</Typography>
<Typography variant="label">Email</Typography>
<Typography variant="caption">Optional field</Typography>
```

### Creating new components

1. Define variants with CVA in the component file
2. Export the component (named export) + variant function + props interface
3. Accept a `className` prop and merge with `cn()` so consumers can override
4. Add to `components/ui/index.ts` barrel
5. Write tests in `__tests__/components/ui/`
