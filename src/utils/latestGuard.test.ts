import { describe, expect, it } from 'vitest';
import { createLatestGuard } from './latestGuard';

/**
 * A promise resolved from the outside, to order async steps by hand.
 */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createLatestGuard', () => {
  it('drops the results of job A when they arrive after job B started', async () => {
    const guard = createLatestGuard();
    const shown: { job: string | null; results: string[] } = { job: null, results: [] };

    // Same shape as the batch view: start a job, then fetch its results.
    const start = (job: string, fetchResults: Promise<string[]>) => {
      const isCurrent = guard.begin();
      shown.job = job;
      shown.results = [];
      return (async () => {
        const results = await fetchResults;
        if (isCurrent()) {
          shown.results = results;
        }
      })();
    };

    const resultsA = deferred<string[]>();
    const resultsB = deferred<string[]>();
    const jobA = start('job-A', resultsA.promise);
    const jobB = start('job-B', resultsB.promise);

    // A's multi-page fetch finishes last but one: it must not land on B.
    resultsA.resolve(['doc from A']);
    await jobA;
    expect(shown).toEqual({ job: 'job-B', results: [] });

    resultsB.resolve(['doc from B']);
    await jobB;
    expect(shown).toEqual({ job: 'job-B', results: ['doc from B'] });
  });

  it('keeps a late cancel of job A from unlocking or relocking job B', async () => {
    const guard = createLatestGuard();
    const view = { job: '', status: '', cancelling: false };

    // Same shape as the batch view: a submit resets the cancel flag, and a
    // cancel only touches the view while its job is still the current one.
    const submit = (job: string) => {
      guard.begin();
      Object.assign(view, { job, status: 'scraping', cancelling: false });
    };
    const cancel = async (request: Promise<void>) => {
      const isCurrent = guard.current();
      view.cancelling = true;
      try {
        await request;
        if (isCurrent()) {
          view.status = 'cancelled';
        }
      } finally {
        if (isCurrent()) {
          view.cancelling = false;
        }
      }
    };

    submit('job-A');
    const cancelA = deferred<void>();
    const cancelling = cancel(cancelA.promise);
    expect(view.cancelling).toBe(true);

    submit('job-B');
    expect(view).toEqual({ job: 'job-B', status: 'scraping', cancelling: false });

    const cancelB = cancel(Promise.resolve());
    await cancelB;
    expect(view).toEqual({ job: 'job-B', status: 'cancelled', cancelling: false });

    // A's cancel answers last: it must leave B's state alone.
    view.status = 'scraping';
    view.cancelling = true;
    cancelA.resolve();
    await cancelling;
    expect(view).toEqual({ job: 'job-B', status: 'scraping', cancelling: true });
  });

  it('keeps a current() token valid until another job begins', () => {
    const guard = createLatestGuard();
    guard.begin();
    const errorsRequest = guard.current();
    expect(errorsRequest()).toBe(true);

    guard.begin();
    expect(errorsRequest()).toBe(false);
  });

  it('makes every token stale on invalidate', () => {
    const guard = createLatestGuard();
    const isCurrent = guard.begin();
    guard.invalidate();
    expect(isCurrent()).toBe(false);
  });
});
