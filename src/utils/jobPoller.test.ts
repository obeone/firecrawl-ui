import { describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useJobPoller, useKeyedJobPoller } from '@/composables/useJobPoller';
import { PollTimeoutError } from './errors';
import { createJobPoller, createKeyedJobPoller } from './jobPoller';
import { isTerminalStatus } from './polling';

/**
 * A wait that returns at once, so loops run as fast as the microtask queue.
 */
const instantWait = async (): Promise<void> => {};

/**
 * Let every pending promise callback run.
 */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A request whose answers are released by hand, to observe a loop mid-flight.
 */
function manualRequest<T>() {
  const pending: Array<{ resolve: (value: T) => void; reject: (error: unknown) => void }> = [];
  const request = vi.fn(
    () =>
      new Promise<T>((resolve, reject) => {
        pending.push({ resolve, reject });
      }),
  );
  return { request, pending };
}

describe('createJobPoller', () => {
  it('reports updates then the final state once', async () => {
    const states = ['scraping', 'scraping', 'completed'];
    const updates: string[] = [];
    const onSettled = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller();

    poller.start({
      request: async () => ({ status: states.shift()! }),
      isSettled: (value) => isTerminalStatus(value.status),
      onUpdate: (value) => updates.push(value.status),
      onSettled,
      onError,
      intervalMs: 0,
      wait: instantWait,
    });
    expect(poller.isActive()).toBe(true);
    await flush();

    expect(updates).toEqual(['scraping', 'scraping', 'completed']);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ status: 'completed' });
    expect(onError).not.toHaveBeenCalled();
    expect(poller.isActive()).toBe(false);
  });

  it('treats a cancelled job as final', async () => {
    const onSettled = vi.fn();
    const request = vi.fn(async () => ({ status: 'cancelled' }));
    createJobPoller().start({
      request,
      isSettled: (value) => isTerminalStatus(value.status),
      onSettled,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledExactlyOnceWith({ status: 'cancelled' });
  });

  it('reports a failed status request through onError, not onSettled', async () => {
    const onSettled = vi.fn();
    const onError = vi.fn();
    const failure = new Error('502 Bad Gateway');
    createJobPoller().start({
      request: async () => {
        throw failure;
      },
      isSettled: () => false,
      onSettled,
      onError,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();

    expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
    expect(onSettled).not.toHaveBeenCalled();
  });

  it('keeps the local timeout distinct from a server failure', async () => {
    let time = 0;
    const onError = vi.fn();
    createJobPoller().start({
      request: async () => ({ status: 'processing' }),
      isSettled: (value) => isTerminalStatus(value.status),
      onError,
      intervalMs: 1000,
      timeoutMs: 3000,
      jobId: 'job-1',
      wait: async (milliseconds) => {
        time += milliseconds;
      },
      now: () => time,
    });
    await flush();

    expect(onError).toHaveBeenCalledOnce();
    const error = onError.mock.calls[0][0];
    expect(error).toBeInstanceOf(PollTimeoutError);
    expect((error as PollTimeoutError).jobId).toBe('job-1');
  });

  it('drops answers from a loop replaced by a newer one', async () => {
    const first = manualRequest<{ status: string }>();
    const firstUpdate = vi.fn();
    const firstSettled = vi.fn();
    const poller = createJobPoller();
    poller.start({
      request: first.request,
      isSettled: (value) => isTerminalStatus(value.status),
      onUpdate: firstUpdate,
      onSettled: firstSettled,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();
    expect(first.pending).toHaveLength(1);

    const secondSettled = vi.fn();
    poller.start({
      request: async () => ({ status: 'completed' }),
      isSettled: (value) => isTerminalStatus(value.status),
      onSettled: secondSettled,
      intervalMs: 0,
      wait: instantWait,
    });
    // The first job's slow answer arrives after the user started another job.
    first.pending[0].resolve({ status: 'completed' });
    await flush();

    expect(firstUpdate).not.toHaveBeenCalled();
    expect(firstSettled).not.toHaveBeenCalled();
    expect(secondSettled).toHaveBeenCalledExactlyOnceWith({ status: 'completed' });
  });

  it('calls nothing once stopped, even when the pending request fails', async () => {
    const { request, pending } = manualRequest<{ status: string }>();
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const poller = createJobPoller();
    poller.start({
      request,
      isSettled: () => false,
      onUpdate,
      onError,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();

    poller.stop();
    pending[0].reject(new Error('aborted'));
    await flush();

    expect(poller.isActive()).toBe(false);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

describe('createKeyedJobPoller', () => {
  it('runs one loop per key and stops them independently', async () => {
    const a = manualRequest<{ status: string }>();
    const b = manualRequest<{ status: string }>();
    const aUpdate = vi.fn();
    const bSettled = vi.fn();
    const poller = createKeyedJobPoller();
    poller.start('a', {
      request: a.request,
      isSettled: (value) => isTerminalStatus(value.status),
      onUpdate: aUpdate,
      intervalMs: 0,
      wait: instantWait,
    });
    poller.start('b', {
      request: b.request,
      isSettled: (value) => isTerminalStatus(value.status),
      onSettled: bSettled,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();

    poller.stop('a');
    a.pending[0].resolve({ status: 'completed' });
    b.pending[0].resolve({ status: 'failed' });
    await flush();

    expect(aUpdate).not.toHaveBeenCalled();
    expect(bSettled).toHaveBeenCalledExactlyOnceWith({ status: 'failed' });
    expect(poller.isActive('a')).toBe(false);
    expect(poller.isActive('b')).toBe(false);
  });

  it('stopAll stops every loop', async () => {
    const poller = createKeyedJobPoller();
    const request = vi.fn(async () => ({ status: 'scraping' }));
    for (const key of ['a', 'b']) {
      poller.start(key, { request, isSettled: () => false, intervalMs: 0, wait: instantWait });
    }
    poller.stopAll();
    await flush();

    expect(poller.isActive('a')).toBe(false);
    expect(poller.isActive('b')).toBe(false);
    expect(request).toHaveBeenCalledTimes(0);
  });
});

describe('useJobPoller', () => {
  it('stops polling when its scope is disposed', async () => {
    const { request, pending } = manualRequest<{ status: string }>();
    const onUpdate = vi.fn();
    const scope = effectScope();
    const poller = scope.run(() => useJobPoller())!;
    const keyed = scope.run(() => useKeyedJobPoller())!;
    poller.start({ request, isSettled: () => false, onUpdate, intervalMs: 0, wait: instantWait });
    keyed.start('x', {
      request,
      isSettled: () => false,
      onUpdate,
      intervalMs: 0,
      wait: instantWait,
    });
    await flush();

    scope.stop();
    for (const answer of pending) {
      answer.resolve({ status: 'scraping' });
    }
    await flush();

    expect(poller.isActive()).toBe(false);
    expect(keyed.isActive('x')).toBe(false);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('useJobPoller after disposal', () => {
  it('refuses to start once its scope is gone', async () => {
    const request = vi.fn(async () => ({ status: 'scraping' }));
    const scope = effectScope();
    const poller = scope.run(() => useJobPoller())!;
    const keyed = scope.run(() => useKeyedJobPoller())!;
    scope.stop();

    // A submit answered after the view was left must not start a loop.
    const handle = poller.start({
      request,
      isSettled: () => false,
      intervalMs: 0,
      wait: instantWait,
    });
    keyed.start('x', { request, isSettled: () => false, intervalMs: 0, wait: instantWait });
    await flush();

    await expect(handle.result).resolves.toBeUndefined();
    expect(poller.isActive()).toBe(false);
    expect(keyed.isActive('x')).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
