<template>
  <PlaygroundLayout
    title="Extract Data"
    subtitle="Pull structured data from one or more URLs using a prompt or JSON schema."
    :tabs="responseTabs"
    :running="loading"
    :error="error || null"
    :has-result="hasResult"
    :status="statusLabel"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Provide a URL or prompt and click Extract to see structured results."
  >
    <!-- ── REQUEST pane ─────────────────────────────────────── -->
    <template #request>
      <div class="deprecation-warning" role="alert">
        <strong>/v2/extract is deprecated.</strong>
        Use
        <router-link :to="{ name: 'scrape' }">Scrape</router-link>
        with a <code>json</code> output format instead. On the Scrape page, select the
        <code>JSON (Structured Extraction)</code> format and provide a prompt and/or JSON schema to
        extract structured data.
      </div>

      <form @submit.prevent="runExtraction" class="extract-form">
        <div class="form-group">
          <label for="url-input">URLs (optional, one per line)</label>
          <small class="hint">Leave blank when providing only a prompt.</small>
          <textarea
            id="url-input"
            v-model="urlInput"
            rows="4"
            placeholder="https://example.com/blog/*"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="prompt-input">Prompt</label>
          <textarea
            id="prompt-input"
            v-model="promptInput"
            rows="3"
            placeholder="Describe the data to extract"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="schema-input">JSON Schema (optional)</label>
          <small class="hint">
            A JSON Schema document, not a shape by example: describe each field with its own
            <code>type</code>.
          </small>
          <textarea
            id="schema-input"
            v-model="schemaString"
            rows="5"
            placeholder='{"type": "object", "properties": {"title": {"type": "string"}}}'
          ></textarea>
          <small v-if="schemaError" class="schema-error">{{ schemaError }}</small>
        </div>

        <div class="options">
          <label>
            <input type="checkbox" v-model="options.enableWebSearch" />
            Enable Web Search
          </label>
          <label>
            <input type="checkbox" v-model="options.showSources" />
            Show Sources
          </label>
          <label>
            <input type="checkbox" v-model="options.allowExternalLinks" />
            Allow External Links
          </label>
          <label>
            <input type="checkbox" v-model="options.ignoreSitemap" />
            Ignore Sitemap
          </label>
          <label>
            <input type="checkbox" v-model="options.includeSubdomains" />
            Include Subdomains
          </label>
          <label>
            <input type="checkbox" v-model="options.ignoreInvalidURLs" />
            Ignore Invalid URLs
          </label>
        </div>

        <!-- Scrape Options: controls forwarded as `scrapeOptions` to /v2/extract,
             mirroring how ScrapeView groups its own page/scrape options. -->
        <fieldset class="form-group options-fieldset">
          <legend
            class="collapsible-header"
            @click="isScrapeOptionsCollapsed = !isScrapeOptionsCollapsed"
          >
            Scrape Options
          </legend>
          <div v-show="!isScrapeOptionsCollapsed">
            <div class="form-group">
              <label>Formats</label>
              <div class="checkbox-grid">
                <label
                  v-for="format in availableFormats"
                  :key="format.value"
                  class="checkbox-label"
                >
                  <input type="checkbox" :value="format.value" v-model="scrapeOptions.formats" />
                  {{ format.label }}
                </label>
              </div>
            </div>

            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.onlyMainContent" />
              Only Main Content
            </label>

            <div class="form-group">
              <label for="include-tags-input">Include Tags (comma separated)</label>
              <input
                id="include-tags-input"
                type="text"
                v-model="scrapeOptions.includeTags"
                placeholder="e.g. p, div, span"
              />
            </div>

            <div class="form-group">
              <label for="exclude-tags-input">Exclude Tags (comma separated)</label>
              <input
                id="exclude-tags-input"
                type="text"
                v-model="scrapeOptions.excludeTags"
                placeholder="e.g. script, style"
              />
            </div>

            <div class="grid-layout">
              <div class="form-group">
                <label for="wait-for-input">Wait For (ms)</label>
                <input
                  id="wait-for-input"
                  type="number"
                  min="0"
                  v-model.number="scrapeOptions.waitFor"
                />
              </div>
              <div class="form-group">
                <label for="timeout-input">Timeout (ms)</label>
                <input
                  id="timeout-input"
                  type="number"
                  min="0"
                  v-model.number="scrapeOptions.timeout"
                />
              </div>
              <div class="form-group">
                <label for="max-age-input">Max Age (ms)</label>
                <input
                  id="max-age-input"
                  type="number"
                  min="0"
                  v-model.number="scrapeOptions.maxAge"
                />
              </div>
              <div class="form-group">
                <label for="proxy-select">Proxy</label>
                <select id="proxy-select" v-model="scrapeOptions.proxy">
                  <option value="auto">Auto</option>
                  <option value="basic">Basic</option>
                  <option value="stealth">Stealth</option>
                </select>
              </div>
            </div>

            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.mobile" />
              Emulate Mobile Device
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.blockAds" />
              Block Ads & Popups
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.removeBase64Images" />
              Remove Base64 Images
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.skipTlsVerification" />
              Skip TLS Verification
            </label>
            <label class="checkbox-label">
              <input type="checkbox" v-model="scrapeOptions.storeInCache" />
              Store In Cache
            </label>

            <div class="grid-layout">
              <div class="form-group">
                <label for="location-country-input">Location Country</label>
                <input
                  id="location-country-input"
                  type="text"
                  v-model="scrapeOptions.locationCountry"
                  placeholder="e.g. US"
                />
              </div>
              <div class="form-group">
                <label for="location-languages-input">Location Languages (comma separated)</label>
                <input
                  id="location-languages-input"
                  type="text"
                  v-model="scrapeOptions.locationLanguages"
                  placeholder="e.g. en-US"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="headers-input">HTTP Headers (JSON)</label>
              <textarea
                id="headers-input"
                v-model="headersString"
                rows="3"
                placeholder='{"Authorization": "Bearer token"}'
              ></textarea>
              <small v-if="headersError" class="error-message">{{ headersError }}</small>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          class="run-button"
          :disabled="loading || !!schemaError || !!headersError"
        >
          {{ loading ? 'Running…' : 'Extract' }}
        </button>
      </form>
    </template>

    <!-- ── RESPONSE actions (download button) ──────────────── -->
    <template #response-actions>
      <button type="button" v-if="hasResult" class="action-button" @click="downloadResult">
        Download JSON
      </button>
    </template>

    <!-- ── RESPONSE pane ────────────────────────────────────── -->
    <template #response="{ activeTab }">
      <!-- Invalid URLs warning: shown above the result whenever the API rejected
           one or more requested URLs. Reuses the deprecation banner's warning-hue
           styling instead of introducing a new color token. -->
      <div v-if="invalidUrls.length" class="deprecation-warning invalid-urls-warning" role="alert">
        <strong>{{ invalidUrls.length }} invalid URL(s) were rejected by the API:</strong>
        <ul>
          <li v-for="url in invalidUrls" :key="url">{{ url }}</li>
        </ul>
      </div>

      <!-- Result tab: a human-readable key/value view of the extracted data -->
      <div v-if="activeTab === 'result'" class="result-view">
        <template v-if="resultIsObject">
          <div
            v-for="(value, key) in result as Record<string, unknown>"
            :key="String(key)"
            class="result-row"
          >
            <span class="result-key">{{ key }}</span>
            <span class="result-value">{{ formatValue(value) }}</span>
          </div>
        </template>
        <template v-else>
          <!-- Scalar or array result: fall back to pre-formatted text -->
          <pre class="result-scalar">{{ formattedResult }}</pre>
        </template>
      </div>

      <!-- JSON tab: raw pretty-printed output via CodeBlock -->
      <CodeBlock v-else-if="activeTab === 'json'" :json="result" label="JSON" />

      <!-- Sources tab: per-key list of source URLs used to build the result. -->
      <div v-else-if="activeTab === 'sources'" class="result-view sources-view">
        <div v-for="(urls, key) in sourcesMap" :key="String(key)" class="sources-group">
          <span class="result-key">{{ key }}</span>
          <ul class="sources-list">
            <li v-for="url in urls" :key="url">
              <a :href="url" target="_blank" rel="noopener noreferrer">{{ url }}</a>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </PlaygroundLayout>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import type { FirecrawlExtractResponse, FirecrawlExtractionApi } from '@/services/firecrawl';
