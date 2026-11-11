/**
 * Local history of crawl, batch scrape and map jobs.
 *
 * Only job metadata is stored (see {@link JobHistoryEntry}): never the API key,
 * request options, headers or scraped content. Every write goes through
 * {@link sanitizeEntry}, which copies six whitelisted fields into a new object.
 */

/** Kind of job a history entry describes. */
export type JobKind = 'crawl' | 'batch' | 'map';

/** Metadata kept for one job. */
export interface JobHistoryEntry {
  /** Kind of job. */
  kind: JobKind;
  /** Server-side job ID, or a local ID for map jobs. */
  id: string;
  /** Creation time, ISO 8601. */
  createdAt: string;
  /** URL the job started from, without credentials. */
  sourceUrl: string;
  /** Number of results, or null when unknown. */
  resultCount: number | null;
  /** Last known status label. */
  status: string;
}

/** Minimal storage surface used here, compatible with `Storage`. */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** localStorage key holding the history. */
export const JOB_HISTORY_STORAGE_KEY = 'firecrawl-ui:job-history';
/** Maximum number of entries kept, newest first. */
export const JOB_HISTORY_MAX_ENTRIES = 200;

const MAX_URL_LENGTH = 2048;
const MAX_STATUS_LENGTH = 64;
const MAX_ID_LENGTH = 256;
const MAX_DATE_LENGTH = 64;
const KINDS: readonly string[] = ['crawl', 'batch', 'map'];

/**
 * Resolve the storage to use.
 *
 * @param storage - Explicit storage, or undefined for `localStorage`.
 * @returns The storage, or null when none is available.
 */
function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) {
    return storage;
  }
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Remove user:password@ from a URL string when it parses as a URL.
 *
 * @param value - Raw URL text.
 * @returns The text without userinfo; unchanged when it does not parse.
 */
export function stripUserinfo(value: string): string {
  try {
    const url = new URL(value);
    if (!url.username && !url.password) {
      return value;
    }
    url.username = '';
    url.password = '';
    return url.toString();
  } catch {
    return value;
  }
}

/**
 * Build a clean entry from untrusted input, keeping only the six known fields.
 *
 * @param input - Anything; extra properties are dropped.
 * @returns A new entry, or null when a required field is missing or invalid.
 */
export function sanitizeEntry(input: unknown): JobHistoryEntry | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.kind !== 'string' || !KINDS.includes(raw.kind)) {
    return null;
  }
  if (typeof raw.id !== 'string' || raw.id === '') {
    return null;
  }
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, MAX_DATE_LENGTH) : '';
  const sourceUrl =
    typeof raw.sourceUrl === 'string' ? stripUserinfo(raw.sourceUrl).slice(0, MAX_URL_LENGTH) : '';
  const count = raw.resultCount;
  const resultCount =
    typeof count === 'number' && Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
  const status = typeof raw.status === 'string' ? raw.status.slice(0, MAX_STATUS_LENGTH) : '';
  return {
    kind: raw.kind as JobKind,
    id: raw.id.slice(0, MAX_ID_LENGTH),
    createdAt,
    sourceUrl,
    resultCount,
    status,
  };
}

/**
 * Load the history, tolerating missing, corrupted or partly invalid data.
 *
 * @param storage - Storage to read; defaults to `localStorage`.
 * @returns Valid entries, newest first.
 */
export function loadJobHistory(storage?: StorageLike): JobHistoryEntry[] {
  const store = resolveStorage(storage);
  if (!store) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(store.getItem(JOB_HISTORY_STORAGE_KEY) ?? '[]');
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(sanitizeEntry)
      .filter((entry): entry is JobHistoryEntry => entry !== null)
      .slice(0, JOB_HISTORY_MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Persist a list, ignoring storage failures (quota, privacy mode).
 *
 * @param list - Entries to write.
 * @param store - Target storage, or null.
 */
function save(list: JobHistoryEntry[], store: StorageLike | null): void {
  if (!store) {
    return;
  }
  try {
    store.setItem(JOB_HISTORY_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Persisting is best effort.
  }
}

/**
 * Add a job or replace the one with the same kind and ID, moving it to the top.
 *
 * @param entry - The job metadata; extra properties are ignored.
 * @param storage - Storage to use; defaults to `localStorage`.
 * @returns The new list.
 */
export function recordJob(entry: JobHistoryEntry, storage?: StorageLike): JobHistoryEntry[] {
  const store = resolveStorage(storage);
  const clean = sanitizeEntry(entry);
  const current = loadJobHistory(store ?? undefined);
  if (!clean) {
    return current;
  }
  const list = [
    clean,
    ...current.filter((item) => !(item.kind === clean.kind && item.id === clean.id)),
  ].slice(0, JOB_HISTORY_MAX_ENTRIES);
  save(list, store);
  return list;
}

/**
 * Update the status and/or result count of an existing job; no-op when absent.
 *
 * @param kind - Job kind.
 * @param id - Job ID.
 * @param patch - Fields to change.
 * @param storage - Storage to use; defaults to `localStorage`.
 * @returns The new list.
 */
export function updateJob(
  kind: JobKind,
  id: string,
  patch: Partial<Pick<JobHistoryEntry, 'status' | 'resultCount'>>,
  storage?: StorageLike,
): JobHistoryEntry[] {
  const store = resolveStorage(storage);
  const current = loadJobHistory(store ?? undefined);
  if (!current.some((item) => item.kind === kind && item.id === id)) {
    return current;
  }
  const list = current.map((item) => {
    if (item.kind !== kind || item.id !== id) {
      return item;
    }
    return sanitizeEntry({
      ...item,
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.resultCount !== undefined ? { resultCount: patch.resultCount } : {}),
    }) as JobHistoryEntry;
  });
  save(list, store);
  return list;
}

/**
 * Remove one job.
 *
 * @param kind - Job kind.
 * @param id - Job ID.
 * @param storage - Storage to use; defaults to `localStorage`.
 * @returns The new list.
 */
export function removeJob(kind: JobKind, id: string, storage?: StorageLike): JobHistoryEntry[] {
  const store = resolveStorage(storage);
  const list = loadJobHistory(store ?? undefined).filter(
    (item) => !(item.kind === kind && item.id === id),
  );
  save(list, store);
  return list;
}

/**
 * Delete the whole history.
 *
 * @param storage - Storage to use; defaults to `localStorage`.
 * @returns An empty list.
 */
export function clearJobHistory(storage?: StorageLike): JobHistoryEntry[] {
  const store = resolveStorage(storage);
  try {
    store?.removeItem(JOB_HISTORY_STORAGE_KEY);
  } catch {
    // Best effort.
  }
  return [];
}

/**
 * Create a local ID for a job that has no server-side ID (map).
 *
 * @returns `map-<timestamp>-<random base36>`.
 */
export function newLocalJobId(): string {
  return `map-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
