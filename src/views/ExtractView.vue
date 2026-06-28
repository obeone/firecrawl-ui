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
          <textarea
            id="schema-input"
            v-model="schemaString"
            rows="5"
            placeholder='{"title": "string"}'
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
        </div>

        <button type="submit" class="run-button" :disabled="loading || !!schemaError">
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
const options = ref({ enableWebSearch: false, showSources: false, allowExternalLinks: false }); // Stores extraction options.
const loading = ref(false); // Indicates if an extraction request is in progress.
const error = ref(''); // Stores any error messages from the extraction process.
const result = ref<FirecrawlExtractResponse['data'] | null>(null); // Stores the successful extraction result.
const schemaError = ref<string | null>(null); // Stores error messages related to JSON schema parsing.
const parsedSchema = ref<any>(undefined); // Holds the parsed schema object.
const durationMs = ref<number | null>(null); // Request round-trip duration in milliseconds.

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
const responseTabs = computed(() => [
  { key: 'result', label: 'Result' },
  { key: 'json', label: 'JSON' },
]);

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
 * Send the extraction request to the API.
 */
const runExtraction = async (): Promise<void> => {
  if (schemaError.value) return;

  const urls = urlInput.value
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u);
  if (!urls.length && !promptInput.value.trim()) {
    error.value = 'Please provide at least one URL or a prompt.';
    return;
  }

  const payload = {
    ...(urls.length && { urls }),
    ...(promptInput.value && { prompt: promptInput.value }),
    ...(parsedSchema.value && { schema: parsedSchema.value }),
    ...(options.value.enableWebSearch && { enableWebSearch: true }),
    ...(options.value.showSources && { showSources: true }),
    ...(options.value.allowExternalLinks && { allowExternalLinks: true }),
  };

  try {
    loading.value = true;
    error.value = '';
    durationMs.value = null;
    const t0 = performance.now();
    const response = await api.extraction.extractData(payload);
    durationMs.value = performance.now() - t0;
    const respData = response.data;
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
</style>