import PlaygroundLayout from '../components/playground/PlaygroundLayout.vue';
import CodeBlock from '../components/playground/CodeBlock.vue';

/**
 * Injection of the API client. The apiPlugin must provide an `extraction` instance.
 */
const api = inject('api') as { extraction?: FirecrawlExtractionApi } | undefined;
if (!api?.extraction) {
  throw new Error('Extraction API is not available');
}

const urlInput = ref(''); // Stores the URLs entered by the user.
const promptInput = ref(''); // Stores the prompt for data extraction.

const route = useRoute();

// Pre-fill the URL textarea from the ?url= query parameter (passed by the
// home-page launcher when the user picks a tool with a URL already typed).
onMounted(() => {
  const q = route.query.url;
  const initialUrl = Array.isArray(q) ? q[0] : q;
  if (initialUrl) {
    urlInput.value = String(initialUrl);
  }
});
const schemaString = ref(''); // Stores the JSON schema string provided by the user.
/**
 * Top-level /v2/extract options. Defaults mirror the API's own defaults
 * (`includeSubdomains` and `ignoreInvalidURLs` default to true server-side)
 * so the payload builder below can detect and omit unchanged values.
 */
const options = ref({
  enableWebSearch: false,
  showSources: false,
  allowExternalLinks: false,
  ignoreSitemap: false,
  includeSubdomains: true,
  ignoreInvalidURLs: true,
});
const loading = ref(false); // Indicates if an extraction request is in progress.
const error = ref(''); // Stores any error messages from the extraction process.
const result = ref<FirecrawlExtractResponse['data'] | null>(null); // Stores the successful extraction result.
const schemaError = ref<string | null>(null); // Stores error messages related to JSON schema parsing.
const parsedSchema = ref<any>(undefined); // Holds the parsed schema object.
const durationMs = ref<number | null>(null); // Request round-trip duration in milliseconds.

