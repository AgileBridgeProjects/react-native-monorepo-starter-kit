# Frontend Coding Conventions — Web (`apps/web`) — The Law

> **Shared rules** (imports, DRY, HTTP, state, testing, feature structure, localization) live in
> `docs/standards/frontend.md`. This file covers **web-only** conventions.

## Styling

- **Tailwind CSS v4** `className` for all styling — never inline `style={{}}` attributes
- All values from `@starterkit/shared` tokens — no hardcoded hex, px, or font sizes
- Semantic token names: `text-text`, `bg-surface`, `border-border`
- **Never use a border token for text colour** — `text-border` and `text-border-strong` will
  almost certainly fail WCAG contrast. Use `text-text-secondary` or `text-text-muted`.
- Class merging: always use `cn()` from `@/lib/cn` — never template literals
- Component variants: always use `cva()` from `class-variance-authority` — never if/else chains
- **Web DevExtreme**: `<DevExtremeProvider>` is mounted in the root layout — all pages have DX
  available; DX components are client-only (`'use client'`)

### Centralised design token system

All design tokens live in `packages/shared/` — the single source of truth.

| File | Purpose |
|---|---|
| `packages/shared/tokens.css` | CSS primitive variables (`--starterkit-*`) |
| `packages/shared/src/lib/tokens.ts` | TypeScript runtime primitives |

**Rules:**

- Use `@import '@starterkit/shared/tokens.css'` in `apps/web/src/app/globals.css`; reference
  `--starterkit-*` variables in semantic token definitions
- Runtime JS/TS values (React Navigation theme, etc.): import from `@starterkit/shared`
- **Icon sizes**: `import { iconSize } from '@starterkit/shared'` — never hardcode `16`, `20`, `28`, `48`
- **Product name / branding**: `import { appConfig } from '@starterkit/shared'` — never hardcode
  `"StarterKit"` or portal titles

```tsx
// ❌ VIOLATION: hardcoded icon size
<PhoneIcon size={20} />

// ✅ CORRECT
import { iconSize } from '@starterkit/shared';
<PhoneIcon size={iconSize.sm} />

// ✅ CORRECT: branding
import { appConfig } from '@starterkit/shared';
<title>{appConfig.adminPortalTitle}</title>
```

### Two brands, one primitive file

The portal and the mobile app do **not** share a colour identity. `packages/shared/tokens.css`
holds both palettes as disjoint primitive ramps; each app's semantic layer picks one.

| Surface | Identity | Primitive ramps | Semantic layer |
|---|---|---|---|
| `apps/web` (admin portal) | starterkit.com — volt `#aaff00` on onyx black | `--starterkit-volt-*`, `--starterkit-onyx-*`, `--starterkit-admin-*` | `apps/web/src/app/globals.css` |
| `apps/expo` (mobile) | Figma "StarterKit" — Blue `#0a3d91` / Cyan `#3bd7f6` | `--starterkit-primary-*`, `--starterkit-accent-*` | `apps/expo/global.css` |

