/**
 * A single search result as displayed by the Search view.
 */
export interface SearchResult {
  sourceType: 'web' | 'news' | 'images';
  title: string;
  url: string;
  description?: string;
  date?: string;
  imageUrl?: string;
  markdown?: string | null;
  html?: string | null;
  rawHtml?: string | null;
  links?: string[];
  screenshot?: string | null;
  metadata?: {
    title?: string;
    description?: string;
    sourceURL?: string;
    statusCode?: number;
    error?: string | null;
  };
}

/**
 * Search results grouped by source, as returned by the search adapter.
 */
export interface SearchResultGroups {
  web?: Array<Record<string, unknown>>;
  news?: Array<Record<string, unknown>>;
  images?: Array<Record<string, unknown>>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * Flatten the web, news and image groups of a search response into one list.
 *
 * Strings are passed through untouched: the response is JSON decoded as
 * UTF-8 by the HTTP client, so no re-encoding is needed and any attempt to
 * "repair" it corrupts non-Latin text.
 *
 * @param groups - The grouped search results.
 * @returns The results in web, news, images order.
 */
export function toSearchResults(groups: SearchResultGroups): SearchResult[] {
  return [
    ...(groups.web ?? []).map(
      (item) =>
        ({
          ...item,
          sourceType: 'web',
          title: String(item.title ?? ''),
          url: String(item.url ?? ''),
        }) as SearchResult,
    ),
    ...(groups.news ?? []).map(
      (item) =>
        ({
          ...item,
          sourceType: 'news',
          title: String(item.title || item.url || 'Untitled result'),
          url: String(item.url || ''),
          description: optionalString(item.snippet),
          date: optionalString(item.date),
          imageUrl: optionalString(item.imageUrl),
        }) as SearchResult,
    ),
    ...(groups.images ?? []).map(
      (item) =>
        ({
          ...item,
          sourceType: 'images',
          title: String(item.title || item.url || 'Untitled image'),
          url: String(item.url || ''),
          imageUrl: optionalString(item.imageUrl),
        }) as SearchResult,
    ),
  ];
}
