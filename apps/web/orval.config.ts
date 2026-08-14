import { defineConfig } from 'orval';

export default defineConfig({
  webApi: {
    input: {
      target: './openapi/web-api.json',
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
        operations: {
          GetApiUsersExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiUsersBulkUploadTemplate: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsGamificationLeaguesExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsGamificationScoreboardExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsGamificationStreaksExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsPlayersGameCoverageByPlayerExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsExportFull: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsSummaryExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsPlayersUserIdExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsGamesExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
          GetApiReportsTeamsExport: {
            mutator: {
              path: './src/lib/http/orval-mutator.ts',
              name: 'blobInstance',
            },
          },
        },
        header: (info) =>
          [
            '// AUTO-GENERATED — DO NOT EDIT.',
            `// Regenerate with: npm run generate:proxy`,
            `// Source: ${info.title ?? 'StarterKit Web API'} ${info.version ?? ''}`.trimEnd(),
            '',
          ].join('\n'),
      },
    },
  },
});