/**
 * The full, final /v2/extract response (post-polling), kept alongside `result`
 * so the response pane can surface fields other than `data` — namely
 * `invalidURLs` and `sources` — without disturbing the existing success/error
 * handling that only ever looked at `data`.
 */
const fullResponse = ref<FirecrawlExtractResponse | null>(null);

/** Checkbox options for the `scrapeOptions.formats` field. */
const availableFormats = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Links' },
  { value: 'summary', label: 'Summary' },
] as const;

/**
 * `scrapeOptions` sub-object forwarded to /v2/extract. Values are seeded with
 * the API's own defaults so the payload builder can send only the fields the
 * user actually changed, keeping the request body readable.
 */
const scrapeOptions = ref({
  formats: ['markdown'] as string[],
  onlyMainContent: true,
  includeTags: '',
  excludeTags: '',
  waitFor: 0,
  timeout: 60000,
  maxAge: 172800000,
  mobile: false,
  blockAds: true,
  removeBase64Images: false,
  skipTlsVerification: false,
  storeInCache: true,
  proxy: 'auto' as 'auto' | 'basic' | 'stealth',
  locationCountry: '',
  locationLanguages: '',
});

/** Whether the "Scrape Options" fieldset is collapsed, matching ScrapeView's pattern. */
const isScrapeOptionsCollapsed = ref(true);

