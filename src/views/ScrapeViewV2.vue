<template>
  <div class="page-container scrape-view">
    <h1>Scrape Configuration (API v2)</h1>
    <form class="scrape-config-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="url">URL:</label>
        <input id="url" v-model="formData.url" type="url" required />
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Page Options</legend>
        <div class="grid-layout">
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.screenshot" />
            Capture screenshot
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.onlyMainContent" />
            Only main content
          </label>
          <label class="checkbox-label">
            <input type="checkbox" v-model="formData.pageOptions.includeHtml" />
            Include HTML
          </label>
        </div>
        <div class="form-group">
          <label for="waitFor">Wait For (ms):</label>
          <input id="waitFor" v-model.number="formData.pageOptions.waitFor" type="number" min="0" />
        </div>
        <div class="form-group">
          <label for="headers">Request Headers (JSON object):</label>
          <textarea
            id="headers"
            v-model="headersInput"
            rows="4"
            placeholder='{"User-Agent": "MyCrawler"}'
          ></textarea>
          <div v-if="headersError" class="error-message">{{ headersError }}</div>
        </div>
      </fieldset>

      <fieldset class="form-group options-fieldset">
        <legend>Extractor Options</legend>
        <div class="form-group">
          <label for="mode">Mode:</label>
          <select id="mode" v-model="formData.extractorOptions.mode">
            <option value="llm-extraction">LLM Extraction</option>
          </select>
        </div>
        <div class="form-group">
          <label for="prompt">Extraction Prompt:</label>
          <textarea
            id="prompt"
            v-model="formData.extractorOptions.extractionPrompt"
            rows="3"
            placeholder="Describe the data to extract"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="schema">Extraction Schema (JSON object):</label>
          <textarea
            id="schema"
            v-model="schemaInput"
            rows="6"
            placeholder='{"title": {"type": "string"}}'
          ></textarea>
          <div v-if="schemaError" class="error-message">{{ schemaError }}</div>
          <small>Provide a JSON schema describing the structure of the expected data.</small>
        </div>
      </fieldset>

      <div class="form-group">
        <label>
          <input type="checkbox" v-model="formData.scraperOptions.useUnstructured" />
          Use unstructured scraper
        </label>
      </div>

      <button type="submit" class="primary-button" :disabled="loading">Scrape</button>
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
        <h2>Results</h2>
        <div class="download-options">
          <button @click="downloadResult">Download JSON</button>
        </div>
      </div>
      <pre>{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { postV2 } from '@/api/v2Client';

interface PageOptionsV2 {
  screenshot: boolean;
  onlyMainContent: boolean;
  includeHtml: boolean;
  waitFor?: number | null;
  headers?: Record<string, string>;
}

interface ExtractorOptionsV2 {
  mode: 'llm-extraction';
  extractionPrompt: string;
  extractionSchema?: Record<string, unknown>;
}

interface ScraperOptionsV2 {
  useUnstructured: boolean;
}

interface FormDataV2 {
  url: string;
  pageOptions: PageOptionsV2;
  extractorOptions: ExtractorOptionsV2;
  scraperOptions: ScraperOptionsV2;
}

interface ScrapeResponseV2 {
  success?: boolean;
  data?: {
    content?: string;
    markdown?: string;
    html?: string;
    metadata?: Record<string, unknown>;
    screenshotUrl?: string;
  };
  metadata?: Record<string, unknown>;
}

export default defineComponent({
  name: 'ScrapeViewV2',
  setup() {
    const formData = ref<FormDataV2>({
      url: '',
      pageOptions: {
        screenshot: false,
        onlyMainContent: false,
        includeHtml: false,
        waitFor: undefined,
        headers: undefined,
      },
      extractorOptions: {
        mode: 'llm-extraction',
        extractionPrompt: '',
        extractionSchema: undefined,
      },
      scraperOptions: {
        useUnstructured: false,
      },
    });

    const headersInput = ref('');
    const headersError = ref('');
    const schemaInput = ref('');
    const schemaError = ref('');
    const loading = ref(false);
    const error = ref('');
    const result = ref<ScrapeResponseV2 | null>(null);

    /**
     * Computes a formatted JSON string of the scrape result for display purposes.
     *
     * @returns {string} The formatted JSON string or an empty string when no result is present.
     */
    const formattedResult = computed(() =>
      result.value ? JSON.stringify(result.value, null, 2) : '',
    );

    /**
     * Normalizes the headers input whenever the user updates the JSON string.
     */
    watch(
      headersInput,
      (value) => {
        if (!value.trim()) {
          formData.value.pageOptions.headers = undefined;
          headersError.value = '';
          return;
        }
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Headers must be a JSON object.');
          }
          const normalized: Record<string, string> = {};
          Object.entries(parsed).forEach(([key, val]) => {
            normalized[key] = String(val);
          });
          formData.value.pageOptions.headers = normalized;
          headersError.value = '';
        } catch (err) {
          headersError.value = err instanceof Error ? err.message : 'Invalid headers JSON.';
        }
      },
      { immediate: false },
    );

    /**
     * Normalizes the extraction schema input whenever the JSON string changes.
     */
    watch(
      schemaInput,
      (value) => {
        if (!value.trim()) {
          formData.value.extractorOptions.extractionSchema = undefined;
          schemaError.value = '';
          return;
        }
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Schema must be a JSON object.');
          }
          formData.value.extractorOptions.extractionSchema = parsed as Record<string, unknown>;
          schemaError.value = '';
        } catch (err) {
          schemaError.value = err instanceof Error ? err.message : 'Invalid schema JSON.';
        }
      },
      { immediate: false },
    );

    /**
     * Builds the request payload for the scrape call.
     *
     * @returns {Record<string, unknown>} The payload ready to be sent to the API.
     */
    const buildPayload = (): Record<string, unknown> => {
      const payload: Record<string, unknown> = {
        url: formData.value.url,
      };

      const pageOptions: Record<string, unknown> = {};
      if (formData.value.pageOptions.screenshot) {
        pageOptions.screenshot = true;
      }
      if (formData.value.pageOptions.onlyMainContent) {
        pageOptions.onlyMainContent = true;
      }
      if (formData.value.pageOptions.includeHtml) {
        pageOptions.includeHtml = true;
      }
      if (
        formData.value.pageOptions.waitFor !== undefined &&
        formData.value.pageOptions.waitFor !== null &&
        !Number.isNaN(formData.value.pageOptions.waitFor)
      ) {
        pageOptions.waitFor = formData.value.pageOptions.waitFor;
      }
      if (
        formData.value.pageOptions.headers &&
        Object.keys(formData.value.pageOptions.headers).length
      ) {
        pageOptions.headers = formData.value.pageOptions.headers;
      }
      if (Object.keys(pageOptions).length > 0) {
        payload.pageOptions = pageOptions;
      }

      const extractorOptions: Record<string, unknown> = {};
      if (formData.value.extractorOptions.mode) {
        extractorOptions.mode = formData.value.extractorOptions.mode;
      }
      if (formData.value.extractorOptions.extractionPrompt.trim()) {
        extractorOptions.extractionPrompt = formData.value.extractorOptions.extractionPrompt.trim();
      }
      if (formData.value.extractorOptions.extractionSchema) {
        extractorOptions.extractionSchema = formData.value.extractorOptions.extractionSchema;
      }
      if (Object.keys(extractorOptions).length > 0) {
        payload.extractorOptions = extractorOptions;
      }

      if (formData.value.scraperOptions.useUnstructured) {
        payload.scraperOptions = { useUnstructured: true };
      }

      return payload;
    };

    /**
     * Sends the scrape request to the API and stores the result.
     *
     * @returns {Promise<void>} Resolves when the request completes.
     */
    const handleSubmit = async (): Promise<void> => {
      if (headersError.value || schemaError.value) {
        error.value = 'Please fix the JSON errors before submitting the request.';
        return;
      }

      loading.value = true;
      error.value = '';
      result.value = null;
      try {
        const payload = buildPayload();
        const response = await postV2<ScrapeResponseV2>('scrape', payload);
        result.value = response.data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Scrape request failed.';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Triggers a download of the scrape result as a JSON file.
     */
    const downloadResult = (): void => {
      if (!result.value) {
        return;
      }
      const blob = new Blob([JSON.stringify(result.value, null, 2)], {
        type: 'application/json',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'scrape-result-v2.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      formData,
      headersInput,
      headersError,
      schemaInput,
      schemaError,
      loading,
      error,
      result,
      formattedResult,
      handleSubmit,
      downloadResult,
    };
  },
});
</script>

<style scoped>
@import '@/assets/main.css';

.scrape-view {
  max-width: 900px;
  margin: 0 auto;
}

.options-fieldset {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 8px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.checkbox-label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

textarea {
  width: 100%;
}

.error-message {
  color: #c0392b;
  margin-top: 0.5rem;
}
</style>
