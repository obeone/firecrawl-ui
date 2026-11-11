import { describe, expect, it, vi } from 'vitest';
import { PollTimeoutError } from './errors';
import { isTerminalStatus, pollJob } from './polling';

/**
 * Build a fake clock whose `wait` advances time instantly.
 */
function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    wait: async (milliseconds: number) => {
      time += milliseconds;
    },
  };
}

describe('isTerminalStatus', () => {
  it('treats completed, failed and cancelled as final', () => {
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('keeps polling running or unknown statuses', () => {
    expect(isTerminalStatus('scraping')).toBe(false);
    expect(isTerminalStatus('processing')).toBe(false);
    expect(isTerminalStatus(undefined)).toBe(false);
    expect(isTerminalStatus('')).toBe(false);
  });
});

describe('pollJob', () => {
  it('stops on a cancelled job and reports every state', async () => {
    const states = ['scraping', 'scraping', 'cancelled'];
    const request = vi.fn(async () => ({ status: states.shift()! }));
    const updates: string[] = [];

    const handle = pollJob({
      request,
      isSettled: (value) => isTerminalStatus(value.status),
      onUpdate: (value) => updates.push(value.status),
      intervalMs: 1000,
      ...fakeClock(),
    });

    await expect(handle.result).resolves.toEqual({ status: 'cancelled' });
    expect(request).toHaveBeenCalledTimes(3);
    expect(updates).toEqual(['scraping', 'scraping', 'cancelled']);
  });

  it('never has two requests in flight', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    let calls = 0;
    const request = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      // A request slower than the interval: setInterval would overlap here.
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      calls += 1;
      return { status: calls >= 3 ? 'completed' : 'scraping' };
    };

    const handle = pollJob({
      request,
      isSettled: (value) => isTerminalStatus(value.status),
      intervalMs: 1,
    });

    await handle.result;
    expect(maxInFlight).toBe(1);
    expect(calls).toBe(3);
  });

  it('rejects with a PollTimeoutError, not a server error, when the wait runs out', async () => {
    const request = vi.fn(async () => ({ status: 'processing' }));

    const handle = pollJob({
      request,
      isSettled: (value) => isTerminalStatus(value.status),
      intervalMs: 1000,
      timeoutMs: 3000,
      jobId: 'job-123',
      ...fakeClock(),
    });

    const error = await handle.result.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PollTimeoutError);
    expect((error as PollTimeoutError).jobId).toBe('job-123');
    expect((error as Error).message).toContain('still running');
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('propagates a request failure as is', async () => {
    const failure = new Error('HTTP 500');
    const handle = pollJob({
      request: async () => {
        throw failure;
      },
      isSettled: () => false,
      intervalMs: 1000,
      ...fakeClock(),
    });

    await expect(handle.result).rejects.toBe(failure);
  });

  it('drops the answer of a request that returns after stop()', async () => {
    let release: (value: { status: string }) => void = () => {};
    const onUpdate = vi.fn();
    const handle = pollJob({
      request: () =>
        new Promise<{ status: string }>((resolve) => {
          release = resolve;
        }),
      isSettled: (value) => isTerminalStatus(value.status),
      onUpdate,
      intervalMs: 0,
    });

    // Let the first request start, then stop while it is pending.
    await new Promise((resolve) => setTimeout(resolve, 5));
    handle.stop();
    release({ status: 'completed' });

    await expect(handle.result).resolves.toBeUndefined();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('swallows the failure of a request that fails after stop()', async () => {
    let fail: (error: Error) => void = () => {};
    const handle = pollJob({
      request: () =>
        new Promise<{ status: string }>((_resolve, reject) => {
          fail = reject;
        }),
      isSettled: (value) => isTerminalStatus(value.status),
      intervalMs: 0,
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    handle.stop();
    fail(new Error('aborted'));

    await expect(handle.result).resolves.toBeUndefined();
  });
});
