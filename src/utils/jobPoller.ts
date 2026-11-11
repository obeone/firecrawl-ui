import { pollJob, type PollHandle, type PollJobOptions } from './polling';

/**
 * Options for {@link JobPoller.start}: everything {@link pollJob} takes, plus
 * what to do once the loop ends.
 */
export interface StartPollOptions<T> extends PollJobOptions<T> {
  /**
   * Called once with the final state, unless the loop was stopped or replaced
   * first. It may be async; a throw or a rejection is logged, never left unhandled.
   */
  onSettled?: (value: T) => void | Promise<void>;
  /**
   * Called once when a status request fails or the timeout elapses, unless the
   * loop was stopped or replaced first. A failed status request says nothing
   * about the job itself, which may still be running server-side. It may be
   * async; a throw or a rejection is logged, never left unhandled.
   */
  onError?: (error: unknown) => void | Promise<void>;
}

/**
 * Run a settle or error callback so that its failure cannot escape as an
 * unhandled rejection: a throw or a rejected promise is logged instead. The
 * poller's own state is already final when it runs.
 *
 * @param callback - The callback to run.
 */
function runCallback(callback: () => void | Promise<void>): void {
  const report = (error: unknown): void => {
    console.error('Job poller callback failed:', error);
  };
  try {
    Promise.resolve(callback()).catch(report);
  } catch (error) {
    report(error);
  }
}

/**
 * Runs at most one {@link pollJob} loop at a time.
 */
export interface JobPoller {
  /**
   * Stop the running loop, if any, and start a new one. Stopping the returned
   * handle is the same as {@link JobPoller.stop} while that loop is current.
   */
  start<T>(options: StartPollOptions<T>): PollHandle<T>;
  /** Stop the running loop; its callbacks are never called afterwards. */
  stop(): void;
  /** Tell whether a loop is running. */
  isActive(): boolean;
}

/**
 * Create a {@link JobPoller}.
 *
 * Starting a loop stops the previous one, so answers for a job the user has
 * replaced never reach the view. Each loop keeps {@link pollJob}'s guarantees:
 * one request in flight, `completed`/`failed`/`cancelled` end it, and a
 * timeout raises a `PollTimeoutError` distinct from a server failure.
 *
 * @returns A poller with no loop running.
 */
export function createJobPoller(): JobPoller {
  let handle: PollHandle<unknown> | null = null;

  const stop = (): void => {
    handle?.stop();
    handle = null;
  };

  return {
    start<T>(options: StartPollOptions<T>): PollHandle<T> {
      stop();
      const current = pollJob(options);
      handle = current;
      current.result.then(
        (value) => {
          if (handle !== current || value === undefined) {
            return; // Stopped or replaced: nobody is listening any more.
          }
          handle = null;
          const { onSettled } = options;
          if (onSettled) {
            runCallback(() => onSettled(value));
          }
        },
        (error: unknown) => {
          if (handle !== current) {
            return;
          }
          handle = null;
          const { onError } = options;
          if (onError) {
            runCallback(() => onError(error));
          }
        },
      );
      return {
        result: current.result,
        stop: () => {
          current.stop();
          if (handle === current) {
            handle = null; // A newer loop is left alone.
          }
        },
      };
    },
    stop,
    isActive: () => handle !== null,
  };
}

/**
 * Runs one {@link JobPoller} per key, for views that follow several jobs at once.
 */
export interface KeyedJobPoller {
  /** Stop the loop running for `key`, if any, and start a new one. */
  start<T>(key: string, options: StartPollOptions<T>): PollHandle<T>;
  /** Stop the loop running for `key`, if any. */
  stop(key: string): void;
  /** Stop every loop. */
  stopAll(): void;
  /** Tell whether a loop is running for `key`. */
  isActive(key: string): boolean;
}

/**
 * Create a {@link KeyedJobPoller}.
 *
 * @returns A keyed poller with no loop running.
 */
export function createKeyedJobPoller(): KeyedJobPoller {
  const pollers = new Map<string, JobPoller>();

  const stop = (key: string): void => {
    pollers.get(key)?.stop();
    pollers.delete(key);
  };

  return {
    start<T>(key: string, options: StartPollOptions<T>): PollHandle<T> {
      stop(key);
      const poller = createJobPoller();
      pollers.set(key, poller);
      const forget = (): void => {
        if (pollers.get(key) === poller) {
          pollers.delete(key);
        }
      };
      const started = poller.start({
        ...options,
        onSettled: (value) => {
          forget();
          return options.onSettled?.(value);
        },
        onError: (error) => {
          forget();
          return options.onError?.(error);
        },
      });
      return {
        result: started.result,
        stop: () => {
          started.stop();
          forget();
        },
      };
    },
    stop,
    stopAll() {
      for (const key of [...pollers.keys()]) {
        stop(key);
      }
    },
    isActive: (key) => pollers.get(key)?.isActive() ?? false,
  };
}