const headersString = ref(''); // Stores the HTTP headers JSON string provided by the user.
const headersError = ref<string | null>(null); // Stores error messages related to headers JSON parsing.
const parsedHeaders = ref<Record<string, string> | undefined>(undefined); // Holds the parsed headers object.

/**
 * Watcher to parse the schema string and update the parsed schema.
 * Sets an error message if parsing fails.
 */
watch(
  schemaString,
  (newVal) => {
    if (!newVal.trim()) {
      schemaError.value = null;
      parsedSchema.value = undefined;
      return;
    }
    try {
      parsedSchema.value = JSON.parse(newVal);
      schemaError.value = null;
    } catch (e: any) {
      schemaError.value = e.message;
      parsedSchema.value = null;
    }
  },
  { immediate: true },
);

/**
 * Watcher to parse the headers string and update the parsed headers.
 * Sets an error message if parsing fails, mirroring the schema watcher above.
 */
watch(
  headersString,
  (newVal) => {
    if (!newVal.trim()) {
      headersError.value = null;
      parsedHeaders.value = undefined;
      return;
    }
    try {
      parsedHeaders.value = JSON.parse(newVal);
      headersError.value = null;
    } catch (e: any) {
      headersError.value = e.message;
      parsedHeaders.value = undefined;
    }
  },
  { immediate: true },
);

/** Format result as pretty JSON. */
const formattedResult = computed(() => (result.value ? JSON.stringify(result.value, null, 2) : ''));

/** True when the result is a plain object (enables the key/value view). */
const resultIsObject = computed(
  () => result.value !== null && typeof result.value === 'object' && !Array.isArray(result.value),
);

/** Whether a result is available to display. */
const hasResult = computed(() => result.value !== null);

/** Status label shown in the PlaygroundLayout status bar. */
const statusLabel = computed<string | null>(() => {
  if (result.value !== null) return 'Success';
  if (error.value) return 'Failed';
  return null;
});

/** Semantic status type for the PlaygroundLayout status dot. */
const statusType = computed<'success' | 'error' | 'idle'>(() => {
  if (result.value !== null) return 'success';
  if (error.value) return 'error';
  return 'idle';
});

/** Response tabs shown in the PlaygroundLayout tab bar. */
const responseTabs = computed(() => {
  const tabs = [
    { key: 'result', label: 'Result' },
    { key: 'json', label: 'JSON' },
  ];
  // Only offer the Sources tab when the response actually carries sources —
  // it is empty unless the request set `showSources: true`.
  if (Object.keys(sourcesMap.value).length > 0) {
    tabs.push({ key: 'sources', label: 'Sources' });
  }
  return tabs;
});

/**
 * URLs from the request that the API rejected as invalid. Empty when the
 * response carries none, which also hides the warning strip in the template.
 */
const invalidUrls = computed<string[]>(() => fullResponse.value?.invalidURLs ?? []);

/**
 * Normalize a single `sources` entry into a flat list of URL strings. Entries
 * may be plain URL strings or objects carrying a `url` field, similarly to
 * how `mapUrls` normalizes its own link entries in the adapter layer.
 *
 * @param value - A single value from the `sources` response map.
 * @returns The URLs found in that value.
 */
function toSourceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && typeof (entry as any).url === 'string') {
        return (entry as any).url as string;
      }
      return undefined;
    })
    .filter((url): url is string => Boolean(url));
}

/**
 * The response's `sources` map normalized to `Record<string, string[]>` for
 * the Sources tab. Empty when the response has no non-empty sources.
 */
const sourcesMap = computed<Record<string, string[]>>(() => {
  const sources = fullResponse.value?.sources;
  if (!sources || typeof sources !== 'object') return {};
  const entries = Object.entries(sources)
    .map(([key, value]) => [key, toSourceUrls(value)] as const)
    .filter(([, urls]) => urls.length > 0);
  return Object.fromEntries(entries);
});

