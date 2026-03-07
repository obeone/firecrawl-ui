<template>
  <div class="page-container">
    <h1>Extract Data (API v2)</h1>
    <form class="extract-form" @submit.prevent="runExtraction">
      <div class="form-group">
        <label for="html">HTML (optional)</label>
        <textarea
          id="html"
          v-model="formState.html"
          placeholder="<article>...</article>"
          rows="6"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="markdown">Markdown (optional)</label>
        <textarea
          id="markdown"
          v-model="formState.markdown"
          placeholder="# Title\nContent"
          rows="6"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="schema">Extraction schema (JSON)</label>
        <textarea
          id="schema"
          v-model="formState.schema"
          rows="6"
          placeholder='{"type": "object", "properties": {"title": {"type": "string"}}}'
          required
        ></textarea>
        <small v-if="schemaError" class="error">{{ schemaError }}</small>
      </div>
      <div class="form-group">
        <label for="prompt">Extraction prompt (optional)</label>
        <textarea
          id="prompt"
          v-model="formState.prompt"
          rows="3"
          placeholder="Describe the information to extract"
        ></textarea>
      </div>
      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Extracting…' : 'Extract' }}
      </button>
    </form>

    <div v-if="error" class="status error">{{ error }}</div>

    <section v-if="result" class="result">
      <div class="result-header">
        <h2>Result</h2>
        <button class="secondary-button" type="button" @click="downloadResult">
          Download JSON
        </button>
      </div>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </section>
  </div>
</template>

<script setup lang="ts">
import { inject, reactive, ref, watch } from 'vue';
import type { AxiosResponse } from 'axios';
import type { FirecrawlApiClients } from '@/plugins/api';
import type { ExtractRequestV2, ExtractResponseV2 } from '@/types/api.js';

interface FormState {
  html: string;
  markdown: string;
  schema: string;
  prompt: string;
}

const api = inject('api') as FirecrawlApiClients | undefined;
if (!api?.extraction) {
  throw new Error('Extraction API client is not available.');
}

const formState = reactive<FormState>({
  html: '',
  markdown: '',
  schema: '',
  prompt: '',
});

const schemaError = ref<string | null>(null);
const parsedSchema = ref<Record<string, unknown> | null>(null);

watch(
  () => formState.schema,
  (value) => {
    if (!value) {
      schemaError.value = 'An extraction schema is required.';
      parsedSchema.value = null;
      return;
    }
    try {
      parsedSchema.value = JSON.parse(value);
      schemaError.value = null;
    } catch (err) {
      schemaError.value = err instanceof Error ? err.message : 'Invalid schema JSON.';
      parsedSchema.value = null;
    }
  },
  { immediate: true },
);

const loading = ref(false);
const error = ref('');
const result = ref<Record<string, unknown> | null>(null);

/**
 * Download the extraction result as a JSON file.
 */
function downloadResult(): void {
  if (!result.value) {
    return;
  }
  const blob = new Blob([JSON.stringify(result.value, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'extraction-result.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Send the extraction request to the v2 API.
 */
async function runExtraction(): Promise<void> {
  error.value = '';
  result.value = null;

  if (!formState.html && !formState.markdown) {
    error.value = 'Please provide either HTML or Markdown content.';
    return;
  }
  if (!parsedSchema.value) {
    error.value = schemaError.value || 'Please provide a valid extraction schema.';
    return;
  }

  const payload: ExtractRequestV2 = {
    extractorOptions: {
      extractionSchema: parsedSchema.value,
      ...(formState.prompt ? { extractionPrompt: formState.prompt } : {}),
      mode: 'llm-extraction',
    },
    ...(formState.html ? { html: formState.html } : {}),
    ...(formState.markdown ? { markdown: formState.markdown } : {}),
  };

  try {
    loading.value = true;
    const response = (await api.extraction.extractData(
      payload,
    )) as AxiosResponse<ExtractResponseV2>;
    if (response.data.success) {
      result.value = response.data.data ?? {};
    } else {
      throw new Error(response.data.error || 'Extraction failed.');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Extraction failed.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem 1rem;
}

.extract-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

textarea {
  width: 100%;
  font-family: 'Fira Code', monospace;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.75rem;
}

.primary-button,
.secondary-button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.primary-button {
  background-color: #1d4ed8;
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
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.result pre {
  background-color: #0f172a;
  color: #f8fafc;
  padding: 0.75rem;
  border-radius: 6px;
  overflow-x: auto;
}

.error {
  color: #b91c1c;
}
</style>
