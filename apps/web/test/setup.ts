import * as matchers from '@testing-library/jest-dom/matchers';
import { afterAll, afterEach, beforeAll, expect, vi } from 'vitest';

import { server } from './mocks/server';

expect.extend(matchers);

const getComputedStyleStub = vi.fn(() => ({
  getPropertyValue: () => '',
}));

Object.defineProperty(globalThis, 'getComputedStyle', {
  configurable: true,
  writable: true,
  value: getComputedStyleStub,
});

function applyWindowGetComputedStyle(target: Window | (typeof globalThis & Window) | undefined) {
  if (!target) return;

  Object.defineProperty(target, 'getComputedStyle', {
    configurable: true,
    writable: true,
    value: getComputedStyleStub,
  });

  const targetPrototype = Object.getPrototypeOf(target);
  if (targetPrototype) {
    Object.defineProperty(targetPrototype, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: getComputedStyleStub,
    });
  }
}

if (typeof window !== 'undefined') {
  let currentWindow = window;
  applyWindowGetComputedStyle(currentWindow);

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() {
      return currentWindow;
    },
    set(nextWindow) {
      currentWindow = nextWindow;
      applyWindowGetComputedStyle(currentWindow);
    },
  });
}

// ─── Mock Strategy ────────────────────────────────────────────────────────────
//
// 1. HTTP / Network requests
//    Use MSW handlers (./mocks/server.ts + ./mocks/handlers.ts).
//    The server is started globally here; add per-test handlers with
//    `server.use(http.get(...))` and they are automatically reset after each test.
//
// 2. Module-level stubs
//    Use `vi.mock('module-path', factory)` in individual test files.
//    For hoisted references (used inside the factory), use `vi.hoisted(() => ...)`.
//    Keep shared mock objects in `test/mocks/` and import them inside the factory.
//
// 3. Shared UI component stubs
//    `test/mocks/ui-mocks.tsx` — re-export via async factory:
//      vi.mock('@/components/ui', async () => await import('@/test/mocks/ui-mocks'))
//
// 4. Shared navigation stubs
//    `test/mocks/navigation-mocks.tsx` — provides NextLink and nextNavigationMock.
//
// 5. Render helpers
//    `test/utils/render-with-providers.tsx` — renderWithProviders / renderHookWithProviders
//    wrap the subject in a fresh QueryClientProvider with retry disabled.
//
// 6. Test factories
//    `test/factories/` — type-safe factory functions for domain objects.
//    Import from the barrel: `import { makeUser, makeClub } from '@/test/factories'`.
//
// jsdom does not implement ResizeObserver — stub it so components that use it
// (e.g. generate-review-editor) don't throw in unit tests.
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ─── MSW Server Lifecycle ────────────────────────────────────────────────────
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
