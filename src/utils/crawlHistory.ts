/**
 * Legacy crawl history of the Crawl view (localStorage key `crawlHistory`).
 *
 * Older versions stored a full copy of the crawl form with each job, including
 * the webhook options (URL, headers such as `Authorization`, metadata), the
 * scrape request headers (cookies, tokens of the crawled site) and the browser
 * actions (which can type passwords). This module keeps only the fields the
 * view reads back, so none of those can reach storage again, and rewrites
 * entries saved by older versions the first time they are loaded.
 *
 * Kept per entry: job ID, crawled URL (without user:password@), creation date,
 * status, the include/exclude path filters, and the scrape fields the history
 * tab restores (formats, include/exclude tags, location languages, JSON and
 * change-tracking schemas, change-tracking modes). Everything else is dropped,
 * webhook options included: the history never reads them back, and webhook
 * URLs often embed their own secret (Slack, Discord, signed URLs).
 */

import { stripUserinfo, type StorageLike } from './jobHistory';

/** localStorage key of the legacy crawl history. */
export const CRAWL_HISTORY_STORAGE_KEY = 'crawlHistory';

const MAX_ID_LENGTH = 256;
const MAX_URL_LENGTH = 2048;
const MAX_DATE_LENGTH = 64;
const MAX_STATUS_LENGTH = 64;

/** Crawler options kept in history: the path filters the view restores. */
export interface StoredCrawlerOptions {
  /** Path patterns to include. */
  includes?: string[];
  /** Path patterns to exclude. */
  excludes?: string[];
}

/** Scrape options kept in history: the fields the view restores. */
export interface StoredScrapeOptions {
  /** Requested output formats, used by the download buttons. */
  formats: string[];
  /** HTML tags to include. */
  includeTags?: string[];
  /** HTML tags to exclude. */
  excludeTags?: string[];
  /** Location settings; only the languages are kept. */
  location?: { languages?: string[] };
  /** JSON extraction options; only the schema is kept. */
  jsonOptions?: { schema?: object };
  /** Change-tracking options; only the modes and schema are kept. */
  changeTrackingOptions?: { modes?: string[]; schema?: object };
}

/** One crawl job as stored in the legacy crawl history. */
export interface CrawlHistoryItem {
  /** Server-side crawl job ID. */
  id: string;
  /** Crawled URL, without credentials. */
  url: string;
  /** Creation time, ISO 8601. */
  createdAt: string;
  /** Last known status label. */
  status: string;
  /** Kept crawler options. */
  crawlerOptions?: StoredCrawlerOptions;
  /** Kept scrape options. */
  scrapeOptions?: StoredScrapeOptions;
}

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
 * Check that a value is a plain, non-null, non-array object.
 *
 * @param value - Anything.
 * @returns True for a plain object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Keep the string items of an array.
 *
 * @param value - Anything.
 * @returns The strings, or undefined when the value is not an array.
 */
function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * Deep-copy a JSON schema object, dropping anything JSON cannot carry.
 *
 * @param value - Anything.
 * @returns A copy of the object, or undefined when it is not a plain object.
 */
function schemaCopy(value: unknown): object | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  try {
    return JSON.parse(JSON.stringify(value)) as object;
  } catch {
    return undefined;
  }
}

/**
 * Build an object from the entries whose value is defined.
 *
 * @param entries - Key/value pairs.
 * @returns The object, or undefined when every value is undefined.
 */
function compact<T extends object>(entries: Record<string, unknown>): T | undefined {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? (out as T) : undefined;
}

/**
 * Keep the crawler options the history restores.
 *
 * @param value - Raw crawler options.
 * @returns The kept options, or undefined when none remain.
 */
function sanitizeCrawlerOptions(value: unknown): StoredCrawlerOptions | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return compact<StoredCrawlerOptions>({
    includes: stringList(value.includes),
    excludes: stringList(value.excludes),
  });
}

/**
 * Keep the scrape options the history restores; headers, actions and every
 * other field are dropped.
 *
 * @param value - Raw scrape options.
 * @returns The kept options, or undefined when the value is not an object.
 */
