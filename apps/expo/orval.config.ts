import { defineConfig } from 'orval';

export default defineConfig({
  mobileApi: {
    input: {
      target: './openapi/mobile-api.json',
    },
    output: {
      target: './src/proxy/services',
      schemas: './src/proxy/models',
      client: 'axios-functions',
      mode: 'tags-split',
      override: {
        mutator: {
          path: './src/lib/http/orval-mutator.ts',
          name: 'customInstance',
        },
        header: (info) =>
          [
            '// AUTO-GENERATED — DO NOT EDIT.',
            `// Regenerate with: npm run generate:proxy`,
            `// Source: ${info.title ?? 'StarterKit Mobile API'} ${info.version ?? ''}`.trimEnd(),
            '',
          ].join('\n'),
      },
    },
  },
});
