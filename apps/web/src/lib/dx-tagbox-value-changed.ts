/**
 * Guards a DevExtreme `TagBox`'s `onValueChanged` handler against devextreme-react's
 * controlled-value feedback loop: setting a new `value` prop re-syncs the widget's internal
 * `value` option, which re-fires `onValueChanged` even when the content is unchanged — without
 * this guard, that loop spins forever (~100s of times/sec) and freezes/crashes the tab.
 *
 * Only relevant for array-valued controlled widgets (`TagBox`); `SelectBox`'s primitive value
 * does not exhibit this loop.
 */
export function tagBoxValuesEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}