function sanitizeScrapeOptions(value: unknown): StoredScrapeOptions | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const location = isRecord(value.location)
    ? compact<{ languages?: string[] }>({ languages: stringList(value.location.languages) })
    : undefined;
  const jsonOptions = isRecord(value.jsonOptions)
    ? compact<{ schema?: object }>({ schema: schemaCopy(value.jsonOptions.schema) })
    : undefined;
  const changeTrackingOptions = isRecord(value.changeTrackingOptions)
    ? compact<{ modes?: string[]; schema?: object }>({
        modes: stringList(value.changeTrackingOptions.modes),
        schema: schemaCopy(value.changeTrackingOptions.schema),
      })
    : undefined;
  return {
    formats: stringList(value.formats) ?? [],
    ...compact<Omit<StoredScrapeOptions, 'formats'>>({
      includeTags: stringList(value.includeTags),
      excludeTags: stringList(value.excludeTags),
      location,
      jsonOptions,
      changeTrackingOptions,
    }),
  };
}

/**
 * Build a clean history entry from untrusted input, keeping only the
 * whitelisted fields. Webhook options, request headers, actions, API keys and
 * any unknown property are dropped.
 *
 * @param input - Anything, typically a form snapshot or a stored entry.
 * @returns A new entry, or null when the ID is missing or invalid.
 */
export function sanitizeCrawlHistoryItem(input: unknown): CrawlHistoryItem | null {
  if (!isRecord(input)) {
    return null;
  }
  if (typeof input.id !== 'string' || input.id === '') {
    return null;
  }
  const item: CrawlHistoryItem = {
    id: input.id.slice(0, MAX_ID_LENGTH),
    url: typeof input.url === 'string' ? stripUserinfo(input.url).slice(0, MAX_URL_LENGTH) : '',
    createdAt: typeof input.createdAt === 'string' ? input.createdAt.slice(0, MAX_DATE_LENGTH) : '',
    status: typeof input.status === 'string' ? input.status.slice(0, MAX_STATUS_LENGTH) : '',
  };
  const crawlerOptions = sanitizeCrawlerOptions(input.crawlerOptions);
  if (crawlerOptions) {
    item.crawlerOptions = crawlerOptions;
  }
  const scrapeOptions = sanitizeScrapeOptions(input.scrapeOptions);
  if (scrapeOptions) {
    item.scrapeOptions = scrapeOptions;
  }
  return item;
}

/**
 * Sanitize a list of entries, dropping the invalid ones.
 *
 * @param list - Anything; a non-array gives an empty list.
 * @returns Clean entries, in the same order.
 */
export function sanitizeCrawlHistory(list: unknown): CrawlHistoryItem[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .map(sanitizeCrawlHistoryItem)
    .filter((item): item is CrawlHistoryItem => item !== null);
}

/**
 * Load the crawl history and rewrite what older versions stored.
 *
 * Every entry is sanitized. When the stored text differs from the clean list
 * (secrets from an older version, invalid entries), storage is rewritten with
 * the clean list; unreadable data is removed, since it cannot be shown and may
 * hold secrets.
 *
 * @param storage - Storage to use; defaults to `localStorage`.
 * @returns Clean entries, in stored order.
 */
export function loadCrawlHistory(storage?: StorageLike): CrawlHistoryItem[] {
  const store = resolveStorage(storage);
  if (!store) {
    return [];
  }
  let raw: string | null;
  try {
    raw = store.getItem(CRAWL_HISTORY_STORAGE_KEY);
  } catch {
    return [];
  }
  if (raw === null) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const clean = sanitizeCrawlHistory(parsed);
  try {
    if (clean.length === 0) {
      store.removeItem(CRAWL_HISTORY_STORAGE_KEY);
    } else {
      const text = JSON.stringify(clean);
      if (text !== raw) {
        store.setItem(CRAWL_HISTORY_STORAGE_KEY, text);
      }
    }
  } catch {
    // Rewriting is best effort; the returned list is clean either way.
  }
  return clean;
}

/**
 * Persist the crawl history, sanitizing every entry first. Storage failures
 * (quota, privacy mode) are ignored.
 *
 * @param list - Entries to write; extra properties are dropped.
 * @param storage - Storage to use; defaults to `localStorage`.
 */
export function saveCrawlHistory(list: readonly unknown[], storage?: StorageLike): void {
  const store = resolveStorage(storage);
  if (!store) {
    return;
  }
  try {
    store.setItem(CRAWL_HISTORY_STORAGE_KEY, JSON.stringify(sanitizeCrawlHistory(list)));
  } catch {
    // Persisting is best effort.
  }
}

/**
 * Delete the crawl history from storage.
 *
 * @param storage - Storage to use; defaults to `localStorage`.
 */
export function clearCrawlHistory(storage?: StorageLike): void {
  const store = resolveStorage(storage);
  try {
    store?.removeItem(CRAWL_HISTORY_STORAGE_KEY);
  } catch {
    // Best effort.
  }
}