/**
 * Format a single value for display in the result key/value view.
 *
 * @param value - The value to format.
 * @returns A human-readable string representation.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Build the `scrapeOptions` sub-object for the /v2/extract payload.
 *
 * This is a playground UI, so the request body should stay readable: rather
 * than echoing every field back at its current value, only fields that
 * differ from the API's own documented default are included. When nothing
 * deviates, `undefined` is returned so the caller omits `scrapeOptions`
 * entirely, matching the "send only what changed" rule for the whole payload.
 *
 * @returns The scrapeOptions object to forward, or undefined when every field
 * still matches its API default.
 */
function buildScrapeOptions(): Record<string, unknown> | undefined {
  const opts = scrapeOptions.value;
  const scrapeOptionsPayload: Record<string, unknown> = {};

  // formats: default is exactly ["markdown"]. Any other selection (including
  // additional formats, or none at all) is sent explicitly.
  const isDefaultFormats = opts.formats.length === 1 && opts.formats[0] === 'markdown';
  if (!isDefaultFormats && opts.formats.length > 0) {
    scrapeOptionsPayload.formats = opts.formats;
  }

  if (opts.onlyMainContent === false) scrapeOptionsPayload.onlyMainContent = false;

  const includeTags = opts.includeTags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  if (includeTags.length) scrapeOptionsPayload.includeTags = includeTags;

  const excludeTags = opts.excludeTags
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag);
  if (excludeTags.length) scrapeOptionsPayload.excludeTags = excludeTags;

  if (opts.waitFor !== 0) scrapeOptionsPayload.waitFor = opts.waitFor;
  if (opts.timeout !== 60000) scrapeOptionsPayload.timeout = opts.timeout;
  if (opts.maxAge !== 172800000) scrapeOptionsPayload.maxAge = opts.maxAge;
  if (opts.mobile === true) scrapeOptionsPayload.mobile = true;
  if (opts.blockAds === false) scrapeOptionsPayload.blockAds = false;
  if (opts.removeBase64Images === true) scrapeOptionsPayload.removeBase64Images = true;
  if (opts.skipTlsVerification === true) scrapeOptionsPayload.skipTlsVerification = true;
  if (opts.storeInCache === false) scrapeOptionsPayload.storeInCache = false;
  if (opts.proxy !== 'auto') scrapeOptionsPayload.proxy = opts.proxy;

  const languages = opts.locationLanguages
    .split(',')
    .map((lang) => lang.trim())
    .filter((lang) => lang);
  const location: Record<string, unknown> = {
    ...(opts.locationCountry.trim() && { country: opts.locationCountry.trim() }),
    ...(languages.length && { languages }),
  };
  if (Object.keys(location).length) scrapeOptionsPayload.location = location;

  if (parsedHeaders.value && Object.keys(parsedHeaders.value).length) {
    scrapeOptionsPayload.headers = parsedHeaders.value;
  }

  return Object.keys(scrapeOptionsPayload).length ? scrapeOptionsPayload : undefined;
}

/**
 * Send the extraction request to the API.
 */
