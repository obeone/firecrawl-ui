import { onScopeDispose } from 'vue';
import {
  createJobPoller,
  createKeyedJobPoller,
  type JobPoller,
  type KeyedJobPoller,
} from '@/utils/jobPoller';
import type { PollHandle } from '@/utils/polling';

/**
 * Handle returned by a poller whose scope is already gone: nothing runs.
 *
 * @returns A handle that settles at once as "stopped".
 */
function inertHandle<T>(): PollHandle<T> {
  return { result: Promise.resolve(undefined), stop: () => {} };
}

/**
 * A {@link JobPoller} that stops on its own when the component (or effect
 * scope) that created it is torn down, and refuses to start afterwards, so a
 * job submitted just before the view was left cannot poll forever.
 *
 * @returns The poller; call it from `setup`.
 */
export function useJobPoller(): JobPoller {
  const poller = createJobPoller();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    poller.stop();
  });
  return {
    start: (options) => (disposed ? inertHandle() : poller.start(options)),
    stop: poller.stop,
    isActive: poller.isActive,
  };
}

/**
 * A {@link KeyedJobPoller} that stops every loop on its own when the
 * component (or effect scope) that created it is torn down, and refuses to
 * start afterwards.
 *
 * @returns The keyed poller; call it from `setup`.
 */
export function useKeyedJobPoller(): KeyedJobPoller {
  const poller = createKeyedJobPoller();
  let disposed = false;
  onScopeDispose(() => {
    disposed = true;
    poller.stopAll();
  });
  return {
    start: (key, options) => (disposed ? inertHandle() : poller.start(key, options)),
    stop: poller.stop,
    stopAll: poller.stopAll,
    isActive: poller.isActive,
  };
}
