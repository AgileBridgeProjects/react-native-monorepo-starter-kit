const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

// Firebase 12+ dropped the 'main' fallback field and relies entirely on the
// package.json 'exports' field for subpath resolution (e.g. firebase/auth).
// Metro must have package exports support enabled or these imports will fail.
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;

// Metro watches every npm workspace, which includes `e2e/` — but this app never imports
// from there, and Playwright creates and deletes `e2e/test-results/.playwright-artifacts-*`
// throughout a run. Metro's file map crawls that tree and then throws
// `ENOENT: watch '...\.playwright-artifacts-N'` when a directory it just saw is already
// gone, killing the dev server. Dropping the folder is what fixes it: a `blockList` regex
// still crawls the tree first, so it does not close the race.
const E2E_WORKSPACE = path.resolve(__dirname, '..', '..', 'e2e');
config.watchFolders = config.watchFolders.filter(
  (folder) => path.resolve(folder) !== E2E_WORKSPACE,
);

// Zustand's ESM builds (resolved via the "import" export condition on web) contain
// `import.meta.env` which Metro cannot evaluate outside an ES module context.
// Force zustand and its subpaths to their CJS builds on all platforms.
const _defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['react-native', 'require', 'default'] },
      moduleName,
      platform,
    );
  }
  if (_defaultResolveRequest) {
    return _defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './uniwind-types.d.ts',
  polyfills: { rem: 14 },
});
