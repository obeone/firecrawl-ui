<template>
  <PlaygroundLayout
    title="Extract Data"
    subtitle="Pull structured data from one or more pages using a prompt or JSON schema."
    :tabs="responseTabs"
    :running="loading"
    :error="error || null"
    :has-result="hasResult"
    :status="statusLabel"
    :status-type="statusType"
    :duration="durationMs"
    empty-hint="Provide a URL and a prompt or schema, then click Extract to see structured results."
  >
    <!-- ── REQUEST pane ─────────────────────────────────────── -->
    <template #request>
      <form class="extract-form" @submit.prevent="runExtraction">
        <div class="form-group">
          <label for="url-input">URLs (one per line)</label>
          <small class="hint">
            Each URL is scraped on its own with the <code>json</code> format of
            <code>/v2/scrape</code>, and billed as one scrape.
          </small>
          <textarea
            id="url-input"
            v-model="urlInput"
            rows="4"
            placeholder="https://example.com/pricing"
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

        <!-- Scrape Options: forwarded with the json format to /v2/scrape. -->
        <OptionsDisclosure
          v-model:collapsed="isScrapeOptionsCollapsed"
          class="extract-scrape-options"
          title="Scrape Options"
        >
          <label class="checkbox-label">
            <input v-model="scrapeOptions.onlyMainContent" type="checkbox" />
            Only Main Content
          </label>

          <div class="form-group">
            <label for="include-tags-input">Include Tags (comma separated)</label>
            <input
              id="include-tags-input"
              v-model="scrapeOptions.includeTags"
              type="text"
              placeholder="e.g. p, div, span"
            />
          </div>

          <div class="form-group">
            <label for="exclude-tags-input">Exclude Tags (comma separated)</label>
            <input
              id="exclude-tags-input"
              v-model="scrapeOptions.excludeTags"
              type="text"
              placeholder="e.g. script, style"
            />
          </div>

          <div class="grid-layout">
            <div class="form-group">
              <label for="wait-for-input">Wait For (ms)</label>
              <input
                id="wait-for-input"
                v-model.number="scrapeOptions.waitFor"
                type="number"
                min="0"
              />
            </div>
            <div class="form-group">
              <label for="timeout-input">Timeout (ms)</label>
              <input
                id="timeout-input"
                v-model.number="scrapeOptions.timeout"
                type="number"
                min="0"
              />
            </div>
            <div class="form-group">
              <label for="max-age-input">Max Age (ms)</label>
              <input
                id="max-age-input"
                v-model.number="scrapeOptions.maxAge"
                type="number"
                min="0"
              />
            </div>
            <div class="form-group">
              <label for="proxy-select">Proxy</label>
              <select id="proxy-select" v-model="scrapeOptions.proxy">
                <option value="auto">Auto</option>
                <option value="basic">Basic</option>
                <option value="enhanced">Enhanced</option>
                <option value="stealth">Stealth</option>
              </select>
            </div>
          </div>

          <label class="checkbox-label">
            <input v-model="scrapeOptions.mobile" type="checkbox" />
            Emulate Mobile Device
          </label>
          <label class="checkbox-label">
            <input v-model="scrapeOptions.blockAds" type="checkbox" />
            Block Ads & Popups
          </label>
          <label class="checkbox-label">
            <input v-model="scrapeOptions.removeBase64Images" type="checkbox" />
            Remove Base64 Images
          </label>
          <label class="checkbox-label">
            <input v-model="scrapeOptions.skipTlsVerification" type="checkbox" />
            Skip TLS Verification
          </label>
          <label class="checkbox-label">
            <input v-model="scrapeOptions.storeInCache" type="checkbox" />
            Store In Cache
          </label>

          <div class="grid-layout">
            <div class="form-group">
              <label for="location-country-input">Location Country</label>
              <input
                id="location-country-input"
                v-model="scrapeOptions.locationCountry"
                type="text"
                placeholder="e.g. US"
              />
              <small v-if="countryError" class="error-message">{{ countryError }}</small>
            </div>
            <div class="form-group">
              <label for="location-languages-input">Location Languages (comma separated)</label>
              <input
                id="location-languages-input"
                v-model="scrapeOptions.locationLanguages"
                type="text"
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
        </OptionsDisclosure>

        <button type="submit" class="run-button" :disabled="loading || !!formError">
          {{ loading ? progressLabel : 'Extract' }}
        </button>
      </form>
    </template>

    <!-- ── RESPONSE actions (download button) ──────────────── -->
    <template #response-actions>
      <button v-if="hasResult" type="button" class="action-button" @click="downloadResult">
        Download JSON
      </button>
    </template>

    <!-- ── RESPONSE pane ────────────────────────────────────── -->
    <template #response="{ activeTab }">
      <!-- Failed URLs: pages that returned no data while others succeeded. -->
      <div
        v-if="hasResult && failedPages.length"
        class="warning-strip failed-urls-warning"
        role="alert"
      >
        <strong>{{ failedPages.length }} URL(s) returned no data:</strong>
        <ul>
          <li v-for="page in failedPages" :key="page.url">{{ page.url }}: {{ page.error }}</li>
        </ul>
      </div>

      <!-- Result tab: a human-readable key/value view of the extracted data -->
      <div v-if="activeTab === 'result'" class="result-view">
        <template v-if="resultRows">
          <div v-for="row in resultRows" :key="row.key" class="result-row">
            <span class="result-key">{{ row.key }}</span>
            <span class="result-value">{{ row.value }}</span>
          </div>
        </template>
        <template v-else>
          <!-- Scalar or array result: fall back to pre-formatted text -->
          <pre class="result-scalar">{{ formattedResult }}</pre>
        </template>
      </div>

      <!-- JSON tab: raw pretty-printed output via CodeBlock -->
      <CodeBlock v-else-if="activeTab === 'json'" :json="result" label="JSON" />
    </template>
  </PlaygroundLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useApi } from '@/plugins/api';
