import type { CrashReporter } from './types';

export const noopReporter: CrashReporter = {
  recordError: () => {},
  log: () => {},
  setUserId: () => {},
  setAttribute: () => {},
};
