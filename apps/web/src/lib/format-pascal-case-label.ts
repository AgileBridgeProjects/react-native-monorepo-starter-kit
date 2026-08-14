/**
 * Formats a PascalCase or camelCase token into a space-separated display label.
 * @example formatPascalCaseLabel('FillInTheBlanks') => 'Fill In The Blanks'
 */
export function formatPascalCaseLabel(value: string | undefined): string {
  if (!value) return '-';
  return value.replace(/([a-z])([A-Z])/g, '$1 $2');
}
