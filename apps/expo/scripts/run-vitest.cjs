const { spawnSync } = require('node:child_process');
const path = require('node:path');

const workspaceRoot = path.resolve(__dirname, '..');
const vitestBin = require.resolve('vitest/vitest.mjs', { paths: [workspaceRoot] });
const forwardedArgs = process.argv.slice(2);
const nodeHeapArg = '--max-old-space-size=4096';
const nodeOptions = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} ${nodeHeapArg}`
  : nodeHeapArg;
const runs = [['run', '--config', 'vitest.config.ts']];

for (const runArgs of runs) {
  const result = spawnSync(process.execPath, [nodeHeapArg, vitestBin, ...runArgs, ...forwardedArgs], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
