import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { commonEsbuildConfig, commonResolveConfig, commonTestConfig } from './vitest.shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const assetStubPlugin = {
  name: 'asset-stub',
  transform(_: string, id: string) {
    if (/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/.test(id)) {
      return { code: 'module.exports = 1;', map: null };
    }
  },
};

export default defineConfig({
  plugins: [assetStubPlugin],
  test: {
    ...commonTestConfig,
    environment: 'node',
    exclude: [
      ...(commonTestConfig.exclude ?? []),
      '**/__tests__/src/features/crossword/presentation/**/*.{test,spec}.{ts,tsx}',
    ],
  },
  resolve: {
    ...commonResolveConfig,
    alias: [
      ...(Array.isArray(commonResolveConfig.alias) ? commonResolveConfig.alias : []),
      {
        find: 'expo-asset',
        replacement: resolve(__dirname, 'test/mocks/expo-asset.ts'),
      },
      {
        // Unresolvable under Node — its build re-exports './Constants.types' with no
        // extension. See the mock's own note.
        find: 'expo-constants',
        replacement: resolve(__dirname, 'test/mocks/expo-constants.ts'),
      },
    ],
  },
  esbuild: commonEsbuildConfig,
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.webp', '**/*.svg'],
});
