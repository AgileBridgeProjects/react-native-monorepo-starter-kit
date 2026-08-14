---
globs:
  - "apps/web/**"
---

# Web (admin portal) context active

## Before writing any code

Load `docs/standards/frontend.md` + `docs/standards/frontend-web.md` for the task.

## New feature? Use the scaffold script first

```bash
npm run scaffold:frontend -- --feature <kebab-name> --app web
```

Generates failures, datasource, DevExtreme grid store, hooks, page, App Router shell, i18n stub, and README.

## Architecture rule (never break)

```text
Page → Hook → Datasource → Proxy → apiClient
```

- Pages (`app/`) are routing shells only — one line: `export default FeaturePage`
- No logic, no hooks, no state in `app/` files
- DevExtreme grids use `createGridStore()` from the datasource layer — never fetch inline

## DevExtreme

- Use `DxDataGrid`, `DxForm`, `DxChart` from `devextreme-react`
- All grid columns defined in the feature, never inline in `app/`
- Datasource = `createGridStore()` wrapper — handles paging, sorting, filtering automatically

## Styling

- Tailwind v4 — `globals.css` imports `@starterkit/shared/tokens.css`
- Semantic `--color-*` tokens via `@theme inline`
- Never use raw hex/rgb values — always semantic tokens

## i18n

- All user-facing strings via `useTranslation('<namespace>')`
- Add new namespace to `src/lib/i18n/index.ts` and `i18n.d.ts`
- Locale values: sentence-case only (`npm run check:locale-casing` enforces this)
