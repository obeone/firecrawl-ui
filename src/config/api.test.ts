import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Minimal in-memory Web Storage, since the test environment is Node.
 */
function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
    has: (key: string) => items.has(key),
  };
}

/**
 * Load a fresh copy of the config module, which reads storage at import time.
 */
async function loadConfig(initial: Record<string, string> = {}) {
  const storage = memoryStorage(initial);
  vi.stubGlobal('localStorage', storage);
  vi.resetModules();
  const config = await import('./api');
  return { storage, config };
}

beforeEach(() => {
  vi.stubEnv('VITE_FIRECRAWL_API_KEY', '');
  vi.stubEnv('VITE_FIRECRAWL_API_BASE_URL', '');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('forgetApiKey', () => {
  it('removes the saved key and leaves no key when none was built in', async () => {
    const { storage, config } = await loadConfig({ firecrawl_api_key: 'fc-saved' });
    expect(config.getApiConfig().apiKey).toBe('fc-saved');

    expect(config.forgetApiKey()).toBe(false);

    expect(storage.has('firecrawl_api_key')).toBe(false);
    expect(config.getApiConfig().apiKey).toBe('');
  });

  it('reports that a build-time key is still in use', async () => {
    vi.stubEnv('VITE_FIRECRAWL_API_KEY', 'fc-build');
    const { config } = await loadConfig({ firecrawl_api_key: 'fc-saved' });

    expect(config.forgetApiKey()).toBe(true);
    expect(config.getApiConfig().apiKey).toBe('fc-build');
  });
});

describe('updateApiConfig', () => {
  it('treats an empty key as forgetting the saved one, not saving an empty string', async () => {
    const { storage, config } = await loadConfig({ firecrawl_api_key: 'fc-saved' });

    config.updateApiConfig(undefined, '  ');

    expect(storage.has('firecrawl_api_key')).toBe(false);
    expect(config.getApiConfig().apiKey).toBe('');
  });

  it('falls back to the build-time base URL when the field is cleared', async () => {
    vi.stubEnv('VITE_FIRECRAWL_API_BASE_URL', 'https://firecrawl.example.test/v2');
    const { config } = await loadConfig({ firecrawl_base_url: 'https://other.example.test' });

    config.updateApiConfig('');

    expect(config.getApiConfig().basePath).toBe('https://firecrawl.example.test');
  });
});