The split extends beyond colour: the portal's `--radius-*` maps to the near-square
`--starterkit-admin-radius-*` scale (2/4/6/8px — starterkit.com's aesthetic), while mobile keeps the
rounder `--starterkit-radius-*` Figma geometry. Use `rounded-sm|md|lg|xl` utilities as usual — the
mapping does the work. Don't hardcode a radius and don't use `--starterkit-radius-*` in web code.

**Rules:**

- **Never repoint an existing `--starterkit-*` primitive to rebrand.** `apps/expo/global.css` maps
  `--starterkit-primary-*` straight onto `--color-primary-*`, so editing that ramp silently
  restyles the mobile app. Add a new ramp instead.
- **Only `globals.css` may read a `--starterkit-*` colour primitive.** Components, DevExtreme
  overrides, and gradient classes use the `--color-*` semantic names, so a rebrand stays a
  single-file edit. (Non-colour primitives — radius, spacing — are fine to use directly.)
- Adding a value to `tokens.css` means adding it to `tokens.ts` in the same change.

### The portal is dark-only

There is no light theme and no theme toggle — the brand is defined on black, and a light
counterpart would be a second design system to maintain. `:root` in `globals.css` *is* the dark
theme and sets `color-scheme: dark` so native controls, scrollbars, and autofill follow.

If a light theme is ever needed, add a `html.light` block overriding the same `--color-*`
names — do not fork `globals.css`.

Consequences to respect when writing components:

- **`primary` is a bright colour.** Pair fills with `text-primary-foreground`, never
  `text-white` — white on volt is ~1.2:1. The same applies to `bg-success` and `bg-warning`.
- **`text-white` is only correct over a genuinely dark surface** — the sidebar, the auth hero,
  an image overlay. Over any token-driven fill, use `text-primary-foreground`.
- **A class that paints its own gradient owns its text colour** (see `.btn-gradient-cta`);
  callers must not pass one, or the pairing drifts from the background.
- **DevExtreme must stay on a dark base theme** (`dx.dark.css` in `devextreme-provider.tsx`).
  The DX stylesheet colours hundreds of widget internals that `globals.css` never overrides;
  a light base leaves those white no matter how many tokens are remapped.

## Components

- Functional components with TypeScript `interface` for props (`{ComponentName}Props`)
- **Named exports only** — no `export default` for reusable components
- Pages in `app/` use `export default` (Next.js App Router requirement only)
- File naming: `kebab-case.tsx` — Component naming: `PascalCase`
- **One component per file** — extract each non-trivial internal component into its own file
- **`components/ui/` is flat** — never create subfolders; every shared primitive goes directly in
  `components/ui/` with a barrel export in `index.ts`
- New shared components: define with CVA, export variant function + props type, add barrel
  export, add test

### Web button standard

**Never use a raw `<button>` element** in page or component files. Always use `<Button>` from
`@/components/ui`:

```tsx
// ❌ VIOLATION: raw <button>
<button type="button" onClick={onResend} className="text-primary underline-offset-4 hover:underline">
  Resend code
</button>

// ✅ CORRECT
<Button variant="ghost" type="button" onClick={onResend}>
  {t('auth:otp.resendButton')}
</Button>

// ✅ CORRECT: primary submit
<Button type="submit" fullWidth isLoading={isPending}>
  {t('auth:otp.submitButton')}
</Button>

// ✅ CORRECT: outlined secondary
<Button variant="outlined" onClick={onCancel}>
  {t('common:actions.cancel')}
</Button>
```

Variant guide:

- `variant="primary"` — primary call-to-action (submit, save, create)
- `variant="outlined"` — secondary action alongside a primary (Cancel, Back)
- `variant="ghost"` — low-emphasis in-flow actions (Resend, inline links styled as buttons)

Exceptions (raw `<button>` is only acceptable):

- Inside a design-system component in `components/ui/` that implements a button primitive
- Inside a third-party component integration where the library requires a native element

### Web "+ New" action button standard

**Always use `<NewButton>` from `@/components/ui`** for primary "create / add" actions on list
pages. Never hand-roll a `<Button>` with an inline `<AddIcon>` — the `<NewButton>` component
already wraps that pattern with consistent sizing, icon spacing, and i18n:

```tsx
// ❌ VIOLATION: hand-rolled add button
<Button variant="primary" onClick={handleOpen}>
  <AddIcon size={iconSize.xs} className="mr-1" />
  {t('button.add')}
</Button>

// ✅ CORRECT: use <NewButton>
<NewButton label={t('button.add')} onClick={handleOpen} />

// ✅ CORRECT: inside a PageHeader action slot (preferred pattern)
<PageHeader
  title={t('page.title')}
  action={<NewButton label={t('button.add')} onClick={handleOpen} />}
/>
```

### Web image upload standard

**Never build one-off file upload UI.** Use `<ImageUploadField>` from `@/components/ui`:

```tsx
// ❌ VIOLATION: inline file-input with custom preview logic
<input type="file" accept="image/*" onChange={…} className="hidden" />

// ✅ CORRECT
<ImageUploadField
  label={t('companies:form.logo.label')}
  id="company-logo-upload"
  isUploading={isUploading}
  previewUrl={previewUrl}
  onChange={handleFileChange}
  onRemove={handleRemove}
  accept="image/png,image/svg+xml"
  hint={t('companies:form.logo.hint')}
  previewAlt={t('companies:form.logo.previewAlt')}
/>
```

Feature-specific wrappers (e.g. `LogoUploadField`) should delegate to `<ImageUploadField>`
with pre-filled labels, accept types, and hint text.

### Web page heading and text standard

**Never use raw HTML heading or paragraph tags** in page components. Always use `<Typography>`.

```tsx
// ❌ VIOLATION: raw HTML heading
<h1 className="text-3xl font-bold text-text">Sign in</h1>

// ✅ CORRECT
<Typography variant="h1">{t('auth:phone.title')}</Typography>
<Typography variant="body">{t('auth:phone.subtitle')}</Typography>
```

## Add / edit dialogs

**Add and edit operations always share the same dialog component.** The component accepts an
optional entity prop (`department: Department | null`, `company: Company | null`, etc.).
When the prop is `null` the form opens in create mode (empty fields). When the prop is provided
the form opens in edit mode (pre-populated fields).

- One file per dialog — never split create and edit into separate components.
- The mode is derived internally: `const isEditMode = entity !== null`.
- Conditionally hide fields that do not apply in edit mode (e.g. a parent-selector shown only
  when creating) using `{!isEditMode && <FormField … />}`.
- Use the full shared schema for both modes; pre-populate hidden fields from the entity so
  validation always passes.
- The submit handler branches on `isEditMode` to call the correct mutation hook.
- `data-testid` should reflect the mode: `isEditMode ? 'edit-foo-drawer' : 'add-foo-drawer'`.

```tsx
// ❌ VIOLATION: two separate files
// add-department-dialog.tsx  ← create only
// edit-department-dialog.tsx ← update only

// ✅ CORRECT: one shared file
// department-dialog.tsx — handles both modes
interface DepartmentDialogProps {
  department: Department | null; // null = add mode, non-null = edit mode (pre-populated)
  …
}
const isEditMode = department !== null;
```

## Form error handling

| Error type | When | Display |
|---|---|---|
| **Field validation** (Zod / react-hook-form) | Before/on submit, field-level | Inline below the field via `<FormField error={…} />` |
| **API / submission errors** | After a failed server call | `notify(message, 'error', uiConfig.toast.errorDurationMs)` toast |

```tsx
// ❌ VIOLATION: API error shown as inline banner in the form shell
<EntityFormShell error={apiError}>...</EntityFormShell>

// ❌ VIOLATION: field validation shown as a toast
notify(errors.name?.message, 'error', 3000);

// ✅ CORRECT: field validation inline, API error as toast
<FormField label="Name" error={errors.name?.message}>
  <TextBox ... />
</FormField>

// in mutation callback:
onError: () => notify('Failed to save. Please try again.', 'error', uiConfig.toast.errorDurationMs),
```

## DevExtreme (`apps/web` only)

DevExtreme is the UI component library for the admin portal.

### Setup

- `devextreme@^24.2` and `devextreme-react@^24.2` are installed in `apps/web`
- `<DevExtremeProvider>` is mounted in `apps/web/src/app/layout.tsx` — no per-page setup needed
- License key via `NEXT_PUBLIC_DEVEXTREME_LICENSE_KEY` in `.env.local`
- Never import DevExtreme CSS directly in a component — `DevExtremeProvider` owns the single CSS import

### Rules

- All DX components are client-only — files using DX must have `'use client'` at the top
- Use DX components (DataGrid, Form, Chart, etc.) for data-heavy admin views
- **Use DX `<Button>` for all interactive buttons** — never native `<button>` or `<a>` as buttons
- Combine DX components with Tailwind `className` for layout/spacing; do not override DX
  internal styles via Tailwind
- **DX components do not reliably forward Tailwind responsive classes** — wrap in a plain `<div>`:

```tsx
// ❌ VIOLATION
<Button className="md:hidden" icon="menu" onClick={openMenu} />

// ✅ CORRECT
<div className="md:hidden">
  <Button icon="menu" onClick={openMenu} />
</div>
```

- **Always use `context7` to look up DevExtreme component APIs** — never rely on training-data
  knowledge; the library evolves frequently

### Server-side paging and filtering (required for all backend-paginated lists)

All admin grids backed by a paginated API **must** use a DevExtreme `DataSource` (wrapping a
`CustomStore`) so that paging, filtering, and search are driven server-side.

**Step 1 — `createGridStore`** maps DX `loadOptions` → `page/pageSize/filterText`:

```ts
import { createGridStore } from '@lib/http/create-grid-store';
```

**Step 2 — Datasource singleton:**

```ts
export const featureStore = createGridStore<FeatureEntity>(
  (page, pageSize, filterText) => featureDatasource.list(page, pageSize, filterText),
);
```

**Step 3 — Page component:**

```tsx
import { featureStore } from '@features/feature/infrastructure/datasources/feature-datasource';

<EntityDataGrid<FeatureEntity>
  dataSource={featureStore}
  columns={columns}
  keyExpr="id"
/>
```

**Step 4 — Mutations call `store.reload()`** (not `queryClient.invalidateQueries`):

```ts
onSuccess: () => { featureStore.reload(); },
```

#### Rules

- Never use a React Query list hook for a grid's `dataSource` if the backing API is paginated
- Keep per-record React Query hooks (e.g. `useCompany(id)`) for detail views/forms
- `<RemoteOperations paging filtering />` is always included inside `EntityDataGrid`
- Search must be debounced — `EntityDataGrid` debounces at 350 ms; do not remove or reduce it
- Mutations must provide an `onError` callback that calls `notify` — never fail silently
- When `loadOptions.take` is missing, `createGridStore` throws a dev-time guard error — this
  means `<EntityDataGrid>` was used without its `<Paging>` child
- **Grid column `caption` values must use `t(...)` i18n calls** for localisation consistency.
  Example: `caption: t('users:columns.signIn')` not `caption: 'Sign-in'`.

#### Backend requirement

The list endpoint must accept `FilterText`, `Page`, and `PageSize` via a DTO extending
`PagedAndFilteredQuery`. Raw `int page, int pageSize` params are not acceptable for new
or updated paginated endpoints.

### Server-side search for dropdowns (SelectBox / TagBox)

Any `SelectBox` or `TagBox` whose backing list **can exceed 10 items** must use a `CustomStore`
with server-side search — never a pre-fetched static array.

- Use `createSelectStore` from `@/lib/http/create-select-store` — it handles the `CustomStore`,
  `byKey` cache, and `FilterText` mapping in a single call
- Set `searchEnabled`, `searchExpr` (the display field), and `searchTimeout={300}` on the widget
- Set `minSearchLength={0}` so the dropdown loads an initial page when opened without typing
- Stabilise the store with `useMemo` keyed on the parent filter (e.g. `companyId`)
- Never pass `PageSize: 500` (or any inflated page size) to an API just to pre-fetch all records
  into a plain array

```tsx
// ✅ CORRECT — server-side search with createSelectStore
import { createSelectStore } from '@/lib/http/create-select-store';

const deptStore = useMemo(
  () =>
    createSelectStore<DepartmentResponse>(
      (filterText) => getApiDepartments({ CompanyId: companyId, FilterText: filterText }),
      getApiDepartmentsId,
    ),
  [companyId],
);

<TagBox
  dataSource={deptStore}
  displayExpr="name"
  valueExpr="id"
  searchEnabled
  searchExpr="name"
  searchTimeout={300}
  minSearchLength={0}
/>
```

```tsx
// ❌ VIOLATION — pre-fetching all records into a static array
const result = await getApiDepartments({ CompanyId: companyId, PageSize: 500 });
<SelectBox dataSource={result.items} searchEnabled />
```

### Correct pattern — static/in-memory data

```tsx
'use client';

import { DataGrid, Column } from 'devextreme-react/data-grid';

export function UsersGrid({ users }: { users: UserDto[] }) {
  return (
    <DataGrid dataSource={users} showBorders columnAutoWidth>
      <Column dataField="id" caption="ID" />
      <Column dataField="email" caption="Email" />
      <Column dataField="displayName" caption="Name" />
    </DataGrid>
  );
}
```

### Violations — never do this

```tsx
// VIOLATION: importing DX CSS outside DevExtremeProvider
import 'devextreme/dist/css/dx.material.blue.light.css';

// VIOLATION: DX component in a server component
export default function UsersPage() {
  return <DataGrid dataSource={users} />;
}

// VIOLATION: hand-rolling a table when DataGrid covers the use case
<table>...</table>

// VIOLATION: native <button> instead of DX Button
<button onClick={handleOpen} className="...">Add company</button>

// VIOLATION: passing a React Query array to EntityDataGrid for a server-backed list
const { data } = useCompanies();
<EntityDataGrid dataSource={data?.items ?? []} />
```

## Route Guards

### Why not Next.js Middleware?

Supabase (GoTrue) auth state lives in browser localStorage (not httpOnly cookies), so it is unavailable in
the Edge runtime. The admin portal uses **client-side guards** that run after the auth
store hydrates.

### The guard model

Guards are pure functions that receive auth context and return `true` (pass) or a redirect path:

```ts
type RouteGuard = (ctx: GuardContext) => true | string;
```

### Built-in guards

| Guard | Behaviour |
|---|---|
| `requireAuth` | Unauthenticated → `/login` |
| `requirePublic` | Already authenticated → `/` |
| `requireCompany` | Missing `companyId` claim → `/no-company` |

### Usage

**Root-level protection** is handled automatically by `ClientProviders` — no change needed for
standard protected pages.

**Extra guards on a specific route — add `RequireAuth` to that route's layout:**

```tsx
// apps/web/src/app/companies/layout.tsx
import { RequireAuth } from '@features/auth/presentation/components/require-auth';
import { requireAuth, requireCompany } from '@features/auth/presentation/guards/route-guards';

export default function CompaniesLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth guards={[requireAuth, requireCompany]} showLayout={false}>
      {children}
    </RequireAuth>
  );
}
```

**Adding a new guard:**

```ts
export const requireAdmin: RouteGuard = ({ user }) =>
  user?.role === 'admin' || '/forbidden';
```

### Rules

- **Never** replicate guard logic in components — use a guard function
- Guards **must** be pure functions (no hooks, no async, no side effects)
- Chain guards from least to most specific: `requireAuth` before `requireCompany` before `requireAdmin`
- `showLayout={false}` on inner `RequireAuth` instances
- Do not use `router.push` directly in components for auth redirects — add a guard instead

## Testing (Web-specific)

**Tooling:** Vitest + `@testing-library/react` + jsdom. Run with `npm run test` from `apps/web/`.

| File type | What to cover |
|---|---|
| Failure class | Constructor sets `message` and `localeKey`; `localeParams` where applicable |
| Hook (module-level store) | set/get/clear contract; isolation between calls |
| Hook (React Query) | Calls correct datasource method; `onSuccess`/`onError` side-effects |
| Page component | Renders required fields; validation errors; navigation (`href`s); loading state |
| Utility / pure function | All branches; boundary values |

Render page components with a minimal provider wrapper (QueryClient, i18n, router mock via
`next/navigation` vi.mock). Do **not** test implementation details of child `@/components/ui`
primitives — test the page's observable behaviour.

## Shared UI component standards

All shared UI components live in `components/ui/` (flat, no subfolders) and are barrel-exported
from `components/ui/index.ts`. Import them with `import { X } from '@/components/ui'`.

### `DrawerPanel` — slide-out side panel

**Use for any slide-out form or detail view.** Built on DX Drawer with custom focus trap,
ESC-to-close, and focus restoration (WCAG 2.1 AA `aria-modal="true"` requirements).

```tsx
// ✅ CORRECT
<DrawerPanel title={t('companies:addCompany')} visible={isOpen} onHide={() => setIsOpen(false)}>
  <CompanyFormInline onSubmit={handleCreate} onCancel={() => setIsOpen(false)} />
</DrawerPanel>

// ❌ VIOLATION: using DX Drawer directly without focus management
<Drawer opened={isOpen} ...>
```

### `ConfirmDialog` — destructive action confirmation

**Use for any destructive or irreversible action** (delete, remove, revoke). Supports loading
state on the confirm button and accepts React nodes for the message body.

```tsx
// ✅ CORRECT
<ConfirmDialog
  visible={showDelete}
  title={t('common:confirmDialog.deleteTitle')}
  message={<>{t('departments:confirmDelete', { name: dept.name })}</>}
  onConfirm={handleDelete}
  onCancel={() => setShowDelete(false)}
  isLoading={isDeleting}
/>

// ❌ VIOLATION: using DX's imperative confirm() or window.confirm()
if (window.confirm('Delete?')) { ... }
```

### `ConfirmDialog` — unsaved-changes guard (drawer / dialog close)

**Any drawer or dialog with a form must guard the close/cancel action when the form is
dirty.** Use `ConfirmDialog` with the `extraActions` prop to render a 3-button modal:
**Discard changes** (left, destructive) / **Keep editing** (cancel) / **Save** (confirm).

All three i18n keys live under `common:confirm.unsavedChanges.*` — never add new keys.
`confirmLabel` is optional: omit it in create-only flows where saving from the dialog is
not meaningful (e.g. a multi-step wizard where the user hasn't completed all steps).

```tsx
// ✅ CORRECT — local state drives visibility, ConfirmDialog rendered as a sibling
const [isDiscardOpen, setIsDiscardOpen] = useState(false);

function handleCancel() {
  if (isDirty) {
    setIsDiscardOpen(true);
  } else {
    doClose();
  }
}

return (
  <>
    <DrawerPanel visible={visible} onHide={handleCancel} ...>
      ...
    </DrawerPanel>
    <ConfirmDialog
      visible={isDiscardOpen}
      title={t('common:confirm.unsavedChanges.title')}
      message={t('common:confirm.unsavedChanges.message')}
      confirmLabel={t('common:confirm.unsavedChanges.save')}   // omit if save isn't applicable
      cancelLabel={t('common:confirm.unsavedChanges.keepEditing')}
      onConfirm={() => { setIsDiscardOpen(false); handleSubmit(onSubmit)(); }}
      onCancel={() => setIsDiscardOpen(false)}
      isLoading={isSubmitting}
      extraActions={
        <Button
          variant="outlined"
          className="border-error text-error hover:bg-error/10"
          onClick={() => { setIsDiscardOpen(false); doClose(); }}
        >
          {t('common:confirm.unsavedChanges.discard')}
        </Button>
      }
    />
  </>
);

// ❌ VIOLATION: useConfirm for form-close guard
const { confirm } = useConfirm();
async function handleCancel() {
  const ok = await confirm({ title: 'Discard?', message: '...' });
  if (ok) doClose();
}

// ❌ VIOLATION: devextreme/ui/dialog confirm() for form-close guard
import { confirm } from 'devextreme/ui/dialog';
```

`useConfirm` is only appropriate for **non-close confirmations** that don't involve the
form's save action — e.g. deactivating an entity from within its edit drawer. If there is
no "Save" escape hatch, use the 2-button variant by omitting `confirmLabel` and
`extraActions`.

### `EntityFormShell` — standard form layout

**Use as the form wrapper for any create/edit form.** Provides a consistent footer with
Save/Cancel buttons, loading skeleton, and optional extra actions.

```tsx
// ✅ CORRECT
<EntityFormShell onSubmit={handleSave} onCancel={handleClose} isSubmitting={isCreating}>
  <TextBox ... />
  <SelectBox ... />
</EntityFormShell>

// ❌ VIOLATION: manually wiring Save/Cancel buttons in every form
<form onSubmit={...}>
  ...
  <div className="flex gap-2">
    <button type="submit">Save</button>
    <button onClick={onCancel}>Cancel</button>
  </div>
</form>
```

### `SegmentedButton` — radio-style toggle group

**Use for mutually exclusive options** (e.g. authentication method, view mode). Uses ARIA
`aria-pressed` for accessibility.

```tsx
// ✅ CORRECT
<SegmentedButton
  legend={t('companies:form.authMethod.legend')}
  options={authMethodOptions}
  value={selectedMethod}
  onValueChanged={setSelectedMethod}
/>

// ❌ VIOLATION: building a custom radio-button group with raw buttons
```

### `StatChip` — icon + count badge

**Use for inline read-only counts** in cards or list items (e.g. user count, department count).

```tsx
// ✅ CORRECT
<StatChip icon="user" value={company.activeUserCount} tooltip={t('companies:card.users')} />
```
