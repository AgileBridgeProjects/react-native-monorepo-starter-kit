# Accessibility Implementation Guide — WCAG 2.1 AA

Companion to `docs/standards/non-functional-requirements.md` — Accessibility section.
Target: WCAG 2.1 Level AA on both `apps/web` (Next.js) and `apps/expo` (React Native).

---

## Web (`apps/web` — Next.js)

### Semantic HTML

Use landmark elements to define page regions:

```tsx
// CORRECT
<header>...</header>
<nav aria-label="Main navigation">...</nav>
<main id="main-content">...</main>
<footer>...</footer>

// VIOLATION: div soup with no landmarks
<div className="header">...</div>
<div className="nav">...</div>
<div className="content">...</div>
```

### Skip-to-main link

Add as the first focusable element in the root layout:

```tsx
// app/layout.tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-surface focus:p-sm focus:rounded-md"
>
  Skip to main content
</a>
```

### Keyboard navigation

- All interactive elements must be reachable via `Tab` key in logical order.
- Use `focus-visible:ring-2 focus-visible:ring-primary` Tailwind classes (not `:focus` alone).
- Never use `outline: none` or `outline: 0` without a custom focus indicator.
- Custom interactive elements that are not natively focusable must use `tabIndex={0}` and respond to `Enter` / `Space`.

### Colour contrast

- Normal text (< 18px, or < 14px bold): contrast ratio ≥ **4.5:1** against background.
- Large text (≥ 18px or ≥ 14px bold): contrast ratio ≥ **3:1**.
- UI component boundaries (borders, icons): ≥ **3:1** against adjacent colours.

Checking tools:

