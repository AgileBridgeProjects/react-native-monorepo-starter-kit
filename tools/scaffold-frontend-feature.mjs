#!/usr/bin/env node
/**
 * scaffold-frontend-feature.mjs
 *
 * Generates the clean-architecture feature slice for a new StarterKit frontend feature.
 * Outputs skeleton files with correct imports, type stubs, and i18n wiring so the AI
 * only needs to fill in domain logic, not figure out the folder structure.
 *
 * Usage:
 *   node tools/scaffold-frontend-feature.mjs --feature rewards --app expo
 *   node tools/scaffold-frontend-feature.mjs --feature companies --app web
 *   node tools/scaffold-frontend-feature.mjs --feature games --app both
 *
 * Options:
 *   --feature <name>    kebab-case feature name  (e.g. rewards, user-profile, games)
 *   --app <expo|web|both>  Target app(s) (default: expo)
 *   --dry-run           Print paths without writing files
 */

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Argument Parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return null;
  return args[i + 1] ?? true;
}

const feature  = flag('feature');
const app      = flag('app') || 'expo';
const dryRun   = args.includes('--dry-run');

if (!feature || feature === true) {
  console.error('Usage: node tools/scaffold-frontend-feature.mjs --feature <feature-name> [--app expo|web|both] [--dry-run]');
  process.exit(1);
}

// Naming helpers
const kebab   = feature.toLowerCase().replace(/\s+/g, '-');
const pascal  = kebab.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
const camel   = pascal[0].toLowerCase() + pascal.slice(1);
const root    = join(fileURLToPath(import.meta.url), '../..');

const apps = app === 'both' ? ['expo', 'web'] : [app === 'web' ? 'web' : 'expo'];

// ─── File Registry ────────────────────────────────────────────────────────────

const files = [];
function add(path, content) {
  files.push({ path: join(root, path), content });
}

// ─── Expo Feature Slice ────────────────────────────────────────────────────────