const runExtraction = async (): Promise<void> => {
  if (schemaError.value || headersError.value) return;

  const urls = urlInput.value
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u);
  if (!urls.length && !promptInput.value.trim()) {
    error.value = 'Please provide at least one URL or a prompt.';
    return;
  }

  const scrapeOptionsPayload = buildScrapeOptions();

  const payload = {
    ...(urls.length && { urls }),
    ...(promptInput.value && { prompt: promptInput.value }),
    ...(parsedSchema.value && { schema: parsedSchema.value }),
    ...(options.value.enableWebSearch && { enableWebSearch: true }),
    ...(options.value.showSources && { showSources: true }),
    ...(options.value.allowExternalLinks && { allowExternalLinks: true }),
    // ignoreSitemap and allowExternalLinks default to false, so only send them
    // when the user turned them on.
    ...(options.value.ignoreSitemap && { ignoreSitemap: true }),
    // includeSubdomains and ignoreInvalidURLs default to true API-side, so
    // only send them when the user turned them off.
    ...(options.value.includeSubdomains === false && { includeSubdomains: false }),
    ...(options.value.ignoreInvalidURLs === false && { ignoreInvalidURLs: false }),
    ...(scrapeOptionsPayload && { scrapeOptions: scrapeOptionsPayload }),
  };

  try {
    loading.value = true;
    error.value = '';
    durationMs.value = null;
    fullResponse.value = null;
    const t0 = performance.now();
    const response = await api.extraction.extractData(payload);
    durationMs.value = performance.now() - t0;
    const respData = response.data;
    // Keep the full response around (invalidURLs, sources, ...) regardless of
    // outcome, so the response pane can surface it alongside the error state.
    fullResponse.value = respData;
    if (respData.success && (respData as any).data) {
      result.value = (respData as any).data;
    } else {
      throw new Error((respData as any).error || 'Extraction failed');
    }
  } catch (err: any) {
    error.value = err?.message || 'Request failed';
    result.value = null;
  } finally {
    loading.value = false;
  }
};

/**
 * Download the JSON result to a file.
 */
const downloadResult = (): void => {
  if (!result.value) return;
  const blob = new Blob([JSON.stringify(result.value, null, 2)], {
    type: 'application/json',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'extraction_result.json';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
/* ── Form layout ──────────────────────────────────────────────── */

/*
 * Deprecation banner: glass card tinted with the warning hue, pointing users
 * to the Scrape page + JSON format as the supported replacement for /v2/extract.
 */
.deprecation-warning {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--hue-warning);
  border-left: 4px solid var(--hue-warning);
  border-radius: var(--radius-sm);
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  color: var(--color-text);
  font-size: 0.85rem;
  line-height: 1.55;
}

.deprecation-warning a {
  color: var(--hue-warning);
  font-weight: 700;
  text-decoration: underline;
}

.deprecation-warning code {
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm);
  background: var(--color-background-soft);
  font-family: var(--font-mono);
  font-size: 0.82em;
}

.extract-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-heading);
}

/*
 * Textareas: translucent glass fill so the aurora tints the field subtly.
 * Inherits global focus halo (--shadow-ring / violet-500) from base.css.
 */
.form-group textarea {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.84rem;
  /* Semi-transparent so the aurora bleeds through subtly. */
  background: var(--color-background-soft);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: var(--color-text);
  resize: vertical;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  box-sizing: border-box;
}

/* Soft violet focus halo matching the global ring system. */
.form-group textarea:focus {
  outline: none;
  border-color: var(--violet-500);
  box-shadow: var(--shadow-ring);
}

.hint {
  font-size: 0.78rem;
  color: var(--color-text-mute);
}

.schema-error {
  font-size: 0.78rem;
  color: var(--hue-danger);
}

/* ── Options checkboxes ───────────────────────────────────────── */

.options {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.options label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--color-text);
  cursor: pointer;
}

/* Checkbox accent in violet to match the aurora brand. */
.options input[type='checkbox'] {
  accent-color: var(--violet-500);
  width: 15px;
  height: 15px;
}

/* ── Scrape Options fieldset ──────────────────────────────────── */

/*
 * Collapsible glass card for the scrapeOptions group, matching the
 * .options-fieldset / .collapsible-header pattern used by ScrapeView so the
 * two playground forms read as one system.
 */
.options-fieldset {
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  padding: 1rem;
  border-radius: var(--radius-md);
}

.options-fieldset legend {
  font-weight: 700;
  padding: 0 0.4rem;
  color: var(--color-heading);
}

.collapsible-header {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.collapsible-header:hover {
  color: var(--brand-strong);
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.45rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--color-text);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--violet-500);
  width: 15px;
  height: 15px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.options-fieldset input[type='text'],
