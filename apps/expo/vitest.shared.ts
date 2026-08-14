import path from 'node:path';

import type { ESBuildOptions } from 'vite';
import type { UserConfig } from 'vitest/config';

export const commonEsbuildConfig: ESBuildOptions = {
  jsx: 'automatic',
  jsxImportSource: 'react',
};

export const commonTestConfig = {
  globals: true,
  setupFiles: ['./test/setup.ts'],
  include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
  exclude: ['node_modules', '.expo', 'dist', 'android', 'ios'],
  css: false,
  pool: 'forks',
  fileParallelism: false,
  maxWorkers: 1,
  minWorkers: 1,
  server: {
    deps: {
      external: [/node_modules\/react-native/, /node_modules\/expo/, /node_modules\/@react-native/],
    },
  },
} satisfies NonNullable<UserConfig['test']>;

export const commonResolveConfig = {
  alias: [
    {
      find: /^@\/assets\/.*\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/,
      replacement: path.resolve(__dirname, './test/mocks/asset-stub.ts'),
    },
    // Static asset files (PNG, JPG, SVG, etc.) are resolved by Metro/Expo in production
    // but are not loadable Node modules. Redirect them to a numeric stub so that
    // module-level require('@/assets/...png') calls don't throw in the test environment.
    {
      find: /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/,
      replacement: path.resolve(__dirname, './test/mocks/asset-stub.ts'),
    },
    { find: '@starterkit/shared', replacement: path.resolve(__dirname, '../../packages/shared/src') },
    { find: '@features', replacement: path.resolve(__dirname, './src/features') },
    { find: '@lib', replacement: path.resolve(__dirname, './src/lib') },
    { find: '@store', replacement: path.resolve(__dirname, './src/store') },
    { find: /^@\/(.*)/, replacement: `${path.resolve(__dirname)}/$1` },
    { find: 'react-native', replacement: path.resolve(__dirname, './test/mocks/react-native.ts') },
    {
      find: 'expo-linear-gradient',
      replacement: path.resolve(__dirname, './test/mocks/expo-linear-gradient.ts'),
    },
    {
      find: 'expo-glass-effect',
      replacement: path.resolve(__dirname, './test/mocks/expo-glass-effect.ts'),
    },
    {
      find: '@react-native-vector-icons/ionicons/static',
      replacement: path.resolve(__dirname, './test/mocks/expo-vector-icons.ts'),
    },
    {
      find: '@react-native-vector-icons/fontawesome/static',
      replacement: path.resolve(__dirname, './test/mocks/expo-vector-icons.ts'),
    },
    {
      find: '@react-native-vector-icons/material-icons/static',
      replacement: path.resolve(__dirname, './test/mocks/expo-vector-icons.ts'),
    },
    {
      find: '@react-native-vector-icons/material-design-icons/static',
      replacement: path.resolve(__dirname, './test/mocks/expo-vector-icons.ts'),
    },
    {
      find: 'expo-file-system/legacy',
      replacement: path.resolve(__dirname, './test/mocks/expo-file-system.ts'),
    },
    {
      find: 'expo-file-system',
      replacement: path.resolve(__dirname, './test/mocks/expo-file-system.ts'),
    },
    {
      find: 'react-native-image-colors',
      replacement: path.resolve(__dirname, './test/mocks/react-native-image-colors.ts'),
    },
    {
      find: 'react-native-safe-area-context',
      replacement: path.resolve(__dirname, './test/mocks/react-native-safe-area-context.ts'),
    },
    {
      find: 'react-native-svg',
      replacement: path.resolve(__dirname, './test/mocks/react-native-svg.ts'),
    },
    {
      find: '@shopify/react-native-skia',
      replacement: path.resolve(__dirname, './test/mocks/react-native-skia.ts'),
    },
  ],
} satisfies NonNullable<UserConfig['resolve']>;
