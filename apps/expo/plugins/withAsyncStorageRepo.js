/**
 * Expo config plugin: withAsyncStorageRepo
 *
 * async-storage 3.x ships a pre-built AAR (storage-android) via a bundled
 * local Maven repository. Gradle 9.0 with PREFER_PROJECT mode ignores
 * settings-level repos when project-level repos exist, causing builds to
 * fail with:
 *   "Could not find org.asyncstorage.shared_storage:storage-android:1.0.0"
 *
 * This plugin injects a Gradle snippet that uses Node to resolve the real
 * path to async-storage (which may be hoisted in a monorepo) and adds
 * the local_repo as a maven repository.
 */
const { withProjectBuildGradle } = require('@expo/config-plugins');

// Use Node's require.resolve at Gradle configure-time to handle monorepo hoisting
const MAVEN_BLOCK = `
        // async-storage 3.x local AAR — resolve via Node for monorepo support
        maven {
            def asyncStoragePath = providers.exec {
                workingDir(rootDir)
                commandLine("node", "--print", "require('path').join(require.resolve('@react-native-async-storage/async-storage/package.json'), '..', 'android', 'local_repo')")
            }.standardOutput.asText.get().trim()
            url(asyncStoragePath)
        }`;

module.exports = function withAsyncStorageRepo(config) {
  return withProjectBuildGradle(config, (mod) => {
    const contents = mod.modResults.contents;
    if (!contents.includes('async-storage')) {
      mod.modResults.contents = contents.replace(
        /allprojects\s*\{\s*\n\s*repositories\s*\{/,
        `allprojects {\n  repositories {${MAVEN_BLOCK}`,
      );
    }
    return mod;
  });
};
