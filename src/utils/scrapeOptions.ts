/**
 * Shared state and payload helpers for the scrape options form used by the
 * Scrape, Crawl and Batch Scrape views.
 */

/**
 * One entry of the output formats select.
 */
export interface FormatOption {
  /** Format identifier sent to the adapter (e.g. `markdown`, `screenshot@fullPage`). */
  value: string;
  /** Label shown in the select. */
  label: string;
}

/**
 * The options edited by the shared scrape options form.
 *
 * Tag filters are kept as the comma-separated strings the user types; they are
 * split into arrays only when the request payload is built.
 */
export interface ScrapeOptionsFormValue {
  /** Selected output formats. */
  formats: string[];
  /** Restrict extraction to the main content of the page. */
  onlyMainContent: boolean;
  /** Comma-separated CSS selectors to keep. */
  includeTags: string;
  /** Comma-separated CSS selectors to drop. */
  excludeTags: string;
}

/** Output formats offered by the Scrape view. */
export const SCRAPE_FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Links' },
  { value: 'images', label: 'Images' },
  { value: 'summary', label: 'Summary †' },
  { value: 'screenshot', label: 'Screenshot (Viewport)' },
  { value: 'screenshot@fullPage', label: 'Screenshot (Full Page)' },
  { value: 'json', label: 'JSON (Structured Extraction) †' },
  { value: 'attributes', label: 'Attributes' },
  { value: 'branding', label: 'Branding *' },
  { value: 'changeTracking', label: 'Change Tracking (Requires Markdown) *' },
];

/** Output formats offered by the Crawl view (same set, shorter labels). */
export const CRAWL_FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Links' },
  { value: 'images', label: 'Images' },
  { value: 'summary', label: 'Summary †' },
  { value: 'screenshot', label: 'Screenshot (Viewport)' },
  { value: 'screenshot@fullPage', label: 'Screenshot (Full Page)' },
  { value: 'json', label: 'JSON †' },
  { value: 'attributes', label: 'Attributes' },
  { value: 'branding', label: 'Branding *' },
  { value: 'changeTracking', label: 'Change Tracking *' },
];

/** Output formats offered by the Batch Scrape view. */
export const BATCH_FORMAT_OPTIONS: readonly FormatOption[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Links' },
  { value: 'summary', label: 'Summary' },
  { value: 'screenshot', label: 'Screenshot (Viewport)' },
  { value: 'screenshot@fullPage', label: 'Screenshot (Full Page)' },
];

/**
 * Build the default form value: markdown only, main content only, no tag filter.
 *
 * @returns A fresh form value.
 */
export function defaultScrapeOptionsFormValue(): ScrapeOptionsFormValue {
  return { formats: ['markdown'], onlyMainContent: true, includeTags: '', excludeTags: '' };
}

/**
 * Return a copy of a form value with one field replaced.
 *
 * Extra fields carried by a wider value (e.g. a view-specific option) are kept.
 *
 * @param value - The current form value.
 * @param key - The field to replace.
 * @param fieldValue - The new value of that field.
 * @returns A new object; `value` is left untouched.
 */
export function withFormField<T extends ScrapeOptionsFormValue, K extends keyof T>(
  value: T,
  key: K,
  fieldValue: T[K],
): T {
  return { ...value, [key]: fieldValue };
}

/**
 * Split a comma-separated list, trimming entries and dropping empty ones.
 *
 * @param value - The raw text typed by the user.
 * @returns The non-empty, trimmed entries in order.
 */
export function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
}

/**
 * Tag filters of a scrape request, as the adapter expects them.
 */
export type TagFilters = {
  /** CSS selectors to keep. */
  includeTags?: string[];
  /** CSS selectors to drop. */
  excludeTags?: string[];
};

/**
 * Turn the tag filter strings of the form into request fields.
 *
 * A field is sent only when the user typed something other than whitespace;
 * its value is then the split list (which can be empty for input like `,`).
 *
 * @param value - The tag filter strings.
 * @returns The fields to spread into the request payload.
 */
export function buildTagFilters(
  value: Partial<Pick<ScrapeOptionsFormValue, 'includeTags' | 'excludeTags'>>,
): TagFilters {
  const filters: TagFilters = {};
  if (value.includeTags && value.includeTags.trim() !== '') {
    filters.includeTags = splitCommaList(value.includeTags);
  }
  if (value.excludeTags && value.excludeTags.trim() !== '') {
    filters.excludeTags = splitCommaList(value.excludeTags);
  }
  return filters;
}

/**
 * Request payload sent by the Batch Scrape view.
 */
export type BatchScrapePayload = TagFilters & {
  /** URLs to scrape. */
  urls: string[];
  /** Selected output formats. */
  formats: string[];
  /** Restrict extraction to the main content of each page. */
  onlyMainContent: boolean;
};

/**
 * Build the batch scrape request payload from the URLs and the form value.
 *
 * `onlyMainContent` is always sent, as the view always did; tag filters follow
 * {@link buildTagFilters}.
 *
 * @param urls - The URLs to scrape.
 * @param value - The scrape options form value.
 * @returns The payload for `batchScraping.batchScrape`.
 */
export function buildBatchScrapePayload(
  urls: string[],
  value: ScrapeOptionsFormValue,
): BatchScrapePayload {
  return {
    urls,
    formats: value.formats,
    onlyMainContent: value.onlyMainContent,
    ...buildTagFilters(value),
  };
}
