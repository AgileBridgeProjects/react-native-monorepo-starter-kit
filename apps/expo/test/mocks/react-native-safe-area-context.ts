import { vi } from 'vitest';

export const useSafeAreaInsets = vi.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 }));
export const SafeAreaProvider = ({ children }: { children: unknown }) => children;
export const SafeAreaView = ({ children }: { children: unknown }) => children;
export const SafeAreaConsumer = ({ children }: { children: unknown }) => children;
export const initialWindowMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};
