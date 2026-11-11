/**
 * In-memory handoff of URLs between views (Map to Batch scrape).
 *
 * Kept in a module-level variable on purpose: selections can hold thousands of
 * URLs, which would not fit in a route query and should not be persisted.
 */
let pendingUrls: string[] | null = null;

/**
 * Store URLs for the next Batch scrape view to pick up.
 *
 * @param urls - URLs to hand over; a copy is stored.
 */
export function setPendingBatchUrls(urls: string[]): void {
  pendingUrls = [...urls];
}

/**
 * Take the pending URLs, clearing them.
 *
 * @returns The stored URLs once, or null when nothing is pending.
 */
export function takePendingBatchUrls(): string[] | null {
  const urls = pendingUrls;
  pendingUrls = null;
  return urls;
}
