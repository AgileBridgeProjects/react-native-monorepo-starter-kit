import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { act, create } from 'react-test-renderer';

interface RenderHookResult<T> {
  result: {
    readonly current: T;
  };
  rerender: () => void;
  unmount: () => void;
}

interface HookRenderer {
  update: (element: ReactNode) => void;
  unmount: () => void;
}

export function renderHook<T>(useHook: () => T): RenderHookResult<T> {
  let currentValue: T | undefined;
  let renderer: HookRenderer | undefined;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  function HookHarness(): ReactNode {
    currentValue = useHook();
    return null;
  }

  function Wrapper(): ReactNode {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(HookHarness),
    );
  }

  act(() => {
    renderer = create(React.createElement(Wrapper));
  });

  return {
    result: {
      get current() {
        if (currentValue === undefined) {
          throw new Error('Hook value is not available yet.');
        }

        return currentValue;
      },
    },
    rerender: () => {
      if (!renderer) {
        throw new Error('Hook renderer is not available yet.');
      }

      const currentRenderer = renderer;

      act(() => {
        currentRenderer.update(React.createElement(Wrapper));
      });
    },
    unmount: () => {
      if (!renderer) {
        throw new Error('Hook renderer is not available yet.');
      }

      const currentRenderer = renderer;

      act(() => {
        currentRenderer.unmount();
      });
    },
  };
}
