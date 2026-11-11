import JSZip from 'jszip';

/** Kind of job an export belongs to. */
export type ExportKind = 'batch' | 'crawl';

/**
 * A scraped document as returned by batch scrape or crawl results.
 * Loosely typed on purpose: only `markdown`, `url` and `metadata` are read.
 */
export type ExportDocument = object;

const MAX_HEADING_LEVEL = 6;
const MAX_ID_LENGTH = 64;
const MAX_SLUG_LENGTH = 80;
const MIN_INDEX_WIDTH = 3;

/**
 * Read a loosely typed document as a plain record.
 *
 * @param doc - The document.
 * @returns The same object viewed as a record.
 */
function asRecord(doc: ExportDocument): Record<string, unknown> {
  return doc as Record<string, unknown>;
}

/**
 * Return a trimmed non-empty string, or an empty string for anything else.
 *
 * @param value - Candidate value.
 * @returns The trimmed string or ''.
 */
function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build the base file name (without extension) of an export.
 *
 * @param kind - Job kind.
 * @param jobId - Job identifier; reduced to `[A-Za-z0-9_-]`, max 64 chars.
 * @returns For example `batch-abc-123`.
 */
export function exportFileBase(kind: ExportKind, jobId: string): string {
  const safe = jobId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, MAX_ID_LENGTH) || 'job';
  return `${kind}-${safe}`;
}

/**
 * Build a pretty-printed JSON export of a job's documents.
 *
 * @param kind - Job kind.
 * @param jobId - Job identifier.
 * @param documents - Documents to export.
 * @param now - Export timestamp, injectable for tests.
 * @returns JSON text with `kind`, `jobId`, `exportedAt`, `count`, `documents`.
 */
export function buildJsonExport(
  kind: ExportKind,
  jobId: string,
  documents: readonly ExportDocument[],
  now: Date = new Date(),
): string {
  return JSON.stringify(
    { kind, jobId, exportedAt: now.toISOString(), count: documents.length, documents },
    null,
    2,
  );
}

/**
 * Get the source URL of a document.
 *
 * @param doc - The document.
 * @returns `metadata.sourceURL`, `url` or `metadata.url`, or '' when none.
 */
export function documentSourceUrl(doc: ExportDocument): string {
  const record = asRecord(doc);
  const metadata = (record.metadata ?? {}) as Record<string, unknown>;
  return str(metadata.sourceURL) || str(record.url) || str(metadata.url);
}

/**
 * Get a display title for a document.
 *
 * @param doc - The document.
 * @param index - Zero-based position, used for the `Page N` fallback.
 * @returns Metadata title, else source URL, else `Page N`.
 */
export function documentTitle(doc: ExportDocument, index: number): string {
  const metadata = (asRecord(doc).metadata ?? {}) as Record<string, unknown>;
  return str(metadata.title) || documentSourceUrl(doc) || `Page ${index + 1}`;
}

/**
 * Get a document's Markdown content.
 *
 * @param doc - The document.
 * @returns The Markdown, or '' when absent or blank.
 */
function documentMarkdown(doc: ExportDocument): string {
  const value = asRecord(doc).markdown;
  return typeof value === 'string' && value.trim() ? value : '';
}

/**
 * Raise every ATX heading level by one (capped at 6), leaving fenced code blocks untouched.
 *
 * @param markdown - Markdown source.
 * @returns Markdown with bumped headings.
 */
function bumpHeadings(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split('\n')
    .map((line) => {
      const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        if (fence === null) {
          fence = marker[0];
        } else if (marker[0] === fence) {
          fence = null;
        }
        return line;
      }
      if (fence !== null) return line;
      return line.replace(/^(#{1,6})(?=\s|$)/, (hashes) =>
        '#'.repeat(Math.min(MAX_HEADING_LEVEL, hashes.length + 1)),
      );
    })
    .join('\n');
}

/**
 * Compile all documents into a single Markdown file.
 *
 * @param title - Top-level title.
 * @param documents - Documents to compile.
 * @returns The compiled Markdown.
 */
export function buildCompiledMarkdown(title: string, documents: readonly ExportDocument[]): string {
  const sections: string[] = [`# ${title}`];
  documents.forEach((doc, index) => {
    const lines = [`## ${documentTitle(doc, index)}`, ''];
    const url = documentSourceUrl(doc);
    if (url) lines.push(`Source: ${url}`, '');
    const markdown = documentMarkdown(doc);
    lines.push(markdown ? bumpHeadings(markdown) : '_No Markdown content._');
    sections.push(lines.join('\n'));
  });
  return `${sections.join('\n\n')}\n`;
}

/**
 * Derive a file-name slug from a URL's host and path.
 *
 * @param url - Source URL, possibly empty or malformed.
 * @returns Lowercase `[a-z0-9-]` slug, max 80 chars, or 'page'.
 */
function slugFromUrl(url: string): string {
  let raw = url;
  try {
    const parsed = new URL(url);
    raw = `${parsed.host}${parsed.pathname}`;
  } catch {
    // Not a valid absolute URL: slugify the raw text.
  }
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'page';
}

/**
 * Build one safe, unique, order-preserving Markdown file name per document.
 *
 * @param documents - Documents to name.
 * @returns File names such as `001-example-com-docs.md`.
 */
export function markdownFileNames(documents: readonly ExportDocument[]): string[] {
  const width = Math.max(MIN_INDEX_WIDTH, String(documents.length).length);
  return documents.map(
    (doc, index) =>
      `${String(index + 1).padStart(width, '0')}-${slugFromUrl(documentSourceUrl(doc))}.md`,
  );
}

/**
 * Make a value safe inside a double-quoted YAML scalar.
 *
 * @param value - Raw text.
 * @returns Escaped single-line text.
 */
function yamlEscape(value: string): string {
  return value
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Build the files of the per-page Markdown archive.
 *
 * @param documents - Documents to export.
 * @returns Map of file name to content: one file per document with Markdown, plus `index.md`.
 */
export function buildMarkdownZipFiles(
  documents: readonly ExportDocument[],
): Record<string, string> {
  const names = markdownFileNames(documents);
  const files: Record<string, string> = {};
  const index: string[] = ['# Index', ''];
  documents.forEach((doc, i) => {
    const title = documentTitle(doc, i);
    const url = documentSourceUrl(doc);
    const markdown = documentMarkdown(doc);
    if (markdown) {
      files[names[i]] =
        `---\nsource: "${yamlEscape(url)}"\ntitle: "${yamlEscape(title)}"\n---\n\n${markdown}`;
    }
    const target = markdown ? names[i] : '(no markdown)';
    index.push(`- ${title.replace(/\r?\n|\r/g, ' ')} | ${url || '(no source)'} | ${target}`);
  });
  files['index.md'] = `${index.join('\n')}\n`;
  return files;
}

/**
 * Build a zip archive with one Markdown file per page.
 *
 * @param documents - Documents to export.
 * @returns The zip as a Blob.
 */
export async function buildMarkdownZip(documents: readonly ExportDocument[]): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(buildMarkdownZipFiles(documents))) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Tell whether at least one document has Markdown content.
 *
 * @param documents - Documents to inspect.
 * @returns True when a Markdown export would not be empty.
 */
export function hasMarkdown(documents: readonly ExportDocument[]): boolean {
  return documents.some((doc) => documentMarkdown(doc) !== '');
}
