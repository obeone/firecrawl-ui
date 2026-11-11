import DOMPurify, { type Config } from 'dompurify';
import { marked } from 'marked';

/**
 * DOMPurify settings for scraped content rendered with `v-html`.
 *
 * An explicit allowlist rather than DOMPurify's defaults: only the elements
 * `marked` produces for ordinary Markdown are kept, so forms, inputs, buttons,
 * styles, SVG, MathML, iframes and media players never reach the page, and
 * neither do `style`, `class`, `id`, `data-*` or `aria-*` attributes. Links and
 * images must be absolute `http(s)` (or `mailto:`) URLs; relative and fragment
 * links would otherwise point back into this app and its hash router. Images
 * may also be `data:` URIs, which DOMPurify allows for `img` only.
 */
export const MARKDOWN_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'pre',
    's',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'tr',
    'ul',
  ],
  ALLOWED_ATTR: ['align', 'alt', 'href', 'src', 'start', 'title'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  // DOMPurify checks every attribute that is not "URI safe" against
  // ALLOWED_URI_REGEXP, which would drop `align="left"` and `start="3"`.
  ADD_URI_SAFE_ATTR: ['align', 'start'],
  ALLOW_ARIA_ATTR: false,
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  RETURN_TRUSTED_TYPE: false,
} satisfies Config;

/**
 * Dedicated DOMPurify instance, so the hook below never leaks into other users
 * of the default instance. Created on first use, when a DOM is available.
 */
let purifier: ReturnType<typeof DOMPurify> | null = null;

/**
 * Get the dedicated DOMPurify instance, creating it on first use.
 *
 * @returns The configured instance.
 */
function getPurifier(): ReturnType<typeof DOMPurify> {
  if (purifier === null) {
    purifier = DOMPurify(window);
    purifier.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && node.hasAttribute('href')) {
        // Scraped links open outside the app and learn nothing about it.
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
      if (node.tagName === 'IMG') {
        node.setAttribute('referrerpolicy', 'no-referrer');
        node.setAttribute('loading', 'lazy');
      }
    });
  }
  return purifier;
}

/**
 * Sanitize untrusted HTML with {@link MARKDOWN_SANITIZE_CONFIG}.
 *
 * @param html - Untrusted HTML, for example scraped page content.
 * @returns HTML safe to pass to `v-html`.
 */
export function sanitizeHtml(html: string): string {
  return getPurifier().sanitize(html, MARKDOWN_SANITIZE_CONFIG);
}

/**
 * Render untrusted Markdown to sanitized HTML.
 *
 * @param markdown - Untrusted Markdown, for example a scrape result.
 * @returns HTML safe to pass to `v-html`, or an empty string for empty input.
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown) {
    return '';
  }
  return sanitizeHtml(marked.parse(markdown, { async: false }));
}