if (apps.includes('expo')) {
  const base = `apps/expo/src/features/${kebab}`;

  // Failure types
  add(`${base}/domain/failures/${kebab}.failures.ts`, `// Domain failures for the ${pascal} feature.
// Datasources catch ApiError and throw one of these typed failures instead.

export class ${pascal}NotFoundFailure extends Error {
  constructor(id: string) {
    super(\`${pascal} '\${id}' not found.\`);
    this.name = '${pascal}NotFoundFailure';
  }
}

// TODO: add further typed failures as the feature grows
`);

  // Types (re-export from proxy once generated)
  add(`${base}/domain/types/${kebab}.types.ts`, `// Re-export proxy-generated types as domain aliases.
// TODO: replace the stub below once the proxy is generated.
// Example: export type { ${pascal}Response as ${pascal} } from '@/src/proxy/models/${camel}Response';

export interface ${pascal} {
  id: string;
  // TODO: add domain fields
}
`);

  // Datasource
  add(`${base}/infrastructure/datasources/${kebab}-datasource.ts`, `import type { ${pascal} } from '@features/${kebab}/domain/types/${kebab}.types';

// TODO: import generated proxy functions once \`npm run generate:proxy\` has been run.
// import { getApi${pascal}s, getApi${pascal}sId, postApi${pascal}s } from '@/src/proxy';

export const ${camel}Datasource = {
  async list(): Promise<${pascal}[]> {
    // TODO: replace with proxy call
    // const { data } = await getApi${pascal}s();
    // return data.items.map(to${pascal});
    throw new Error('Not implemented — run generate:proxy first');
  },

  async findById(id: string): Promise<${pascal}> {
    // TODO: replace with proxy call
    // const { data } = await getApi${pascal}sId(id);
    // return to${pascal}(data);
    throw new Error('Not implemented — run generate:proxy first');
  },
};

// ─── Mappers (private) ──────────────────────────────────────────────────────
// function to${pascal}(dto: ${pascal}Response): ${pascal} {
//   return { id: dto.id };
// }
`);

  // Hook
  add(`${base}/presentation/hooks/use-${kebab}.ts`, `import { useQuery } from '@tanstack/react-query';
import { ${camel}Datasource } from '@features/${kebab}/infrastructure/datasources/${kebab}-datasource';
import { queryCacheConfig } from '@lib/http/query-config';

export function use${pascal}List() {
  return useQuery({
    queryKey: ['${kebab}', 'list'] as const,
    queryFn: () => ${camel}Datasource.list(),
    ...queryCacheConfig.list,
  });
}

export function use${pascal}(id: string) {
  return useQuery({
    queryKey: ['${kebab}', id] as const,
    queryFn: () => ${camel}Datasource.findById(id),
    enabled: !!id,
    ...queryCacheConfig.profile,
  });
}
`);

  // Screen
  add(`${base}/presentation/screens/${kebab}-screen.tsx`, `import { useTranslation } from '@lib/i18n';
import { Typography } from '@/components/ui';
import { AsyncStateView } from '@/components/ui';
import { use${pascal}List } from '@features/${kebab}/presentation/hooks/use-${kebab}';
import { View } from 'react-native';

export function ${pascal}Screen() {
  const { t } = useTranslation('${kebab}');
  const { data, isLoading, isError, refetch } = use${pascal}List();

  if (isError) {
    // TODO: replace with shared error component
    return (
      <View className="flex-1 items-center justify-center">
        <Typography variant="body">{t('error.loadFailed')}</Typography>
      </View>
    );
  }

  return (
    <AsyncStateView
      isLoading={isLoading}
      hasData={!!data?.length}
      skeleton={<${pascal}Skeleton />}
    >
      {/* TODO: render feature content */}
    </AsyncStateView>
  );
}

function ${pascal}Skeleton() {
  // TODO: return a <Skeleton> shaped to match the content
  return null;
}
`);

  // Test: datasource
  add(`apps/expo/__tests__/features/${kebab}/infrastructure/datasources/${kebab}-datasource.test.ts`, `import { describe, it, expect, vi } from 'vitest';
import { ${camel}Datasource } from '@features/${kebab}/infrastructure/datasources/${kebab}-datasource';

describe('${camel}Datasource', () => {
  describe('list', () => {
    it.todo('returns mapped domain entities on success');
    it.todo('throws ${pascal}NotFoundFailure when the server returns 404');
  });

  describe('findById', () => {
    it.todo('returns the entity when found');
    it.todo('throws ${pascal}NotFoundFailure when the server returns 404');
  });
});
`);

  // i18n locale stub
  add(`apps/expo/src/lib/i18n/locales/en-ZA/${kebab}.json`, `{
  "title": "${pascal.charAt(0).toUpperCase() + pascal.slice(1)}",
  "error": {
    "loadFailed": "Something went wrong. Please try again."
  }
}
`);

  console.log(`[info] After scaffolding, register the locale namespace:`);
  console.log(`  apps/expo/src/lib/i18n/index.ts      → add '${kebab}' to the namespace list`);
  console.log(`  apps/expo/src/lib/i18n/i18n.d.ts     → add '${kebab}' to the TypeScript declaration`);
}

// ─── Web Feature Slice ─────────────────────────────────────────────────────────

