/**
 * Recursively collects all string and number leaf values from a React element's
 * children tree. Useful for asserting rendered text in component tests without
 * being sensitive to how text is split across child nodes.
 */
export function flattenChildren(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'number') return [String(value)];
  if (Array.isArray(value)) return value.flatMap((c) => flattenChildren(c));
  if (value && typeof value === 'object' && 'props' in value) {
    return flattenChildren((value as { props: { children?: unknown } }).props.children);
  }
  return [];
}

/**
 * Collects all visible text from every `Text` node inside the given renderer
 * root, joined into a single space-separated string. Ideal for presence checks
 * in react-test-renderer tests.
 *
 * Works with the project's react-native test mock where `Text = 'Text'`.
 */
export function flattenText(node: {
  findAllByType: (type: unknown) => Array<{ props: { children?: unknown } }>;
}): string {
  return node
    .findAllByType('Text')
    .flatMap((n) => flattenChildren(n.props.children))
    .join(' ');
}
