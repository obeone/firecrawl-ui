import { describe, expect, it } from 'vitest';
import {
  buildDocumentTabs,
  getDocumentHtml,
  getDocumentLinks,
  getDocumentMarkdown,
  getDocumentMetadata,
  getDocumentScreenshot,
} from './resultDocument';

describe('document content getters', () => {
  it('return empty values for a missing document', () => {
    expect(getDocumentMarkdown(null)).toBe('');
    expect(getDocumentHtml(null)).toBe('');
    expect(getDocumentLinks(null)).toBe('');
    expect(getDocumentScreenshot(null)).toBe('');
    expect(getDocumentMetadata(null)).toBeNull();
  });

  it('ignore values of the wrong type', () => {
    const doc = { markdown: 1, html: {}, links: 'a', screenshot: [], metadata: 'x' };

    expect(getDocumentMarkdown(doc)).toBe('');
    expect(getDocumentHtml(doc)).toBe('');
    expect(getDocumentLinks(doc)).toBe('');
    expect(getDocumentScreenshot(doc)).toBe('');
    expect(getDocumentMetadata(doc)).toBeNull();
  });

  it('prefer html and fall back to rawHtml', () => {
    expect(getDocumentHtml({ html: '<p>a</p>', rawHtml: '<html>' })).toBe('<p>a</p>');
    expect(getDocumentHtml({ rawHtml: '<html>' })).toBe('<html>');
  });

  it('join links one per line', () => {
    expect(getDocumentLinks({ links: ['https://a.test', 'https://b.test'] })).toBe(
      'https://a.test\nhttps://b.test',
    );
  });

  it('return the metadata object', () => {
    const metadata = { title: 'Title' };
    expect(getDocumentMetadata({ metadata })).toBe(metadata);
  });
});

describe('buildDocumentTabs', () => {
  it('shows only JSON when there is no document', () => {
    expect(buildDocumentTabs(null)).toEqual([{ key: 'json', label: 'JSON' }]);
    expect(buildDocumentTabs(null, { includePreview: true })).toEqual([
      { key: 'json', label: 'JSON' },
    ]);
  });

  it('lists every tab backed by data, in order', () => {
    const doc = {
      markdown: '# a',
      html: '<h1>a</h1>',
      links: ['https://a.test'],
      screenshot: 'data:image/png;base64,AAAA',
      metadata: { title: 'a' },
    };

    expect(buildDocumentTabs(doc, { includePreview: true }).map((tab) => tab.key)).toEqual([
      'preview',
      'markdown',
      'html',
      'links',
      'screenshot',
      'metadata',
      'json',
    ]);
  });

  it('adds Preview only on request and only with markdown or HTML', () => {
    expect(buildDocumentTabs({ markdown: '# a' }).map((tab) => tab.key)).toEqual([
      'markdown',
      'json',
    ]);
    expect(
      buildDocumentTabs({ rawHtml: '<html>' }, { includePreview: true }).map((tab) => tab.key),
    ).toEqual(['preview', 'html', 'json']);
    expect(
      buildDocumentTabs({ links: ['https://a.test'] }, { includePreview: true }).map(
        (tab) => tab.key,
      ),
    ).toEqual(['links', 'json']);
  });

  it('skips empty links lists', () => {
    expect(buildDocumentTabs({ links: [] }).map((tab) => tab.key)).toEqual(['json']);
  });
});
