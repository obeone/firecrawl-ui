/**
 * Extract a human-readable message from a value thrown in a `catch` block.
 *
 * @param error - The caught value; `catch` bindings are `unknown` in strict TypeScript.
 * @param fallback - Message used when nothing readable can be extracted.
 * @returns The error message, the thrown string, or `fallback`.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return fallback;
}
