<template>
  <div class="page-container extract-view">
    <h1>Extract Data (API v2)</h1>
    <form @submit.prevent="runExtraction" class="extract-form">
      <div class="form-group">
        <label for="html-input">HTML Content</label>
        <textarea
          id="html-input"
          v-model="htmlInput"
          rows="6"
          placeholder="Paste raw HTML here"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="markdown-input">Markdown Content</label>
        <textarea
          id="markdown-input"
          v-model="markdownInput"
          rows="6"
          placeholder="Paste markdown content here"
        ></textarea>
        <small
          >Provide either HTML or Markdown. HTML takes precedence when both are provided.</small
        >
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Extractor Options</legend>
        <div class="form-group">
          <label for="mode-select">Mode:</label>
          <select id="mode-select" v-model="mode">
            <option value="llm-extraction">LLM Extraction</option>
          </select>
        </div>
        <div class="form-group">
          <label for="prompt-input">Extraction Prompt</label>
          <textarea
            id="prompt-input"
            v-model="promptInput"
            rows="3"
            placeholder="Describe the data to extract"
          ></textarea>
        </div>
        <div class="form-group">
          <label for="schema-input">Extraction Schema (JSON object)</label>
          <textarea
            id="schema-input"
            v-model="schemaInput"
            rows="6"
            placeholder='{"title": {"type": "string"}}'
          ></textarea>
          <div v-if="schemaError" class="schema-error">{{ schemaError }}</div>
        </div>
      </fieldset>

      <button type="submit" class="primary-button" :disabled="loading">
        {{ loading ? 'Running…' : 'Extract' }}
      </button>
    </form>

    <div v-if="error" class="status error">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
    </div>

    <div v-if="result" class="result">
      <div class="result-header">
        <h2>Result</h2>
        <button class="secondary-button" @click="downloadResult">Download JSON</button>
      </div>
      <pre>{{ formattedResult }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { postV2 } from '@/api/v2Client';

interface ExtractResponseV2 {
  success?: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export default defineComponent({
  name: 'ExtractViewV2',
  setup() {
    const htmlInput = ref('');
    const markdownInput = ref('');
    const promptInput = ref('');
    const schemaInput = ref('');
    const mode = ref<'llm-extraction'>('llm-extraction');

    const schemaError = ref<string | null>(null);
    const parsedSchema = ref<Record<string, unknown> | null>(null);
    const loading = ref(false);
    const error = ref('');
    const result = ref<Record<string, unknown> | null>(null);

    /**
     * Computes a human-readable JSON string for the extracted result.
     *
     * @returns {string} The formatted JSON or an empty string when no result is present.
     */
    const formattedResult = computed(() =>
      result.value ? JSON.stringify(result.value, null, 2) : '',
    );

    /**
     * Parses the JSON schema input when it changes and keeps validation errors in sync.
     */
    watch(
      schemaInput,
      (value) => {
        if (!value.trim()) {
          schemaError.value = 'Schema is required for API v2 extraction.';
          parsedSchema.value = null;
          return;
        }
        try {
          const parsed = JSON.parse(value);
          if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
            throw new Error('Schema must be a JSON object.');
          }
          parsedSchema.value = parsed as Record<string, unknown>;
          schemaError.value = null;
        } catch (err) {
          schemaError.value = err instanceof Error ? err.message : 'Invalid schema JSON.';
          parsedSchema.value = null;
        }
      },
      { immediate: true },
    );

    /**
     * Validates user input and sends the extraction request to the API.
     *
     * @returns {Promise<void>} Resolves when the extraction request completes.
     */
    const runExtraction = async (): Promise<void> => {
      error.value = '';
      result.value = null;

      if (!htmlInput.value.trim() && !markdownInput.value.trim()) {
        error.value = 'Please provide HTML or Markdown content.';
        return;
      }
      if (schemaError.value || !parsedSchema.value) {
        error.value = schemaError.value || 'A valid schema is required.';
        return;
      }

      const payload: Record<string, unknown> = {
        extractorOptions: {
          mode: mode.value,
          extractionSchema: parsedSchema.value,
          ...(promptInput.value.trim() ? { extractionPrompt: promptInput.value.trim() } : {}),
        },
      };
      if (htmlInput.value.trim()) {
        payload.html = htmlInput.value;
      }
      if (markdownInput.value.trim()) {
        payload.markdown = markdownInput.value;
      }

      loading.value = true;
      try {
        const response = await postV2<ExtractResponseV2>('extract', payload);
        if (response.data.success && response.data.data) {
          result.value = response.data.data;
        } else {
          throw new Error(response.data.error || 'Extraction failed.');
        }
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Extraction request failed.';
      } finally {
        loading.value = false;
      }
    };

    /**
     * Downloads the extraction result as a JSON file.
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
      link.download = 'extract-result-v2.json';
      link.click();
      URL.revokeObjectURL(link.href);
    };

    return {
      htmlInput,
      markdownInput,
      promptInput,
      schemaInput,
      schemaError,
      loading,
      error,
      result,
      formattedResult,
      mode,
      runExtraction,
      downloadResult,
    };
  },
});
</script>

<style scoped>
@import '@/assets/main.css';

.extract-view {
  max-width: 800px;
  margin: 0 auto;
}

.extract-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.options-fieldset {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.schema-error {
  color: #c0392b;
  margin-top: 0.5rem;
}

.secondary-button {
  background-color: #f0f0f0;
  border: 1px solid var(--color-border);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}

.secondary-button:hover {
  background-color: #e0e0e0;
}
</style>
