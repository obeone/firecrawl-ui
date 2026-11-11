import { PollTimeoutError } from './errors';

/**
 * Job states after which Firecrawl never changes a job again.
 */
const TERMINAL_JOB_STATUSES: ReadonlySet<string> = new Set(['completed', 'failed', 'cancelled']);

/**
 * Tell whether a Firecrawl job status is final.
 *
 * @param status - The `status` field of a job status response.
 * @returns True for `completed`, `failed` and `cancelled`.
 */
export function isTerminalStatus(status: string | undefined | null): boolean {
  return status != null && TERMINAL_JOB_STATUSES.has(status);
}

/**
 * Options for {@link pollJob}.
 */
export interface PollJobOptions<T> {
  /** Fetch the current state of the job. */
  request: () => Promise<T>;
  /** Tell whether the fetched state is final. */
  isSettled: (value: T) => boolean;
  /** Called with every fetched state, final one included. */
  onUpdate?: (value: T) => void;
  /** Delay between the end of one request and the start of the next, in milliseconds. */
  intervalMs: number;
  /** Give up after this long, in milliseconds. Omit to wait until the job settles. */
  timeoutMs?: number;
  /** Job identifier, quoted in the timeout error. */
  jobId?: string;
  /** Delay implementation, injectable for tests. */
  wait?: (milliseconds: number) => Promise<void>;
  /** Clock, injectable for tests. */
  now?: () => number;
}

/**
 * A running poll loop.
 */
export interface PollHandle<T> {
  /**
   * Resolves with the final state, or `undefined` when {@link PollHandle.stop}
   * was called first (even if the pending request then fails). Rejects with
   * the request error, or with a
   * {@link PollTimeoutError} when `timeoutMs` elapsed.
   */
  result: Promise<T | undefined>;
  /** Stop polling; no further request is sent and no further update is reported. */
  stop: () => void;
}

/**
 * Default delay implementation.
 *
 * @param milliseconds - The delay duration in milliseconds.
 * @returns A promise resolved after the delay.
 */
function defaultWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Poll a job until it settles, with at most one request in flight.
 *
 * Unlike `setInterval`, the next request is only scheduled once the previous
 * one has returned, so a slow status endpoint cannot pile up overlapping
 * requests or apply their answers out of order.
 *
 * @param options - Request, settle test, interval and optional timeout.
 * @returns A handle exposing the final state and a stop function.
 */
export function pollJob<T>(options: PollJobOptions<T>): PollHandle<T> {
  const wait = options.wait ?? defaultWait;
  const now = options.now ?? Date.now;
  let stopped = false;

  const run = async (): Promise<T | undefined> => {
    const startedAt = now();
    for (;;) {
      await wait(options.intervalMs);
      if (stopped) {
        return undefined;
      }
      let value: T;
      try {
        value = await options.request();
      } catch (error) {
        if (stopped) {
          return undefined; // Nobody is listening any more.
        }
        throw error;
      }
      if (stopped) {
        return undefined;
      }
      options.onUpdate?.(value);
      if (options.isSettled(value)) {
        return value;
      }
      if (options.timeoutMs !== undefined && now() - startedAt >= options.timeoutMs) {
        throw new PollTimeoutError(options.timeoutMs, options.jobId);
      }
    }
  };

  return {
    result: run(),
    stop() {
      stopped = true;
    },
  };
}
