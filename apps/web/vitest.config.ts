import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // DevExtreme themes.js sets a timer that fires after jsdom teardown,
    // calling window.getComputedStyle on a destroyed environment. This is a
    // known DX/jsdom issue — safe to ignore.
    dangerouslyIgnoreUnhandledErrors: true,
    setupFiles: ['./test/setup.ts'],
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    css: false,
    deps: {},
    server: {
      deps: {
        // Prevent Vite from trying to parse native modules that contain
        // Flow syntax (import typeof). These are mocked in test/setup.ts.
        external: [
          /node_modules\/react-native/,
          /node_modules\/expo/,
          /node_modules\/@react-native/,
          // Firebase uses complex CJS/ESM conditional exports; externalize so
          // vi.mock() factories don't trigger module-graph corruption in jsdom.
          /node_modules\/firebase/,
          /node_modules\/@firebase/,
          // DevExtreme has a deep module graph that causes OOM when inlined;
          // externalize so vi.mock() factories work without loading the full tree.
          /node_modules\/devextreme/,
        ],
        inline: [/^(?!.*node_modules)/],
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // @hookform/resolvers is hoisted to the monorepo root; point vitest here
      // so subpath imports like '@hookform/resolvers/standard-schema' resolve correctly.
      '@hookform/resolvers': path.resolve(__dirname, '../../node_modules/@hookform/resolvers'),
      // Point to the root node_modules so the component's ESM react and
      // react-dom's CJS require('react') both resolve to the same instance.
      // apps/web has its own react@19.2.3 but react-dom is only at root
      // (19.2.0) — two instances caused "Cannot read properties of null
      // (reading 'useState')" in Vitest + jsdom.
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, '../../node_modules/react-dom/client'),
      'react-dom/server': path.resolve(__dirname, '../../node_modules/react-dom/server'),
      '@/test': path.resolve(__dirname, './test'),
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@store': path.resolve(__dirname, './src/store'),
      'devextreme/ui/themes': path.resolve(__dirname, './test/mocks/devextreme-themes.ts'),
      'devextreme/ui/themes.js': path.resolve(__dirname, './test/mocks/devextreme-themes.ts'),
      'devextreme/cjs/ui/themes': path.resolve(__dirname, './test/mocks/devextreme-themes.ts'),
      'devextreme/cjs/ui/themes.js': path.resolve(__dirname, './test/mocks/devextreme-themes.ts'),
    },
  },
});
