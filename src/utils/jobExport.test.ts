import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  buildCompiledMarkdown,
  buildJsonExport,
  buildMarkdownZipFiles,
  documentSourceUrl,
  documentTitle,
  exportFileBase,
  hasMarkdown,
  markdownFileNames,
} from './jobExport';

describe('exportFileBase', () => {
  it('sanitizes and prefixes', () => {
    expect(exportFileBase('batch', 'abc-123_X')).toBe('batch-abc-123_X');
    expect(exportFileBase('crawl', '../a b/c?')).toBe('crawl-abc');
  });
  it('caps length and falls back', () => {
    expect(exportFileBase('batch', 'a'.repeat(100))).toBe(`batch-${'a'.repeat(64)}`);
    expect(exportFileBase('batch', '///')).toBe('batch-job');
  });
});

describe('buildJsonExport', () => {
  it('has the expected shape', () => {
    const docs = [{ url: 'https://a.test' }, { url: 'https://b.test' }];
    const out = JSON.parse(buildJsonExport('crawl', 'j1', docs, new Date('2026-01-02T03:04:05Z')));
    expect(out).toEqual({
      kind: 'crawl',
      jobId: 'j1',
      exportedAt: '2026-01-02T03:04:05.000Z',
      count: 2,
      documents: docs,
    });
  });
});

describe('documentSourceUrl / documentTitle', () => {
  it('prefers metadata and falls back', () => {
    expect(
      documentSourceUrl({ metadata: { sourceURL: 'https://s.test' }, url: 'https://u.test' }),
    ).toBe('https://s.test');
    expect(documentSourceUrl({ metadata: { url: 'https://m.test' } })).toBe('https://m.test');
    expect(documentSourceUrl({})).toBe('');
    expect(documentTitle({ metadata: { title: 'T' }, url: 'https://u.test' }, 0)).toBe('T');
    expect(documentTitle({ url: 'https://u.test' }, 0)).toBe('https://u.test');
    expect(documentTitle({}, 2)).toBe('Page 3');
  });
});

describe('buildCompiledMarkdown', () => {
  it('bumps headings, caps at 6 and keeps fenced code', () => {
    const md = '# One\n###### Six\n```sh\n# comment\n```\n~~~\n# tilde\n~~~\n## Two\n#nospace';
    const out = buildCompiledMarkdown('All', [{ url: 'https://a.test', markdown: md }]);
    expect(out.startsWith('# All\n\n## https://a.test\n\nSource: https://a.test\n\n')).toBe(true);
    expect(out).toContain('\n## One\n');
    expect(out).toContain('\n###### Six\n');
    expect(out).toContain('\n# comment\n');
    expect(out).toContain('\n# tilde\n');
    expect(out).toContain('\n### Two\n');
    expect(out).toContain('\n#nospace');
  });
  it('only closes a fence on a matching marker at least as long', () => {
    const md = [
      '````md',
      '```',
      '# inside four',
      '```',
      '````',
      '# after',
      '~~~',
      '```',
      '# inside tilde',
      '~~~~',
      '# after tilde',
      '```js',
      '``` not a closer',
      '# still code',
      '```',
    ].join('\n');
    const out = buildCompiledMarkdown('All', [{ markdown: md }]);
    expect(out).toContain('\n# inside four\n');
    expect(out).toContain('\n## after\n');
    expect(out).toContain('\n# inside tilde\n');
    expect(out).toContain('\n## after tilde\n');
    expect(out).toContain('\n# still code\n');
  });
  it('adds a placeholder when markdown is missing', () => {
    const out = buildCompiledMarkdown('All', [{ metadata: { title: 'Only' } }, {}]);
    expect(out).toContain('## Only\n\n_No Markdown content._');
    expect(out).toContain('## Page 2\n\n_No Markdown content._');
    expect(out).not.toContain('Source:');
  });
});

describe('markdownFileNames', () => {
  it('is ordered, unique and safe', () => {
    const names = markdownFileNames([
      { url: 'https://Example.com/Docs/Intro?x=1' },
      { url: 'https://Example.com/Docs/Intro?x=1' },
      { url: 'not a url ../../etc/passwd' },
      {},
      { url: `https://a.test/${'x'.repeat(300)}` },
    ]);
    expect(names[0]).toBe('001-example-com-docs-intro.md');
    expect(names[1]).toBe('002-example-com-docs-intro.md');
    expect(names[3]).toBe('004-page.md');
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^\d{3,}-[a-z0-9-]{1,80}\.md$/);
  });
  it('widens the index past 999 documents', () => {
    const names = markdownFileNames(Array.from({ length: 1000 }, () => ({})));
    expect(names[0]).toBe('0001-page.md');
  });
});

describe('buildMarkdownZipFiles', () => {
  const docs = [
    { url: 'https://a.test/x', metadata: { title: 'He said "hi" \\ ok\nline2' }, markdown: '# Hi' },
    { url: 'https://a.test/y' },
  ];
  it('writes front matter, escaping values', () => {
    const files = buildMarkdownZipFiles(docs);
    expect(files['001-a-test-x.md']).toBe(
      '---\nsource: "https://a.test/x"\ntitle: "He said \\"hi\\" \\\\ ok line2"\n---\n\n# Hi',
    );
    expect(Object.keys(files)).toEqual(['001-a-test-x.md', 'index.md']);
  });
  it('lists every document in index.md', () => {
    const index = buildMarkdownZipFiles(docs)['index.md'];
    expect(index).toContain('001-a-test-x.md');
    expect(index).toContain('https://a.test/y | (no markdown)');
  });
  it('roundtrips through JSZip', async () => {
    const zip = new JSZip();
    const files = buildMarkdownZipFiles(docs);
    for (const [n, c] of Object.entries(files)) zip.file(n, c);
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const loaded = await JSZip.loadAsync(bytes);
    expect(Object.keys(loaded.files).sort()).toEqual(['001-a-test-x.md', 'index.md']);
    expect(await loaded.file('001-a-test-x.md')?.async('string')).toBe(files['001-a-test-x.md']);
  });
});

describe('hasMarkdown', () => {
  it('detects any markdown', () => {
    expect(hasMarkdown([{}, { markdown: '  ' }])).toBe(false);
    expect(hasMarkdown([{}, { markdown: 'x' }])).toBe(true);
  });
});
