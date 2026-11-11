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

/**
 * Details carried by a {@link FirecrawlApiError}.
 */
export interface FirecrawlApiErrorInit {
  /** HTTP status of the response, absent when no response was received. */
  status?: number;
  /** Machine-readable error code from the response body (e.g. `UNKNOWN_ERROR`). */
  code?: string;
  /** Extra error details from the response body (e.g. validation issues). */
  details?: unknown;
  /** True when the request never got a response (DNS, CORS, connection refused). */
  network?: boolean;
  /** The original error. */
  cause?: unknown;
}

/**
 * An error raised by a Firecrawl API call.
 *
 * Keeps the HTTP status, the API error code and the details from the response
 * body, so callers can branch on `status` instead of parsing the message.
 */
export class FirecrawlApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly network: boolean;

  /**
   * @param message - Human-readable message, usually the `error` field of the body.
   * @param init - Status, code, details and the original error.
   */
  constructor(message: string, init: FirecrawlApiErrorInit = {}) {
    super(message, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'FirecrawlApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
    this.network = init.network ?? false;
  }
}

/**
 * Raised when the UI gives up waiting for a job that is still running server-side.
 *
 * This is a local decision, not a server failure: the job may still finish
 * and can be looked up again with `jobId`.
 */
export class PollTimeoutError extends Error {
  readonly jobId?: string;

  /**
   * @param timeoutMs - How long the UI waited, in milliseconds.
   * @param jobId - Identifier of the job that was still running.
   */
  constructor(timeoutMs: number, jobId?: string) {
    const seconds = Math.round(timeoutMs / 1000);
    super(
      `Stopped waiting after ${seconds}s; the job is still running on the server` +
        (jobId ? ` (job ID ${jobId}).` : '.'),
    );
    this.name = 'PollTimeoutError';
    this.jobId = jobId;
  }
}

/**
 * Tell whether an error is an HTTP 401 from the Firecrawl API.
 *
 * @param error - The caught value.
 * @returns True when the API rejected the credentials.
 */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof FirecrawlApiError && error.status === 401;
}

/**
 * Turn a failed request into a message for the playground error banner.
 *
 * @param error - The caught value.
 * @param fallback - Message used when nothing readable can be extracted.
 * @returns A short message that names the HTTP status when there is one.
 */
export function describeRequestError(
  error: unknown,
  fallback = 'An unexpected error occurred',
): string {
  if (error instanceof FirecrawlApiError) {
    if (error.network) {
      return `Network connection failed: ${error.message}`;
    }
    if (error.status === 404) {
      return `Resource not found (404): ${error.message}`;
    }
    if (error.status) {
      return `${error.message} (HTTP ${error.status})`;
    }
  }
  return getErrorMessage(error, fallback);
}
