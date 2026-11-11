import { describe, expect, it } from 'vitest';
import { toSearchResults } from './searchResults';

const samples = {
  french: 'Énergie : où en est la filière française ? Ça avance, déjà « 30 % »',
  cjk: '中文搜索结果 日本語のタイトル 한국어 제목',
  cjkSingle: '中',
  emoji: 'Release notes 🚀🔥 — family 👨‍👩‍👧 and flags 🇫🇷',
};

describe('toSearchResults', () => {
  it.each(Object.entries(samples))('keeps %s text intact', (_name, text) => {
    const [web, news, image] = toSearchResults({
      web: [
        {
          title: text,
          url: 'https://example.test/a',
          description: text,
          markdown: `# ${text}`,
          metadata: { title: text, description: text },
        },
      ],
      news: [{ title: text, url: 'https://example.test/b', snippet: text, date: text }],
      images: [{ title: text, url: 'https://example.test/c', imageUrl: 'https://example.test/i' }],
    });

    expect(web.title).toBe(text);
    expect(web.description).toBe(text);
    expect(web.markdown).toBe(`# ${text}`);
    expect(web.metadata).toEqual({ title: text, description: text });
    expect(news.title).toBe(text);
    expect(news.description).toBe(text);
    expect(news.date).toBe(text);
    expect(image.title).toBe(text);
  });

  it('labels each group and falls back to the URL for untitled news and images', () => {
    const results = toSearchResults({
      web: [{ title: 'w', url: 'https://example.test/w' }],
      news: [{ url: 'https://example.test/n' }],
      images: [{}],
    });

    expect(results.map((r) => r.sourceType)).toEqual(['web', 'news', 'images']);
    expect(results[1].title).toBe('https://example.test/n');
    expect(results[2].title).toBe('Untitled image');
  });
});
