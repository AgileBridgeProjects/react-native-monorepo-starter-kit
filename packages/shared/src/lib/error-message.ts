/**
 * Maps errors to user-facing messages.
 *
 * Domain failures (classes whose name ends with "Failure") carry user-facing
 * messages. All other errors are replaced with a generic fallback to avoid
 * leaking internal details.
 */
export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string | null {
  if (!error) return null;
  if (error instanceof Error && error.name.endsWith('Failure')) {
    return error.message;
  }
  return fallback;
}