import { describeRequestError, getErrorMessage, isUnauthorized } from '@/utils/errors';
import { checkCountryCode, firstFormError } from '@/utils/formValidation';
import { createLatestGuard } from '@/utils/latestGuard';
import {
  buildExtractRun,
  combineExtractResults,
  defaultExtractScrapeOptions,
  parseExtractUrls,
  runExtractRequests,
  toResultRows,
  type ExtractPageResult,
  type ExtractRunRequest,
} from '@/utils/extractRequest';
import PlaygroundLayout from '../components/playground/PlaygroundLayout.vue';
import CodeBlock from '../components/playground/CodeBlock.vue';
import OptionsDisclosure from '@/components/OptionsDisclosure.vue';

/** The Firecrawl adapter clients; extraction goes through `scraping`. */
const api = useApi();
const route = useRoute();
const router = useRouter();

/** Drops answers from a run the user has already replaced or left. */
const guard = createLatestGuard();
onBeforeUnmount(() => guard.invalidate());

const urlInput = ref(''); // Newline-separated URLs typed by the user.
const promptInput = ref(''); // Prompt describing the data to extract.
const schemaString = ref(''); // JSON schema text typed by the user.

// Pre-fill the URL textarea from the ?url= query parameter (passed by the
// home-page launcher when the user picks a tool with a URL already typed).
onMounted(() => {
  const q = route.query.url;
  const initialUrl = Array.isArray(q) ? q[0] : q;
  if (initialUrl) {
    urlInput.value = String(initialUrl);
  }
});

const loading = ref(false); // Whether an extraction is running.
const error = ref(''); // Error shown in the response pane.
const result = ref<unknown>(null); // Combined extracted data, `null` when none.
const pages = ref<ExtractPageResult[]>([]); // Per-URL outcome of the last run.
const progress = ref({ done: 0, total: 0 }); // Pages processed in the current run.
const durationMs = ref<number | null>(null); // Round-trip duration of the whole run.

const schemaError = ref<string | null>(null); // Schema JSON parse error.
const parsedSchema = ref<Record<string, unknown> | undefined>(undefined); // Parsed schema.

/** Scrape options sent with the json format, seeded with the v2 defaults. */
const scrapeOptions = ref(defaultExtractScrapeOptions());

/** Whether the "Scrape Options" fieldset is collapsed, matching ScrapeView's pattern. */
const isScrapeOptionsCollapsed = ref(true);

const headersString = ref(''); // HTTP headers JSON text typed by the user.
const headersError = ref<string | null>(null); // Headers JSON parse error.
const parsedHeaders = ref<Record<string, string> | undefined>(undefined); // Parsed headers.

/**
 * Parse the schema text, keeping an error when it is not a JSON object.
 */
watch(
  schemaString,
  (newVal) => {
    parsedSchema.value = undefined;
    if (!newVal.trim()) {
      schemaError.value = null;
      return;
    }
    try {
      const parsed: unknown = JSON.parse(newVal);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        schemaError.value = 'The schema must be a JSON object.';
        return;
      }
      parsedSchema.value = parsed as Record<string, unknown>;
      schemaError.value = null;
    } catch (e) {
      schemaError.value = getErrorMessage(e);
    }
  },
  { immediate: true },
);

