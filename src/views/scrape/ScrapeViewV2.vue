<template>
  <div class="page-container">
    <h1>Scrape Configuration (API v2)</h1>
    <form class="scrape-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input
          id="url"
          v-model="formState.url"
          type="url"
          required
          placeholder="https://example.com"
        />
      </div>

      <fieldset class="options">
        <legend>Page Options</legend>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.onlyMainContent" /> Only main content
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.includeHtml" /> Include HTML
        </label>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.screenshot" /> Capture screenshot
        </label>
        <div class="form-group inline">
          <label for="waitFor">Wait for (ms):</label>
          <input id="waitFor" v-model.number="formState.waitFor" type="number" min="0" />
        </div>
        <div class="form-group">
          <label for="headers">Custom headers (JSON object):</label>
          <textarea
            id="headers"
            v-model="formState.headers"
            placeholder='{"User-Agent": "MyScraper/1.0"}'
            rows="3"
          ></textarea>
        </div>
      </fieldset>

      <fieldset class="options">
        <legend>Extraction</legend>
        <label class="checkbox">
          <input type="checkbox" v-model="formState.useUnstructured" /> Use unstructured scraper
        </label>
        <div class="form-group">
          <label for="prompt">Extraction prompt:</label>
          <textarea
            id="prompt"
            v-model="formState.extractionPrompt"
            placeholder="Describe the data to extract"
            rows="3"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="schema">Extraction schema (JSON):</label>
          <textarea
            id="schema"
            v-model="formState.extractionSchema"
            placeholder='{"type": "object", "properties": {"title": {"type": "string"}}}'
            rows="5"
          ></textarea>
          <small v-if="schemaError" class="error">{{ schemaError }}</small>
        </div>
      </fieldset>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Running…' : 'Scrape' }}
      </button>
    </form>

    <div v-if="error" class="status error">{{ error }}</div>

    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Result</h2>
        <button type="button" class="secondary-button" @click="downloadResult">
          Download JSON
        </button>
      </div>
      <section v-if="result.data">
        <article v-if="result.data.content">
          <h3>Content</h3>
          <pre>{{ result.data.content }}</pre>
        </article>
        <article v-if="result.data.markdown">
          <h3>Markdown</h3>
          <pre>{{ result.data.markdown }}</pre>
        </article>
        <article v-if="result.data.html">
          <h3>HTML</h3>
          <pre>{{ result.data.html }}</pre>
        </article>
        <article v-if="result.data.metadata">
          <h3>Metadata</h3>
          <pre>{{ formattedMetadata }}</pre>
        </article>
        <article v-if="result.data.screenshotUrl">
          <h3>Screenshot</h3>
          <img :src="result.data.screenshotUrl" alt="Scraped screenshot" class="screenshot" />
        </article>
      </section>
      <section v-if="result.metadata">
        <h3>Response metadata</h3>
        <pre>{{ JSON.stringify(result.metadata, null, 2) }}</pre>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from 'vue';
import type { AxiosResponse } from 'axios';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { ScrapeRequestV2, ScrapeResponseV2 } from '@/types/api.js';

interface FormState {
  url: string;
  onlyMainContent: boolean;
  includeHtml: boolean;
  screenshot: boolean;
  waitFor?: number;
  headers: string;
  extractionPrompt: string;
  extractionSchema: string;
  useUnstructured: boolean;
}

const api = inject('api') as FirecrawlApiClients | undefined;
if (!api?.scraping) {
  throw new Error('Scraping API client is not available.');
}

const formState = reactive<FormState>({
  url: '',
  onlyMainContent: true,
  includeHtml: false,
  screenshot: false,
  waitFor: undefined,
  headers: '',
  extractionPrompt: '',
  extractionSchema: '',
  useUnstructured: false,
});

const schemaError = ref<string | null>(null);
const parsedSchema = ref<Record<string, unknown> | undefined>(undefined);

watch(
  () => formState.extractionSchema,
  (value) => {
    if (!value) {
      schemaError.value = null;
      parsedSchema.value = undefined;
      return;
    }
    try {
      parsedSchema.value = JSON.parse(value);
      schemaError.value = null;
    } catch (err) {
      schemaError.value = err instanceof Error ? err.message : 'Invalid JSON schema.';
      parsedSchema.value = undefined;
    }
  },
);

const loading = ref(false);
const error = ref('');
const result = ref<ScrapeResponseV2 | null>(null);

const formattedMetadata = computed(() =>
  result.value?.data?.metadata ? JSON.stringify(result.value.data.metadata, null, 2) : '',
);

/**
 * Download the scrape result as a JSON file.
 */
function downloadResult(): void {
  if (!result.value) {
    return;
  }
  const blob = new Blob([JSON.stringify(result.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'scrape-result.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Validate URL structure before sending the request.
 *
 * @param value - URL string to validate.
 * @returns True when the URL is valid.
 */
function isValidUrl(value: string): boolean {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
}

/**
 * Submit the scrape request to the API.
 */
async function handleSubmit(): Promise<void> {
  if (!isValidUrl(formState.url)) {
    error.value = 'Please provide a valid URL (https://example.com).';
    return;
  }
  if (schemaError.value) {
    error.value = 'Please fix the extraction schema before submitting.';
    return;
  }

  let headers: Record<string, string> | undefined;
  if (formState.headers.trim()) {
    try {
      const parsed = JSON.parse(formState.headers);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Headers must be a JSON object.');
      }
      headers = parsed as Record<string, string>;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Headers must be valid JSON.';
      return;
    }
  }

  const payload: ScrapeRequestV2 = {
    url: formState.url,
  };

  const pageOptions: ScrapeRequestV2['pageOptions'] = {
    onlyMainContent: formState.onlyMainContent,
    includeHtml: formState.includeHtml,
    screenshot: formState.screenshot,
  };
  if (formState.waitFor && formState.waitFor > 0) {
    pageOptions.waitFor = formState.waitFor;
  }
  if (headers) {
    pageOptions.headers = headers;
  }
  if (pageOptions && Object.values(pageOptions).some((value) => value !== undefined)) {
    payload.pageOptions = pageOptions;
  }

  if (formState.extractionPrompt || parsedSchema.value) {
    payload.extractorOptions = {
      mode: 'llm-extraction',
      ...(formState.extractionPrompt ? { extractionPrompt: formState.extractionPrompt } : {}),
      ...(parsedSchema.value ? { extractionSchema: parsedSchema.value } : {}),
    };
  }

  if (formState.useUnstructured) {
    payload.scraperOptions = { useUnstructured: true };
  }

  try {
    loading.value = true;
    error.value = '';
    const response = (await api.scraping.scrapeAndExtractFromUrl(
      payload,
    )) as AxiosResponse<ScrapeResponseV2>;
    result.value = response.data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message;
    } else {
      error.value = 'Unexpected error while scraping.';
    }
    result.value = null;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem 1rem;
}

.scrape-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.inline {
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

.options {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.primary-button,
.secondary-button {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: #2563eb;
  color: #fff;
}

.secondary-button {
  background-color: #0f172a;
  color: #fff;
}

.status.error {
  color: #b91c1c;
  margin-bottom: 1rem;
}

.result {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.result pre {
  background: #0f172a;
  color: #f8fafc;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
}

.screenshot {
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.error {
  color: #b91c1c;
}
</style>
