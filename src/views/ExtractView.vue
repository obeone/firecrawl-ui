<template>
  <div class="page-container extract-view">
    <h1>Extract Data</h1>
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
      </div>

      <button type="submit" class="primary-button" :disabled="loading || !!schemaError">
        {{ loading ? 'Running...' : 'Extract' }}
      </button>
    </form>

    <div v-if="loading && !result" class="status">Extracting...</div>
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
import { ExtractionApi, type ExtractDataRequest, type ExtractResponse } from '@/api-client';

/**
 * Injection of the API client. The apiPlugin must provide an `extraction` instance.
 */
const api = inject('api') as { extraction?: ExtractionApi } | undefined;
if (!api?.extraction) {
  throw new Error('Extraction API is not available');
}

const urlInput = ref(''); // Stores the URLs entered by the user.
const promptInput = ref(''); // Stores the prompt for data extraction.
const schemaString = ref(''); // Stores the JSON schema string provided by the user.
const options = ref({ enableWebSearch: false, showSources: false }); // Stores extraction options.
const loading = ref(false); // Indicates if an extraction request is in progress.
const error = ref(''); // Stores any error messages from the extraction process.
const result = ref<ExtractResponse['data'] | null>(null); // Stores the successful extraction result.
const schemaError = ref<string | null>(null); // Stores error messages related to JSON schema parsing.
const parsedSchema = ref<any>(undefined); // Holds the parsed schema object.

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

  const payload: ExtractDataRequest = {
    ...(urls.length && { urls }),
    ...(promptInput.value && { prompt: promptInput.value }),
    ...(parsedSchema.value && { schema: parsedSchema.value }),
    ...(options.value.enableWebSearch && { enableWebSearch: true }),
    ...(options.value.showSources && { showSources: true }),
  } as ExtractDataRequest;

  try {
    loading.value = true;
    error.value = '';
    const response = await api.extraction.extractData(payload);
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
.extract-view {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  font-family: sans-serif;
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

.options {
  margin-bottom: 10px;
}

button {
  padding: 10px 15px;
  background-color: #5cb85c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.status {
  margin-top: 20px;
}

.status.error {
  color: #a94442;
}

.result {
  margin-top: 20px;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

pre {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.schema-error {
  color: #d9534f;
}

.hint {
  display: block;
  margin-top: 4px;
  color: #666;
}
</style>