if (apps.includes('web')) {
  const base = `apps/web/src/features/${kebab}`;

  // Failure types
  add(`${base}/domain/failures/${kebab}.failures.ts`, `export class ${pascal}NotFoundFailure extends Error {
  constructor(id: string) {
    super(\`${pascal} '\${id}' not found.\`);
    this.name = '${pascal}NotFoundFailure';
  }
}
`);

  // Types
  add(`${base}/domain/types/${kebab}.types.ts`, `// Re-export proxy-generated types as domain aliases.
// TODO: replace the stub below once the proxy is generated.
// export type { ${pascal}Response as ${pascal} } from '@/src/proxy/models/${camel}Response';

export interface ${pascal} {
  id: string;
  // TODO: add domain fields
}
`);

  // Datasource
  add(`${base}/infrastructure/datasources/${kebab}-datasource.ts`, `import type { ${pascal} } from '@features/${kebab}/domain/types/${kebab}.types';

// TODO: import generated proxy functions once \`npm run generate:proxy\` has been run.

export const ${camel}Datasource = {
  async list(
    page: number,
    pageSize: number,
    filterText?: string,
  ): Promise<{ items: ${pascal}[]; totalCount: number }> {
    // TODO: replace with proxy call
    throw new Error('Not implemented — run generate:proxy first');
  },

  async findById(id: string): Promise<${pascal}> {
    // TODO: replace with proxy call
    throw new Error('Not implemented — run generate:proxy first');
  },
};
`);

  // DevExtreme grid store
  add(`${base}/infrastructure/datasources/${kebab}-store.ts`, `import { createGridStore } from '@lib/http/create-grid-store';
import type { ${pascal} } from '@features/${kebab}/domain/types/${kebab}.types';
import { ${camel}Datasource } from './${kebab}-datasource';

export const ${camel}Store = createGridStore<${pascal}>(
  (page, pageSize, filterText) => ${camel}Datasource.list(page, pageSize, filterText),
);
`);

  // Hook
  add(`${base}/presentation/hooks/use-${kebab}.ts`, `import { useQuery } from '@tanstack/react-query';
import { ${camel}Datasource } from '@features/${kebab}/infrastructure/datasources/${kebab}-datasource';
import { queryCacheConfig } from '@lib/http/query-config';

export function use${pascal}(id: string) {
  return useQuery({
    queryKey: ['${kebab}', id] as const,
    queryFn: () => ${camel}Datasource.findById(id),
    enabled: !!id,
    ...queryCacheConfig.profile,
  });
}
`);

  // Page component
  add(`${base}/presentation/screens/${kebab}-page.tsx`, `'use client';

import { useTranslation } from '@lib/i18n';
import { Typography } from '@/components/ui';
import { AsyncPageState } from '@/components/ui';
import { ${camel}Store } from '@features/${kebab}/infrastructure/datasources/${kebab}-store';
import { EntityDataGrid } from '@/components/ui';

export function ${pascal}Page() {
  const { t } = useTranslation('${kebab}');

  return (
    <div className="flex flex-col gap-lg p-page">
      <Typography variant="h1">{t('title')}</Typography>

      {/* TODO: replace columns with feature-specific column definitions */}
      <EntityDataGrid
        dataSource={${camel}Store}
        columns={[]}
        keyExpr="id"
      />
    </div>
  );
}
`);

  // i18n locale stub
  add(`apps/web/src/lib/i18n/locales/en-ZA/${kebab}.json`, `{
  "title": "${pascal}",
  "columns": {
    "id": "Id"
  },
  "button": {
    "add": "Add ${pascal.toLowerCase()}"
  }
}
`);

  // App Router shell
  add(`apps/web/src/app/${kebab}/page.tsx`, `import { ${pascal}Page } from '@features/${kebab}/presentation/screens/${kebab}-page';
export default ${pascal}Page;
`);

  console.log(`[info] After scaffolding (web):`);
  console.log(`  apps/web/src/lib/i18n/index.ts       → add '${kebab}' to the namespace list`);
  console.log(`  apps/web/src/lib/i18n/i18n.d.ts      → add '${kebab}' to the TypeScript declaration`);
}

// ─── Shared README stub ───────────────────────────────────────────────────────

for (const targetApp of apps) {
  const base = targetApp === 'web'
    ? `apps/web/src/features/${kebab}`
    : `apps/expo/src/features/${kebab}`;

  add(`${base}/README.md`, `# ${pascal} Feature

| Layer | Entry point |
|---|---|
| Domain types | \`domain/types/${kebab}.types.ts\` |
| Domain failures | \`domain/failures/${kebab}.failures.ts\` |
| Datasource | \`infrastructure/datasources/${kebab}-datasource.ts\` |
| Hooks | \`presentation/hooks/use-${kebab}.ts\` |
| Screens | \`presentation/screens/${kebab}-screen.tsx\` |

## Registrations required

- [ ] Add locale namespace \`'${kebab}'\` in \`src/lib/i18n/index.ts\`
- [ ] Add type declaration in \`src/lib/i18n/i18n.d.ts\`
${targetApp === 'web' ? `- [ ] Add route in \`apps/web/src/app/${kebab}/page.tsx\` (already scaffolded)\n` : ''}\
- [ ] Update \`src/features/README.md\` datasource ↔ controller mapping table

## TODO

- [ ] Replace \`TODO\` stubs in datasource with generated proxy functions
- [ ] Add mutation hooks (\`useCreate${pascal}\`, \`useUpdate${pascal}\`, \`useDelete${pascal}\`)
- [ ] Add tests in \`__tests__/features/${kebab}/\`
`);
}

// ─── Write Files ──────────────────────────────────────────────────────────────

let created = 0;
let skipped = 0;

for (const { path, content } of files) {
  if (dryRun) {
    console.log(`[dry-run] ${path}`);
    continue;
  }

  let exists = false;
  try {
    await stat(path);
    exists = true;
  } catch {
    exists = false;
  }

  if (exists) {
    console.warn(`[skip] already exists: ${path}`);
    skipped++;
    continue;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf-8');
  console.log(`[create] ${path}`);
  created++;
}

if (!dryRun) {
  console.log(`\nDone. ${created} file(s) created, ${skipped} skipped.`);
}
