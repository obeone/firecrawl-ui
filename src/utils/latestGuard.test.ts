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
