/**
 * Request and result helpers for the Extract view.
 *
 * The view extracts structured data with `POST /v2/scrape` and the `json`
 * format (`formats: [{ type: 'json', prompt, schema }]`, answer in
 * `data.json`), one request per URL. It builds the same legacy-shaped payload
 * as the Scrape view (`formats: ['json']` plus an `extract` block), which the
 * adapter in `src/services/firecrawl.ts` turns into the v2 request.
 *
 * @see https://docs.firecrawl.dev/features/llm-extract
 */

import { checkCountryCode } from './formValidation';

/** Proxy modes offered by the Extract view. */
export type ExtractProxy = 'auto' | 'basic' | 'enhanced' | 'stealth';

/**
 * Scrape options edited in the Extract view's "Scrape Options" section.
 *
 * Tag filters and location languages are kept as the comma-separated strings
 * the user types; they are split only when the payload is built.
 */
export interface ExtractScrapeOptions {
  /** Restrict extraction to the main content of the page. */
  onlyMainContent: boolean;
  /** Comma-separated CSS selectors to keep. */
  includeTags: string;
  /** Comma-separated CSS selectors to drop. */
  excludeTags: string;
  /** Delay before scraping, in milliseconds. */
  waitFor: number;
  /** Request timeout, in milliseconds. */
  timeout: number;
  /** Accept a cached page up to this age, in milliseconds. */
  maxAge: number;
  /** Emulate a mobile device. */
  mobile: boolean;
  /** Block ads and cookie popups. */
  blockAds: boolean;
  /** Drop base64-encoded images from the scraped content. */
  removeBase64Images: boolean;
  /** Skip TLS certificate verification. */
  skipTlsVerification: boolean;
  /** Store the scraped page in Firecrawl's cache. */
  storeInCache: boolean;
  /** Proxy mode. */
  proxy: ExtractProxy;
  /** ISO 3166-1 alpha-2 country code, or an empty string. */
  locationCountry: string;
  /** Comma-separated language codes. */
  locationLanguages: string;
}

/**
 * Defaults of the `POST /v2/scrape` options, as documented in the v2 spec.
 * The payload builder only sends a field whose value differs from these.
 */
export const EXTRACT_SCRAPE_DEFAULTS: Readonly<ExtractScrapeOptions> = Object.freeze({
  onlyMainContent: true,
  includeTags: '',
  excludeTags: '',
  waitFor: 0,
  timeout: 60000,
  maxAge: 172800000,
  mobile: false,
  blockAds: true,
  removeBase64Images: true,
  skipTlsVerification: false,
  storeInCache: true,
  proxy: 'auto',
  locationCountry: '',
  locationLanguages: '',
});

/**
 * Build a fresh, editable copy of the default scrape options.
 *
 * @returns A new options object set to the v2 defaults.
 */
export function defaultExtractScrapeOptions(): ExtractScrapeOptions {
  return { ...EXTRACT_SCRAPE_DEFAULTS };
}

/**
 * What the Extract view sends for one URL.
 */
export interface ExtractRequestInput {
  /** The page to extract from. */
  url: string;
  /** Natural-language description of the data to extract. */
  prompt?: string;
  /** JSON Schema the extracted data must follow. */
  schema?: Record<string, unknown>;
  /** Extra HTTP headers sent with the page request. */
  headers?: Record<string, string>;
  /** The scrape options edited in the form. */
  options: ExtractScrapeOptions;
}

/**
 * Split a newline-separated list into trimmed, non-empty, de-duplicated URLs.
 *
 * @param text - The content of the URLs textarea.
 * @returns The URLs, in the order they were typed.
 */
export function parseExtractUrls(text: string): string[] {
  const urls = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return [...new Set(urls)];
}

/**
 * Split a comma-separated field into trimmed, non-empty entries.
 *
 * @param text - The field value.
 * @returns The entries.
 */
