import { defineConfig } from 'vitest/config';

import { commonEsbuildConfig, commonResolveConfig, commonTestConfig } from './vitest.shared';

export default defineConfig({
  test: {
    ...commonTestConfig,
    environment: 'node',
    include: ['**/__tests__/src/features/**/presentation/hooks/*.test.ts'],
  },
  resolve: commonResolveConfig,
  esbuild: commonEsbuildConfig,
});