- Chrome DevTools → Accessibility → Inspect colour contrast
- [axe DevTools](https://www.deque.com/axe/) browser extension (run on every new page)
- Tailwind class `text-text` / `bg-surface` from design tokens already meet AA — never override with arbitrary hex values

### Form accessibility

```tsx
// CORRECT
<div>
  <label htmlFor="email" className="...">Email address</label>
  <input
    id="email"
    type="email"
    aria-describedby="email-error"
    aria-invalid={!!errors.email}
    {...register('email')}
  />
  {errors.email && (
    <span id="email-error" role="alert" className="text-error text-sm">
      {errors.email.message}
    </span>
  )}
</div>

// VIOLATION: input without label
<input placeholder="Email" type="email" />  // ← placeholder is not a label
```

Always use `<FormField>` from `@/components/ui` — it handles label + `aria-describedby` wiring automatically.

### Dynamic content and live regions

```tsx
// Toasts / notifications
<div aria-live="polite" aria-atomic="true">
  {toast && <p>{toast.message}</p>}
</div>

// Error messages that appear after user action
<p role="alert">{errorMessage}</p>  // role="alert" implies aria-live="assertive"
```

### Images

```tsx
// Informative image — describe the content
<Image src="/trophy.png" alt="Gold trophy awarded to top scorer" />

// Decorative image — empty alt hides it from screen readers
<Image src="/background-pattern.png" alt="" />

// VIOLATION: no alt attribute
<Image src="/trophy.png" />
```

### Modal / Dialog accessibility

```tsx
<dialog
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-description"
>
  <h2 id="dialog-title">Confirm deletion</h2>
  <p id="dialog-description">This action cannot be undone.</p>
  ...
</dialog>
```

Focus must be trapped inside the modal while it is open; return focus to the trigger element on close.
Use a focus-trap library (e.g. `focus-trap-react`) rather than hand-rolling the logic.

---

## Mobile (`apps/expo` — React Native)

### Required props on every interactive element

```tsx
// CORRECT
<Pressable
  accessible={true}
  accessibilityLabel="Add game to favourites"
  accessibilityRole="button"
  accessibilityHint="Double-tap to add this game to your favourites list"
  onPress={handleFavourite}
>
  <HeartIcon />
</Pressable>

// VIOLATION: no accessibility props
<Pressable onPress={handleFavourite}>
  <HeartIcon />
</Pressable>
```

### `accessibilityRole` values

| Element | Role |
|---|---|
| Button / Pressable | `"button"` |
| Link | `"link"` |
| Text input | `"none"` (label comes from `accessibilityLabel`) |
| Toggle / Switch | `"switch"` |
| Checkbox | `"checkbox"` |
| Heading | `"header"` |
| Image | `"image"` |
| Tab | `"tab"` |

### `accessibilityHint`

Use when the label alone does not describe the outcome:

```tsx
// Self-evident — no hint needed
<Button accessibilityLabel="Sign in" accessibilityRole="button" />

// Non-obvious outcome — add a hint
<Button
  accessibilityLabel="Like"
  accessibilityRole="button"
  accessibilityHint="Adds this game to your liked games list and updates your feed"
/>
```

### Touch target size (≥ 44 × 44 dp)

```tsx
// CORRECT: small icon with expanded hit area
<Pressable
  accessible={true}
  accessibilityLabel="Close"
  accessibilityRole="button"
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  className="p-xs"
  onPress={onClose}
>
  <XIcon size={20} />
</Pressable>

// CORRECT: minimum size enforced in className
<Pressable className="min-h-[44px] min-w-[44px] items-center justify-center">
  ...
</Pressable>
```

### Gesture-only handles

A drag handle with no discrete activation — a sheet grabber, a resize bar — is **decorative to
assistive tech**, not an unlabelled control. Give it `importantForAccessibility="no-hide-descendants"`
and `accessibilityElementsHidden`, and make sure the thing it does is reachable another way.

Do NOT give it `accessibilityRole="button"` and a label. There is no `onPress` behind it, so a
screen-reader double-tap does nothing; and the only name available is usually the sheet's own close
label, which its close control already answers to — two identically named targets is worse than
one hidden decoration. Apply it to whichever component owns the grabber.

### Dynamic Type / font scaling

```tsx
// VIOLATION: disables system font scaling
<Text allowFontScaling={false} style={{ fontSize: 16 }}>...</Text>

// VIOLATION: hardcoded fontSize outside of design tokens
<Text style={{ fontSize: 16 }}>...</Text>

// CORRECT: design-token class, scaling enabled by default
<Typography variant="body">...</Typography>
```

Never set `allowFontScaling={false}`. Never use `maxFontSizeMultiplier` below 1.3
unless layout absolutely requires it (document the exception in the component file).

### Colour — don't rely on colour alone

```tsx
// VIOLATION: colour-only status indication
<View className={isOnline ? "bg-success" : "bg-error"} />

// CORRECT: colour + icon + label
<View className={isOnline ? "bg-success" : "bg-error"}>
  <Icon name={isOnline ? "check" : "x"} />
  <Typography variant="caption">{isOnline ? "Online" : "Offline"}</Typography>
</View>
```

### `accessibilityState` for dynamic states

```tsx
<Pressable
  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
  accessibilityRole="button"
  ...
>
```

---

## Per-Component Accessibility Checklist

Copy into your PR description for every new UI component:

```text
Accessibility checklist:
- [ ] accessibilityLabel set on all interactive elements
- [ ] accessibilityRole set appropriately
- [ ] accessibilityHint added where outcome is non-obvious
- [ ] Touch targets are ≥ 44 × 44 dp (hitSlop or min-h/w className)
- [ ] Colour contrast ≥ 4.5:1 verified (use DevTools / axe)
- [ ] Status/state not conveyed by colour alone
- [ ] allowFontScaling not disabled; font sizes from design tokens only
- [ ] (Web) All inputs have associated <label> / htmlFor
- [ ] (Web) Dynamic updates use aria-live or role="alert"
- [ ] (Web) Keyboard focus visible and navigable in logical order
```

---

## Screen Reader Testing

### iOS — VoiceOver

1. Settings → Accessibility → VoiceOver → On (or triple-click Home / Side button)
2. Swipe right to navigate elements, double-tap to activate
3. Verify: element is announced, label is meaningful, role is correct
4. Test every new screen before PR

### Android — TalkBack

1. Settings → Accessibility → TalkBack → On
2. Swipe right to navigate, double-tap to activate
3. Explore by touch: drag finger to hear elements under finger
4. Verify same criteria as VoiceOver

### Web — screen reader

- macOS: VoiceOver (Cmd + F5)
- Windows: NVDA (free) or Narrator
- Test with Chrome + NVDA as the most common combination
