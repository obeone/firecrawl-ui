// @vitest-environment jsdom
import DOMPurify from 'dompurify';
import { describe, expect, it } from 'vitest';
import { renderMarkdown, sanitizeHtml } from './sanitize';

/**
 * Parse sanitized output so assertions look at the DOM, not at string details.
 */
function parse(html: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

describe('sanitizeHtml', () => {
  it('removes scripts and event handlers', () => {
    const out = parse(
      '<p onclick="alert(1)">hi</p><script>alert(2)</script><img src="https://x.test/a.png" onerror="alert(3)">',
    );
    const html = sanitizeHtml(out.innerHTML);
    expect(html).not.toMatch(/script|onclick|onerror|alert/i);
    expect(parse(html).querySelector('p')?.textContent).toBe('hi');
  });

  it('drops javascript:, relative and fragment URLs', () => {
    const root = parse(
      sanitizeHtml(
        '<a href="javascript:alert(1)">a</a><a href="/#/billing">b</a><a href="#top">c</a><a href="https://example.com/">d</a>',
      ),
    );
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([null, null, null, 'https://example.com/']);
  });

  it('opens kept links outside the app without a referrer', () => {
    const link = parse(sanitizeHtml('<a href="https://example.com/">x</a>')).querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('removes forms, inputs, buttons, styles, iframes and svg', () => {
    const html = sanitizeHtml(
      '<form action="https://evil.test"><input name="k"><button>go</button><textarea></textarea><select></select></form>' +
        '<style>body{display:none}</style><iframe src="https://evil.test"></iframe><svg><a href="https://x.test"/></svg>' +
        '<object data="x"></object><embed src="x"><video src="x"></video><base href="https://evil.test/"><meta http-equiv="refresh" content="0">',
    );
    expect(html).not.toMatch(
      /<(form|input|button|textarea|select|style|iframe|svg|object|embed|video|base|meta)\b/i,
    );
    expect(html).not.toContain('display:none');
  });

  it('removes style, class, id, data and aria attributes', () => {
    const html = sanitizeHtml(
      '<p style="position:fixed" class="x" id="app" data-x="1" aria-label="y">t</p>',
    );
    expect(html).toBe('<p>t</p>');
  });

  it('keeps https and data images, with no referrer', () => {
    const root = parse(
      sanitizeHtml(
        '<img src="https://example.com/a.png" alt="a"><img src="data:image/png;base64,AAAA" alt="b"><img src="javascript:alert(1)" alt="c">',
      ),
    );
    const images = Array.from(root.querySelectorAll('img'));
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      'https://example.com/a.png',
      'data:image/png;base64,AAAA',
      null,
    ]);
    expect(images[0].getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('drops data: links and srcset, keeping data: only for images', () => {
    const root = parse(
      sanitizeHtml(
        '<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">a</a>' +
          '<img src="https://example.com/a.png" srcset="javascript:alert(1) 1x, https://evil.test/b.png 2x">',
      ),
    );
    expect(root.querySelector('a')?.getAttribute('href')).toBeNull();
    expect(root.querySelector('img')?.hasAttribute('srcset')).toBe(false);
  });

  it('drops obfuscated javascript: URLs', () => {
    const root = parse(
      sanitizeHtml(
        '<a href="JaVaScRiPt:alert(1)">a</a>' +
          '<a href="&#106;avascript&#58;alert(1)">b</a>' +
          '<a href=" \tjavascript:alert(1)">c</a>' +
          '<a href="java&#x09;script:alert(1)">d</a>',
      ),
    );
    const hrefs = Array.from(root.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([null, null, null, null]);
  });

  it('strips svg and mathml namespace confusion', () => {
    const html = sanitizeHtml(
      '<math><mi><a href="javascript:alert(1)">m</a></mi></math>' +
        '<svg><a href="javascript:alert(2)"><text>s</text></a></svg>' +
        '<math><mtext><table><mglyph><style><img src=x onerror=alert(3)></style></mglyph></table></mtext></math>',
    );
    expect(html).not.toMatch(/<(math|mi|mtext|mglyph|svg|style)\b|javascript:|onerror|alert/i);
  });

  it('overrides target and rel set by the input', () => {
    const link = parse(
      sanitizeHtml('<a href="https://example.com/" target="_self" rel="opener">x</a>'),
    ).querySelector('a')!;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow');
  });

  it('leaves the default DOMPurify instance untouched', () => {
    sanitizeHtml('<a href="https://example.com/">x</a>');
    const html = DOMPurify.sanitize(
      '<a href="https://example.com/">x</a><img src="https://example.com/a.png">',
    );
    expect(html).not.toMatch(/target=|rel=|referrerpolicy=|loading=/);
  });
});

describe('renderMarkdown', () => {
  it('renders ordinary markdown', () => {
    const root = parse(
      renderMarkdown(
        '# Title\n\nSome **bold** and `code`.\n\n| a | b |\n|:--|--:|\n| 1 | 2 |\n\n- item\n\n[link](https://example.com)\n\n```\nblock\n```',
      ),
    );
    expect(root.querySelector('h1')?.textContent).toBe('Title');
    expect(root.querySelector('strong')?.textContent).toBe('bold');
    expect(root.querySelector('table td')?.textContent).toBe('1');
    expect(root.querySelector('th')?.getAttribute('align')).toBe('left');
    expect(root.querySelector('li')?.textContent).toBe('item');
    expect(
      parse(renderMarkdown('3. three\n4. four')).querySelector('ol')?.getAttribute('start'),
    ).toBe('3');
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(root.querySelector('pre code')?.textContent).toBe('block\n');
  });

  it('neutralizes raw html embedded in markdown', () => {
    const html = renderMarkdown(
      'text <img src=x onerror=alert(1)> <script>alert(2)</script>\n\n[x](javascript:alert(3))',
    );
    expect(html).not.toMatch(/onerror|<script|javascript:/i);
  });

  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
