/**
 * Pure helpers that read the displayable parts of a scraped document and pick
 * the result tabs to show for it.
 */

/** A scraped document as returned by the adapter. */
export type ScrapedDocument = Record<string, unknown>;

/**
 * One tab of a result pane.
 */
export interface ResultTab {
  /** Tab identifier, also used as the viewer's `tab` value. */
  key: string;
  /** Label shown on the tab. */
  label: string;
}

/**
 * Raw markdown of a document.
 *
 * @param doc - The document, or null when there is none.
 * @returns The markdown, or an empty string.
 */
export function getDocumentMarkdown(doc: ScrapedDocument | null): string {
  const markdown = doc?.markdown;
  return typeof markdown === 'string' ? markdown : '';
}

/**
 * HTML of a document, preferring `html` and falling back to `rawHtml`.
 *
 * @param doc - The document, or null when there is none.
 * @returns The HTML source, or an empty string.
 */
export function getDocumentHtml(doc: ScrapedDocument | null): string {
  const html = doc?.html ?? doc?.rawHtml;
  return typeof html === 'string' ? html : '';
}

/**
 * Links discovered in a document, one per line.
 *
 * @param doc - The document, or null when there is none.
 * @returns The newline-joined links, or an empty string.
 */
export function getDocumentLinks(doc: ScrapedDocument | null): string {
  const links = doc?.links;
  return Array.isArray(links) ? links.join('\n') : '';
}

/**
 * Screenshot of a document (a URL or a data URL).
 *
 * @param doc - The document, or null when there is none.
 * @returns The screenshot source, or an empty string.
 */
export function getDocumentScreenshot(doc: ScrapedDocument | null): string {
  const screenshot = doc?.screenshot;
  return typeof screenshot === 'string' ? screenshot : '';
}

/**
 * Page metadata of a document.
 *
 * @param doc - The document, or null when there is none.
 * @returns The metadata object, or null when absent.
 */
export function getDocumentMetadata(doc: ScrapedDocument | null): Record<string, unknown> | null {
  const metadata = doc?.metadata;
  return metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : null;
}

/**
 * Options for {@link buildDocumentTabs}.
 */
export interface DocumentTabsOptions {
  /** Add a leading Preview tab when the document has markdown or HTML. */
  includePreview?: boolean;
}

/**
 * Pick the result tabs backed by data in the document; JSON is always last.
 *
 * @param doc - The document, or null when there is none.
 * @param options - Extra tabs to consider.
 * @returns The tabs to show, in display order.
 */
export function buildDocumentTabs(
  doc: ScrapedDocument | null,
  options: DocumentTabsOptions = {},
): ResultTab[] {
  const markdown = getDocumentMarkdown(doc);
  const html = getDocumentHtml(doc);
  const tabs: ResultTab[] = [];
  if (options.includePreview && (markdown || html)) {
    tabs.push({ key: 'preview', label: 'Preview' });
  }
  if (markdown) tabs.push({ key: 'markdown', label: 'Markdown' });
  if (html) tabs.push({ key: 'html', label: 'HTML' });
  if (getDocumentLinks(doc)) tabs.push({ key: 'links', label: 'Links' });
  if (getDocumentScreenshot(doc)) tabs.push({ key: 'screenshot', label: 'Screenshot' });
  if (getDocumentMetadata(doc)) tabs.push({ key: 'metadata', label: 'Metadata' });
  tabs.push({ key: 'json', label: 'JSON' });
  return tabs;
}
