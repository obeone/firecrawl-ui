/**
 * A check that tells whether the operation it was taken for is still the latest.
 */
export type IsCurrent = () => boolean;

/**
 * Guard against late answers from a job the user has already replaced.
 *
 * A view that runs one job at a time takes a token when it starts a job
 * ({@link LatestGuard.begin}) and checks it after every `await` before
 * touching its state. Starting another job, or {@link LatestGuard.invalidate}
 * on unmount, makes every earlier token stale, so a slow request for job A
 * can no longer overwrite what is shown for job B.
 */
export interface LatestGuard {
  /** Start a new operation; every earlier token becomes stale. */
  begin(): IsCurrent;
  /** Take a token for the operation already in progress, without replacing it. */
  current(): IsCurrent;
  /** Make every token stale, for example when the view is unmounted. */
  invalidate(): void;
}

/**
 * Create a {@link LatestGuard}.
 *
 * @returns A new guard with no operation in progress.
 */
export function createLatestGuard(): LatestGuard {
  let generation = 0;
  const tokenFor =
    (value: number): IsCurrent =>
    () =>
      value === generation;
  return {
    begin() {
      generation += 1;
      return tokenFor(generation);
    },
    current() {
      return tokenFor(generation);
    },
    invalidate() {
      generation += 1;
    },
  };
}
