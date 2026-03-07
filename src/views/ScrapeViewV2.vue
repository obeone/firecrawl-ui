<template>
  <div class="page-container">
    <h1>Scrape Configuration (API v2)</h1>

    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="form.url" type="text" required />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Page Options</legend>
        <div class="grid-layout">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.pageOptions.onlyMainContent" />
            Only main content
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.pageOptions.includeHtml" />
            Include full HTML
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.pageOptions.screenshot" />
            Capture screenshot
          </label>
          <div class="form-group">
            <label for="waitFor">Wait For (ms):</label>
            <input id="waitFor" v-model.number="form.pageOptions.waitFor" type="number" min="0" />
            <small>Delay before scraping starts.</small>
          </div>
        </div>
        <div class="form-group">
          <label for="headers">HTTP Headers (JSON format):</label>
          <textarea
            id="headers"
            v-model="headersInput"
            rows="4"
            placeholder='{"User-Agent": "Firecrawl"}'
          ></textarea>
          <div v-if="headersError" class="error-message">{{ headersError }}</div>
        </div>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Extractor Options (optional)</legend>
        <div class="form-group">
          <label for="extractionPrompt">Extraction prompt:</label>
          <textarea id="extractionPrompt" v-model="form.extractorPrompt" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="schema">Extraction schema (JSON):</label>
          <textarea id="schema" v-model="schemaInput" rows="6"></textarea>
          <div v-if="schemaError" class="error-message">{{ schemaError }}</div>
          <small>Provide a JSON schema to enforce structured extraction.</small>
        </div>
      </fieldset>

      <label class="checkbox-label">
        <input type="checkbox" v-model="form.useUnstructured" />
        Use unstructured scraping (experimental)
      </label>

      <button type="submit" class="primary-button">Scrape</button>
    </form>

    <div v-if="loading" class="status loading">
      <div class="spinner"></div>
      <span>Processing your request...</span>
    </div>

    <div v-if="error" class="status error">
      <div class="error-icon">!</div>
      <div>
        <h3>Error occurred</h3>
        <p>{{ error }}</p>
        <button class="primary-button" @click="error = ''">Try again</button>
      </div>
    </div>

    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Result</h2>
        <div class="download-options">
          <button @click="downloadJson">Download JSON</button>
          <button v-if="result.data?.markdown" @click="downloadMarkdown">Download Markdown</button>
          <button v-if="result.data?.html" @click="downloadHtml">Download HTML</button>
          <button v-if="result.data?.screenshotUrl" @click="downloadScreenshot">
            Download Screenshot
          </button>
        </div>
      </div>
      <pre>{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import axios from 'axios';
import { computed, defineComponent, inject, reactive, ref, watch } from 'vue';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { ScrapingApiV2, ScrapeRequestV2, ScrapeResponseV2 } from '@/api-client-v2/index.js';

interface PageOptionsForm {
  onlyMainContent: boolean;
  includeHtml: boolean;
  screenshot: boolean;
  waitFor?: number;
}

interface ScrapeFormState {
  url: string;
  pageOptions: PageOptionsForm;
  extractorPrompt: string;
  useUnstructured: boolean;
}

/**
 * ScrapeViewV2 provides a tailored UI for the Firecrawl API v2 scraping endpoint.
 * It exposes the limited set of options available in the new API while reusing
 * the result presentation from the legacy view.
 */
export default defineComponent({
  name: 'ScrapeViewV2',
  setup() {
    const clients = inject('api') as FirecrawlApiClients | undefined;
    if (!clients || clients.version !== 'v2') {
      throw new Error('Scraping API v2 is not available');
    }
    const scrapingApi = clients.scraping as ScrapingApiV2;

    const form = reactive<ScrapeFormState>({
      url: '',
      pageOptions: {
        onlyMainContent: true,
        includeHtml: false,
        screenshot: false,
        waitFor: undefined,
      },
      extractorPrompt: '',
      useUnstructured: false,
    });
    const headersInput = ref('');
    const headersError = ref('');
    const schemaInput = ref('');
    const schemaError = ref('');

    const loading = ref(false);
    const error = ref('');
    const result = ref<ScrapeResponseV2 | null>(null);

    const formattedResult = computed(() =>
      result.value ? JSON.stringify(result.value, null, 2) : '',
    );

    watch(headersInput, () => {
      headersError.value = '';
    });
    watch(schemaInput, () => {
      schemaError.value = '';
    });

    /**
     * Validate a URL string using the built-in URL constructor.
     *
     * @param value - URL to validate.
     * @returns True when the input is a valid URL.
     */
    const isValidUrl = (value: string): boolean => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Parse a JSON string and report errors using the provided callback.
     *
     * @param value - Raw JSON string entered by the user.
     * @param setError - Callback used to expose validation errors.
     * @returns Parsed JSON value when valid or undefined when empty.
     */
    const parseJson = (value: string, setError: (message: string) => void) => {
      if (!value.trim()) {
        return undefined;
      }
      try {
        return JSON.parse(value);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid JSON';
        setError(message);
        throw err;
      }
    };

    /**
     * Submit the scrape request to the v2 endpoint.
     * Validates user input and maps the form to the API payload.
     */
    const handleSubmit = async () => {
      error.value = '';
      result.value = null;

      if (!isValidUrl(form.url)) {
        error.value = 'Please provide a valid URL.';
        return;
      }

      let headers: Record<string, string> | undefined;
      let schema: Record<string, unknown> | undefined;
      try {
        headers = parseJson(headersInput.value, (message) => {
          headersError.value = `Invalid headers JSON: ${message}`;
        }) as Record<string, string> | undefined;
      } catch {
        return;
      }
      try {
        schema = parseJson(schemaInput.value, (message) => {
          schemaError.value = `Invalid schema JSON: ${message}`;
        }) as Record<string, unknown> | undefined;
      } catch {
        return;
      }

      const payload: ScrapeRequestV2 = {
        url: form.url,
        pageOptions: {
          onlyMainContent: form.pageOptions.onlyMainContent,
          includeHtml: form.pageOptions.includeHtml,
          screenshot: form.pageOptions.screenshot,
          ...(form.pageOptions.waitFor ? { waitFor: form.pageOptions.waitFor } : {}),
          ...(headers ? { headers } : {}),
        },
        ...(schema || form.extractorPrompt
          ? {
              extractorOptions: {
                ...(schema ? { extractionSchema: schema } : {}),
                ...(form.extractorPrompt ? { extractionPrompt: form.extractorPrompt } : {}),
                mode: 'llm-extraction',
              },
            }
          : {}),
        scraperOptions: {
          useUnstructured: form.useUnstructured,
        },
      };

      loading.value = true;
      try {
        const response = await scrapingApi.scrape(payload);
        result.value = response.data;
      } catch (err: any) {
        error.value = err?.message || 'Scrape request failed';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Download the raw API response as a JSON file.
     */
    const downloadJson = () => {
      if (!result.value) {
        return;
      }
      const blob = new Blob([JSON.stringify(result.value, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'scrape-result.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    /**
     * Download the scraped Markdown when available.
     */
    const downloadMarkdown = () => {
      if (!result.value?.data?.markdown) {
        return;
      }
      const blob = new Blob([result.value.data.markdown], {
        type: 'text/markdown',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'scrape-result.md';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    /**
     * Download the scraped HTML when available.
     */
    const downloadHtml = () => {
      if (!result.value?.data?.html) {
        return;
      }
      const blob = new Blob([result.value.data.html], {
        type: 'text/html',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'scrape-result.html';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    /**
     * Download the captured screenshot referenced by the API response.
     */
    const downloadScreenshot = async () => {
      if (!result.value?.data?.screenshotUrl) {
        return;
      }
      const response = await axios.get(result.value.data.screenshotUrl, {
        responseType: 'blob',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(response.data);
      link.download = 'scrape-screenshot.png';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      form,
      headersInput,
      headersError,
      schemaInput,
      schemaError,
      handleSubmit,
      loading,
      error,
      result,
      formattedResult,
      downloadJson,
      downloadMarkdown,
      downloadHtml,
      downloadScreenshot,
    };
  },
});
</script>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input,
textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: normal;
}

.options-fieldset {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 15px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 10px;
}

.primary-button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 6px;
}

.status.error {
  border-color: #cc0000;
  color: #cc0000;
}

.error-icon {
  background-color: #cc0000;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #ccc;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.result {
  margin-top: 24px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.download-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.download-options button {
  background-color: #f4f4f4;
  border: 1px solid #ccc;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.download-options button:hover {
  background-color: #e0e0e0;
}

.error-message {
  color: #cc0000;
  margin-top: 6px;
}
</style>
