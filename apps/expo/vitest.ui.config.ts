import { defineConfig } from 'vitest/config';

import { commonEsbuildConfig, commonResolveConfig, commonTestConfig } from './vitest.shared';

export default defineConfig({
  test: {
    ...commonTestConfig,
    environment: 'node',
    include: ['**/*.test.tsx'],
  },
  resolve: commonResolveConfig,
  esbuild: commonEsbuildConfig,
});