/**
 * Parse the headers text, keeping an error when it is not valid JSON.
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
    } catch (e) {
      headersError.value = getErrorMessage(e);
      parsedHeaders.value = undefined;
    }
  },
  { immediate: true },
);

/** Error of the location country field, if any. */
const countryError = computed<string | undefined>(
  () => checkCountryCode(scrapeOptions.value.locationCountry).error,
);

/** First field error of the form; submission is blocked while one is set. */
const formError = computed<string | undefined>(() =>
  firstFormError([schemaError.value, headersError.value, countryError.value]),
);

/** Label of the run button while a run is in progress. */
const progressLabel = computed<string>(() =>
  progress.value.total > 1 ? `Running… ${progress.value.done}/${progress.value.total}` : 'Running…',
);

/** Pretty-printed result, for scalar and array results. */
const formattedResult = computed(() =>
  result.value === null ? '' : JSON.stringify(result.value, null, 2),
);

/** Key/value rows of the Result tab, or `null` for a scalar or array result. */
const resultRows = computed(() => toResultRows(result.value));

/** Whether a result is available to display. */
const hasResult = computed(() => result.value !== null);

/** Pages of the last run that returned no data. */
const failedPages = computed(() => pages.value.filter((page) => !page.ok));

/** Status label shown in the PlaygroundLayout status bar. */
const statusLabel = computed<string | null>(() => {
  if (result.value !== null) return failedPages.value.length ? 'Partial' : 'Success';
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
const responseTabs = [
  { key: 'result', label: 'Result' },
  { key: 'json', label: 'JSON' },
];

/**
 * Extract the data from every URL, one `/v2/scrape` request at a time.
 *
 * A page that fails is recorded and the run moves on to the next URL; the
 * run fails as a whole only when no page returns data. A 401 sends the user
 * to the API settings, like the Scrape view.
 *
 * @returns A promise that resolves once every URL has been processed.
 */
const runExtraction = async (): Promise<void> => {
  if (formError.value) return;

  const urls = parseExtractUrls(urlInput.value);
  if (!urls.length) {
    error.value = 'Please provide at least one URL.';
    return;
  }

  // Build every request now: the form stays editable while the run is going,
  // and every page of the run must use the values of this click.
  let requests: ExtractRunRequest[];
  try {
    requests = buildExtractRun(urls, {
      prompt: promptInput.value,
      schema: parsedSchema.value,
      headers: parsedHeaders.value,
      options: scrapeOptions.value,
    });
  } catch (err) {
    error.value = getErrorMessage(err);
    return;
  }

  const isCurrent = guard.begin();
  loading.value = true;
  error.value = '';
  result.value = null;
  pages.value = [];
  durationMs.value = null;
  progress.value = { done: 0, total: requests.length };
  const startedAt = performance.now();

  try {
    const outcomes = await runExtractRequests(
      requests,
      async (payload) => (await api.scraping.scrapeAndExtractFromUrl(payload)).data.data,
      {
        isCurrent,
        isFatal: isUnauthorized,
        describeError: describeRequestError,
        onProgress: (done, total) => {
          progress.value = { done, total };
        },
      },
    );
    if (outcomes === null) return;

    pages.value = outcomes;
    result.value = combineExtractResults(outcomes);
    if (result.value === null) {
      error.value =
        outcomes.length === 1
          ? (outcomes[0].error ?? 'Extraction failed')
          : outcomes.map((page) => `${page.url}: ${page.error}`).join('\n');
    }
  } catch (err) {
    if (!isCurrent()) return;
    if (isUnauthorized(err)) {
      router.push({ name: 'api-config' });
      return;
    }
    error.value = describeRequestError(err);
  } finally {
    if (isCurrent()) {
      durationMs.value = performance.now() - startedAt;
      loading.value = false;
    }
  }
};

/**
 * Download the JSON result to a file.
 */
const downloadResult = (): void => {
  if (result.value === null) return;
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
 * Warning strip: glass card tinted with the warning hue, listing the URLs
 * that returned no data while others succeeded.
 */
.warning-strip {
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

.extract-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* The flex gap already spaces the option group. */
  --disclosure-gap: 0;
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

/* ── Scrape Options group ─────────────────────────────────────── */

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

.extract-scrape-options input[type='text'],
.extract-scrape-options input[type='number'],
.extract-scrape-options select {
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

/* ── Failed URLs warning strip ────────────────────────────────── */

/*
 * Placement of the .warning-strip card inside the response pane, above the
 * result, with the failed URLs listed in mono.
 */
.failed-urls-warning {
  margin: 1rem 1rem 0;
}

.failed-urls-warning ul {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}

.failed-urls-warning li {
  font-family: var(--font-mono);
  font-size: 0.8em;
  word-break: break-all;
}
</style>