.options-fieldset input[type='number'],
.options-fieldset select {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.84rem;
  background: var(--color-background-soft);
  color: var(--color-text);
  box-sizing: border-box;
}

/* Inline validation error text — danger hue from the token set. */
.error-message {
  display: block;
  font-size: 0.78rem;
  color: var(--hue-danger);
  margin-top: 0.2rem;
}

/* ── Run button ────────────────────────────────────────────────── */

/*
 * Primary action button: violet→cyan aurora sweep with a neon glow.
 * Hover lifts the button (+translateY) and brightens the gradient, matching
 * the HomeView CTA pattern for a consistent feel across views.
 */
.run-button {
  align-self: flex-start;
  padding: 0.55rem 1.4rem;
  /* Violet→cyan sweep — the aurora brand gradient. */
  background: var(--gradient-violet);
  color: #fff;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--box-shadow-button);
  transition:
    background var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.run-button:hover:not(:disabled) {
  background: var(--gradient-violet-hover);
  transform: translateY(-2px);
  /* Soft violet glow on hover, matching HomeView CTA hover. */
  box-shadow: 0 10px 28px -6px rgba(124, 92, 255, 0.6);
}

.run-button:active:not(:disabled) {
  transform: translateY(0);
}

.run-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── Response-actions Download button ─────────────────────────── */

/*
 * Secondary ghost button: frosted glass background with a violet border/glow
 * on hover, consistent with the .btn-secondary pattern in main.css.
 */
.action-button {
  padding: 0.35rem 0.85rem;
  /* Translucent glass base so the aurora reads through. */
  background: var(--glass-fill);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  color: var(--color-heading);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.action-button:hover {
  /* Violet accent halo matches the tool-card hover pattern from HomeView. */
  border-color: var(--violet-500);
  color: var(--brand-strong);
  background: var(--brand-soft);
  box-shadow: 0 0 0 1px rgba(124, 92, 255, 0.18);
}

/* ── Result tab: key/value view ───────────────────────────────── */

.result-view {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1rem;
  gap: 0;
}

.result-row {
  display: grid;
  grid-template-columns: minmax(120px, 30%) 1fr;
  gap: 0.75rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
  align-items: baseline;
}

.result-row:last-child {
  border-bottom: none;
}

.result-key {
  font-size: 0.8rem;
  font-weight: 700;
  /* Soft brand hint on the key label — subtle aurora identity. */
  color: var(--color-text-mute);
  text-transform: lowercase;
  letter-spacing: 0.03em;
  word-break: break-word;
}

.result-value {
  font-size: 0.88rem;
  color: var(--color-text);
  word-break: break-word;
  font-family: var(--font-mono);
}

/* ── Result tab: scalar/array fallback ────────────────────────── */

.result-scalar {
  margin: 0;
  padding: 1rem;
  font-family: var(--font-mono);
  font-size: 0.84rem;
  line-height: 1.6;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
}

/* ── Invalid URLs warning strip ───────────────────────────────── */

/*
 * Reuses .deprecation-warning's glass + warning-hue treatment so the response
 * pane's invalid-URLs notice reads as the same visual language as the
 * request pane's deprecation banner, rather than introducing a new hue.
 */
.invalid-urls-warning {
  margin: 1rem 1rem 0;
}

.invalid-urls-warning ul {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}

.invalid-urls-warning li {
  font-family: var(--font-mono);
  font-size: 0.8em;
  word-break: break-all;
}

/* ── Sources tab ──────────────────────────────────────────────── */

.sources-group {
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);
}

.sources-group:last-child {
  border-bottom: none;
}

.sources-list {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}

.sources-list a {
  color: var(--brand-strong);
  font-family: var(--font-mono);
  font-size: 0.84rem;
  word-break: break-all;
  text-decoration: underline;
}

.sources-list a:hover {
  text-decoration: none;
}
</style>