function splitList(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Build the scrape payload for one URL: the `json` format with its prompt
 * and/or schema, plus every scrape option that differs from its v2 default.
 *
 * @param input - The URL, prompt, schema, headers and scrape options.
 * @returns The payload accepted by `api.scraping.scrapeAndExtractFromUrl`.
 * @throws {Error} When neither a prompt nor a schema is given: the `json`
 *   format needs at least one of them.
 */
export function buildExtractScrapePayload(input: ExtractRequestInput): Record<string, unknown> {
  const prompt = input.prompt?.trim() ?? '';
  const schema = input.schema;
  if (!prompt && !schema) {
    throw new Error('Provide a prompt or a JSON schema.');
  }

  const opts = input.options;
  const defaults = EXTRACT_SCRAPE_DEFAULTS;
  const includeTags = splitList(opts.includeTags);
  const excludeTags = splitList(opts.excludeTags);
  const languages = splitList(opts.locationLanguages);
  // An invalid code is left out here; the view blocks submission on it.
  const country = checkCountryCode(opts.locationCountry).code;
  const location = {
    ...(country ? { country } : {}),
    ...(languages.length ? { languages } : {}),
  };

  return {
    url: input.url,
    formats: ['json'],
    extract: {
      ...(prompt ? { prompt } : {}),
      ...(schema ? { schema } : {}),
    },
    ...(opts.onlyMainContent !== defaults.onlyMainContent && {
      onlyMainContent: opts.onlyMainContent,
    }),
    ...(includeTags.length && { includeTags }),
    ...(excludeTags.length && { excludeTags }),
    ...(opts.waitFor !== defaults.waitFor && { waitFor: opts.waitFor }),
    ...(opts.timeout !== defaults.timeout && { timeout: opts.timeout }),
    ...(opts.maxAge !== defaults.maxAge && { maxAge: opts.maxAge }),
    ...(opts.mobile !== defaults.mobile && { mobile: opts.mobile }),
    ...(opts.blockAds !== defaults.blockAds && { blockAds: opts.blockAds }),
    ...(opts.removeBase64Images !== defaults.removeBase64Images && {
      removeBase64Images: opts.removeBase64Images,
    }),
    ...(opts.skipTlsVerification !== defaults.skipTlsVerification && {
      skipTlsVerification: opts.skipTlsVerification,
    }),
    ...(opts.storeInCache !== defaults.storeInCache && { storeInCache: opts.storeInCache }),
    ...(opts.proxy !== defaults.proxy && { proxy: opts.proxy }),
    ...(Object.keys(location).length && { location }),
    ...(input.headers && Object.keys(input.headers).length && { headers: input.headers }),
  };
}

/**
 * The outcome of the extraction for one URL.
 */
export interface ExtractPageResult {
  /** The URL that was scraped. */
  url: string;
  /** Whether the page returned structured data. */
  ok: boolean;
  /** The `json` output of the page, when `ok`. */
  json?: unknown;
  /** Why the page gave no data, when not `ok`. */
  error?: string;
}

/**
 * Read the `json` output from a scraped document, as returned by
 * `api.scraping.scrapeAndExtractFromUrl` (`response.data.data`).
 *
 * @param url - The URL that was scraped.
 * @param document - The scraped document.
 * @returns A successful page result, or a failed one when the document has no
 *   `json` output (the server then usually puts the reason in `warning`).
 */
export function toExtractPageResult(url: string, document: unknown): ExtractPageResult {
  const doc =
    typeof document === 'object' && document !== null ? (document as Record<string, unknown>) : {};
  if (doc.json !== undefined && doc.json !== null) {
    return { url, ok: true, json: doc.json };
  }
  const warning = typeof doc.warning === 'string' && doc.warning ? doc.warning : undefined;
  return { url, ok: false, error: warning ?? 'The page returned no JSON data.' };
}

/**
 * Combine the page results into the value shown and downloaded by the view.
 *
 * With one URL the result is that page's JSON, exactly as `/v2/extract` used
 * to return it. With several URLs it is an object keyed by URL, holding the
 * JSON of each page that succeeded.
 *
 * @param pages - The page results, in request order.
 * @returns The combined value, or `null` when no page succeeded.
 */
export function combineExtractResults(pages: readonly ExtractPageResult[]): unknown {
  const succeeded = pages.filter((page) => page.ok);
  if (succeeded.length === 0) {
    return null;
  }
  if (pages.length === 1) {
    return succeeded[0].json;
  }
  return Object.fromEntries(succeeded.map((page) => [page.url, page.json]));
}

/**
 * One row of the Result tab's key/value view.
 */
export interface ResultRow {
  /** The top-level key. */
  key: string;
  /** The value, formatted for display. */
  value: string;
}

/**
 * Format one value for the key/value view.
 *
 * @param value - The value to format.
 * @returns `—` for null or undefined, compact JSON for objects and arrays,
 *   the plain string otherwise.
 */
export function formatResultValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Turn the extracted data into key/value rows for the Result tab.
 *
 * @param value - The combined result.
 * @returns One row per top-level key when the result is a plain object, or
 *   `null` when it is a scalar or an array (shown as pretty-printed JSON).
 */
export function toResultRows(value: unknown): ResultRow[] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
    key,
    value: formatResultValue(entry),
  }));
}
