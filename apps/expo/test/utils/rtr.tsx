/**
 * Shared react-test-renderer helpers + a structural node type.
 *
 * `react-test-renderer` ships `ReactTestInstance` as a namespace in this version's
 * bundled types, which TypeScript cannot use as a type. We mirror the structural
 * shape the tests rely on here so every test file gets one typed, DRY harness.
 */
import type { ReactElement } from 'react';
import { act, create } from 'react-test-renderer';

export interface TestNode {
  type: unknown;
  // biome-ignore lint/suspicious/noExplicitAny: rendered-tree props are intentionally dynamic
  props: Record<string, any>;
  parent: TestNode | null;
  find(predicate: (node: TestNode) => boolean): TestNode;
  findAll(predicate: (node: TestNode) => boolean): TestNode[];
  findByProps(props: Record<string, unknown>): TestNode;
  findAllByType(type: unknown): TestNode[];
}

export interface TestRenderer {
  root: TestNode;
  toJSON(): unknown;
  unmount(): void;
  update(element: ReactElement): void;
}

/** Render an element inside `act` and return the typed renderer. */
export function renderTree(element: ReactElement): TestRenderer {
  let renderer: TestRenderer | undefined;
  act(() => {
    renderer = create(element) as unknown as TestRenderer;
  });
  if (!renderer) throw new Error('Renderer was not created');
  return renderer;
}

/** First node (composite or host) carrying the given testID. Throws if none/many (findByProps). */
export const byTestId = (root: TestNode, testID: string): TestNode => root.findByProps({ testID });

/** All nodes carrying the given testID (does not throw when absent). */
export const queryAllByTestId = (root: TestNode, testID: string): TestNode[] =>
  root.findAll((n) => n.props.testID === testID);

/**
 * Like {@link byTestId} but null instead of throwing when nothing matches — for asserting
 * something is ABSENT from a subtree. Derived from {@link queryAllByTestId} rather than
 * repeating its tree walk.
 */
export const queryByTestId = (root: TestNode, testID: string): TestNode | null =>
  queryAllByTestId(root, testID)[0] ?? null;

/** The host element (string type) carrying the testID — holds rendered accessibilityState. */
export const hostByTestId = (root: TestNode, testID: string): TestNode => {
  const matches = root.findAll((n) => n.props.testID === testID && typeof n.type === 'string');
  if (matches.length === 0) throw new Error(`No host element with testID "${testID}"`);
  return matches[0];
};

/** The host TextInput for a testID, drilling through any wrapper that shares the id. */
export const inputByTestId = (root: TestNode, testID: string): TestNode => {
  const node = byTestId(root, testID);
  return node.type === 'TextInput' ? node : node.find((n) => n.type === 'TextInput');
};

/** Flattened children of every <Text> node — useful for asserting visible copy. */
export const textChildren = (root: TestNode): unknown[] =>
  root.findAll((n) => n.type === 'Text').flatMap((n) => n.props.children);

/** The first Pressable whose subtree renders the given text. */
export const pressableWithText = (root: TestNode, text: string): TestNode | undefined =>
  root
    .findAll((n) => n.type === 'Pressable')
    .find((p) => p.findAll((c) => c.type === 'Text' && c.props.children === text).length > 0);

/** Fire a node's onPress inside act, awaiting any async handler. */
export async function firePress(node: TestNode | undefined): Promise<void> {
  if (!node) throw new Error('Cannot press an undefined node');
  await act(async () => {
    await node.props.onPress?.();
  });
}

/**
 * Flush work deferred through `InteractionManager.runAfterInteractions`.
 *
 * Post-auth navigation is deferred that way on purpose (expo-router 56 needs the
 * navigator to rebuild its screen list before the target route exists — see
 * navigate-to-app-root.ts), so a test asserting on `router.replace` has to let the
 * interaction queue drain first.
 */
export async function flushInteractions(): Promise<void> {
  // A timer tick, not setImmediate: the react-native mock queues these with
  // setTimeout(0), and setImmediate resolves in an earlier phase — so it would
  // return before the queued callback ever ran.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Fire a node's onChangeText inside act. */
export async function fireChangeText(node: TestNode, value: string): Promise<void> {
  await act(async () => {
    node.props.onChangeText(value);
  });
}
