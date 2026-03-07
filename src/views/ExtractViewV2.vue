<template>
  <div class="page-container extract-view">
    <h1>Extract Data (API v2)</h1>
    <form @submit.prevent="runExtraction" class="extract-form">
      <div class="form-group">
        <label for="html-input">HTML content</label>
        <textarea
          id="html-input"
          v-model="htmlInput"
          rows="6"
          placeholder="Paste raw HTML here"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="markdown-input">Markdown content</label>
        <textarea
          id="markdown-input"
          v-model="markdownInput"
          rows="6"
          placeholder="Paste Markdown content here"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="prompt-input">Extraction prompt (optional)</label>
        <textarea
          id="prompt-input"
          v-model="promptInput"
          rows="3"
          placeholder="Describe the data to extract"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="schema-input">Extraction schema (JSON)</label>
        <textarea
          id="schema-input"
          v-model="schemaInput"
          rows="6"
          placeholder='{"title": "string"}'
        ></textarea>
        <small v-if="schemaError" class="schema-error">{{ schemaError }}</small>
      </div>

      <button type="submit" class="primary-button" :disabled="loading">{{ submitLabel }}</button>
    </form>

    <div v-if="loading" class="status">Processing extraction...</div>
    <div v-if="error" class="status error">{{ error }}</div>
    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Result</h2>
        <button @click="downloadResult">Download JSON</button>
      </div>
      <pre>{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import type { FirecrawlApiClients } from '@/plugins/api';
import type {
  ExtractionApiV2,
  ExtractRequestV2,
  ExtractResponseV2,
} from '@/api-client-v2/index.js';

const clients = inject('api') as FirecrawlApiClients | undefined;
if (!clients || clients.version !== 'v2') {
  throw new Error('Extraction API v2 is not available');
}
const extractionApi = clients.extraction as ExtractionApiV2;

const htmlInput = ref('');
const markdownInput = ref('');
const promptInput = ref('');
const schemaInput = ref('');
const schemaError = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const result = ref<ExtractResponseV2['data'] | null>(null);

const submitLabel = computed(() => (loading.value ? 'Running…' : 'Extract'));
const formattedResult = computed(() => (result.value ? JSON.stringify(result.value, null, 2) : ''));

watch(schemaInput, () => {
  schemaError.value = null;
});

/**
 * Ensure that at least one type of input content is provided.
 *
 * @returns True when HTML or Markdown content is available.
 */
const hasContent = (): boolean => {
  return Boolean(htmlInput.value.trim() || markdownInput.value.trim());
};

/**
 * Validate and parse the JSON schema entered by the user.
 *
 * @returns Parsed schema object or null when validation fails.
 */
const parseSchema = (): Record<string, unknown> | null => {
  if (!schemaInput.value.trim()) {
    schemaError.value = 'Please provide a JSON schema.';
    return null;
  }
  try {
    return JSON.parse(schemaInput.value);
  } catch (err) {
    schemaError.value = err instanceof Error ? err.message : 'Invalid JSON schema';
    return null;
  }
};

/**
 * Execute the extraction request against the v2 API.
 */
const runExtraction = async (): Promise<void> => {
  error.value = '';
  result.value = null;

  if (!hasContent()) {
    error.value = 'Please provide HTML or Markdown content.';
    return;
  }
  const schema = parseSchema();
  if (!schema) {
    return;
  }

  const payload: ExtractRequestV2 = {
    ...(htmlInput.value.trim() ? { html: htmlInput.value } : {}),
    ...(markdownInput.value.trim() ? { markdown: markdownInput.value } : {}),
    extractorOptions: {
      extractionSchema: schema,
      ...(promptInput.value.trim() ? { extractionPrompt: promptInput.value } : {}),
      mode: 'llm-extraction',
    },
  };

  loading.value = true;
  try {
    const response = await extractionApi.extract(payload);
    if (response.data.success && response.data.data) {
      result.value = response.data.data;
    } else {
      throw new Error('Extraction failed');
    }
  } catch (err: any) {
    error.value = err?.message || 'Request failed';
  } finally {
    loading.value = false;
  }
};

/**
 * Download the extraction result as a JSON file.
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
  link.download = 'extraction_result.json';
  link.click();
  URL.revokeObjectURL(link.href);
};
</script>

<style scoped>
.extract-view {
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

textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
}

button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.status {
  margin-top: 10px;
  color: #0066cc;
}

.status.error {
  color: #cc0000;
}

.result {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.schema-error {
  color: #cc0000;
  display: block;
  margin-top: 6px;
}
</style>
