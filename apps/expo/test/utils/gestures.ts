import { act } from 'react-test-renderer';

/**
 * A gesture as recorded by the `react-native-gesture-handler` mock in
 * `test/setup.ts`: its callbacks, and whether it was armed.
 */
export interface MockGesture {
  handlers: {
    onBegin?: (event?: unknown) => unknown;
    onStart?: (event?: unknown) => unknown;
    onUpdate?: (event?: unknown) => unknown;
    onEnd?: (event?: unknown) => unknown;
    onFinalize?: (event?: unknown) => unknown;
  };
  /** What the component last passed to `.enabled(...)`. */
  enabledFlag: boolean;
}

/**
 * The gesture a component tagged with `Gesture.withTestId(id)`.
 *
 * Native gesture machinery has no jsdom equivalent, so a test drives a gesture by
 * calling its recorded callbacks directly — which means it also bypasses
 * `.enabled(...)`. Assert on {@link MockGesture.enabledFlag} when arming is the
 * thing under test.
 */
export async function gestureByTestId(testID: string): Promise<MockGesture> {
  const module = (await import('react-native-gesture-handler')) as unknown as {
    __taggedGestures?: Map<string, MockGesture>;
  };
  const gesture = module.__taggedGestures?.get(testID);
  if (!gesture) throw new Error(`No gesture tagged with testId "${testID}"`);
  return gesture;
}

/** Fire one of a gesture's callbacks inside `act`, awaiting any async work. */
export async function fireGesture(
  gesture: MockGesture,
  handler: keyof MockGesture['handlers'],
  event: Record<string, number> = {},
): Promise<void> {
  const fn = gesture.handlers[handler];
  if (!fn) throw new Error(`Gesture has no ${handler} handler`);
  await act(async () => {
    fn(event);
  });
}
