import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * MSW server instance for integration tests.
 *
 * Start/stop is handled globally in test/setup.ts so individual test files
 * don't need to manage lifecycle. Use `server.use()` in a test to add
 * one-off overrides for error scenarios.
 */
export const server = setupServer(...handlers);
