/**
 * Content Security Policy for the built app.
 *
 * One source of truth for both delivery paths: the `<meta>` tag injected into
 * `dist/index.html` at build time (see `vite.config.ts`), and the
 * `Content-Security-Policy` header sent by `nginx.conf`, which a test keeps in
 * sync with this file.
 *
 * - Scripts and styles come only from this origin: the production build ships
 *   no inline `<script>` or `<style>`, and Vue applies `:style` bindings
 *   through the CSSOM, which `style-src` does not govern.
 * - `connect-src` allows any `http(s)` origin because the Firecrawl API URL is
 *   configured at runtime and may be a self-hosted instance on the LAN.
 * - `img-src` allows any `http(s)` origin plus `data:` and `blob:`, because
 *   scraped Markdown and screenshots reference images on arbitrary hosts.
 * - The dev server is left alone: Vite injects inline styles for HMR there.
 */
export const CSP_DIRECTIVES: ReadonlyArray<readonly [string, string]> = [
  ['default-src', "'self'"],
  ['script-src', "'self'"],
  ['style-src', "'self'"],
  ['img-src', "'self' data: blob: https: http:"],
  ['font-src', "'self' data:"],
  ['connect-src', "'self' https: http:"],
  ['frame-src', "'none'"],
  ['object-src', "'none'"],
  ['base-uri', "'none'"],
  ['form-action', "'none'"],
];

/**
 * Directives browsers ignore when the policy comes from a `<meta>` tag; they
 * are only sent in the HTTP header.
 */
export const CSP_HEADER_ONLY_DIRECTIVES: ReadonlyArray<readonly [string, string]> = [
  ['frame-ancestors', "'none'"],
];

/**
 * Serialize directives into a policy string.
 *
 * @param directives - Name and value pairs, in order.
 * @returns The policy, directives separated by `; `.
 */
function serialize(directives: ReadonlyArray<readonly [string, string]>): string {
  return directives.map(([name, value]) => `${name} ${value}`).join('; ');
}

/** Policy delivered through the `<meta http-equiv>` tag. */
export const CSP_META_POLICY = serialize(CSP_DIRECTIVES);

/** Policy delivered through the nginx `Content-Security-Policy` header. */
export const CSP_HEADER_POLICY = serialize([...CSP_DIRECTIVES, ...CSP_HEADER_ONLY_DIRECTIVES]);

/**
 * Insert the CSP `<meta>` tag right after `<meta charset>`, so it applies
 * before any script or stylesheet in the document is parsed.
 *
 * @param html - The built `index.html`.
 * @returns The document with the CSP tag.
 * @throws {Error} When the document has no `<meta charset>` to anchor on, so a
 *   template change cannot silently ship a build without a policy.
 */
export function injectCspMeta(html: string): string {
  const anchor = /<meta charset="[^"]*"\s*\/?>/i;
  const match = anchor.exec(html);
  if (!match) {
    throw new Error('index.html has no <meta charset> tag to anchor the CSP <meta> tag on');
  }
  const tag = `<meta http-equiv="Content-Security-Policy" content="${CSP_META_POLICY}" />`;
  const end = match.index + match[0].length;
  return `${html.slice(0, end)}\n    ${tag}${html.slice(end)}`;
}
