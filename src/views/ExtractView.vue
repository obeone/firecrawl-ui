<template>
  <div class="extract-container">
    <h1>Data Extraction</h1>
    <form class="extract-form" @submit.prevent="startExtraction">
      <div class="form-group">
        <label for="urls">URLs (one per line):</label>
        <textarea id="urls" v-model="urlsString" rows="4" required></textarea>
      </div>
      <div class="form-group">
        <label for="prompt">Prompt:</label>
        <textarea id="prompt" v-model="prompt" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="schema">JSON Schema (optional):</label>
        <textarea id="schema" v-model="schemaString" rows="5"></textarea>
        <small v-if="schemaError" class="schema-error">Error: {{ schemaError }}</small>
      </div>
      <button type="submit" :disabled="loading || !!schemaError">
        {{ loading ? 'Submitting...' : 'Start Extraction' }}
      </button>
    </form>

    <div v-if="currentJobId" class="current-section">
      <h2>Job {{ currentJobId }}</h2>
      <p>Status: {{ currentStatus }}</p>
      <div class="progress-container" v-if="currentStatus === 'processing'">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>
      <pre v-if="currentData">{{ preview }}</pre>
      <button v-if="currentStatus === 'processing'" @click="cancelPolling">Cancel</button>
      <div v-if="currentData" class="download-buttons">
        <button @click="downloadJson">JSON</button>
        <button v-if="userRequestedJson" @click="downloadUserJson">JSON user</button>
        <button v-else @click="downloadText">Text</button>
      </div>
    </div>

    <div class="history-section">
      <h2>History</h2>
      <ul v-if="history.length">
        <li v-for="job in history" :key="job.id">
          <strong>ID:</strong> {{ job.id }} |
          <strong>Date:</strong> {{ new Date(job.createdAt).toLocaleString() }} |
          <strong>Status:</strong> {{ job.status }}
        </li>
      </ul>
      <p v-else>No extraction history.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { ExtractionApi } from '@/api-client';
import apiConfig from '@/config/api';

/** Job information stored in history. */
interface ExtractJob {
  id: string;
  createdAt: number;
  status: string;
  urls: string[];
}

const api = inject('api') as { extraction?: ExtractionApi } | undefined;
if (!api || !api.extraction) {
  throw new Error('API client or extraction API is not provided.');
}

const urlsString = ref('');
const prompt = ref('');
const schemaString = ref('');
const schemaError = ref<string | null>(null);
const loading = ref(false);
const currentJobId = ref<string | null>(null);
const currentStatus = ref('');
const currentData = ref<any>(null);
const history = ref<ExtractJob[]>([]);

const HISTORY_KEY = 'extractHistory';
let pollInterval: any = null;

/** Parse the user provided schema string. */
const parsedSchema = computed(() => {
  if (!schemaString.value.trim()) {
    schemaError.value = null;
    return undefined;
  }
  try {
    const parsed = JSON.parse(schemaString.value);
    schemaError.value = null;
    return parsed;
  } catch (e: any) {
    schemaError.value = e.message;
    return null;
  }
});

/** Total number of URLs to process. */
const totalUrls = computed(() =>
  urlsString.value
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean).length
);

/** Progress based on processed URLs in the data object. */
const progress = computed(() => {
  if (currentStatus.value === 'completed') return 100;
  if (!currentData.value) return 0;
  const processed = Object.keys(currentData.value).length;
  return totalUrls.value
    ? Math.min(100, Math.round((processed / totalUrls.value) * 100))
    : 0;
});

/** Text preview of current extraction data. */
const preview = computed(() =>
  currentData.value ? JSON.stringify(currentData.value, null, 2) : ''
);

/** Indicate whether the user requested a JSON schema. */
const userRequestedJson = computed(() => parsedSchema.value !== undefined);

/** Save history to local storage. */
const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
};

/** Load history on component mount. */
onMounted(() => {
  const stored = localStorage.getItem(HISTORY_KEY);
  if (stored) {
    try {
      history.value = JSON.parse(stored);
    } catch {
      history.value = [];
    }
  }
});

/** Clear polling interval on unmount. */
onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

/** Start a new extraction job. */
const startExtraction = async () => {
  if (schemaError.value) return;
  const urls = urlsString.value
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean);
  if (!urls.length) return;

  loading.value = true;
  try {
    const payload: any = { urls };
    if (prompt.value) payload.prompt = prompt.value;
    if (parsedSchema.value && parsedSchema.value !== undefined) {
      payload.schema = parsedSchema.value;
    }
    const { data } = await api.extraction!.extractData(payload);
    if (data.success && data.id) {
      currentJobId.value = data.id;
      currentStatus.value = 'processing';
      currentData.value = null;
      const job: ExtractJob = {
        id: data.id,
        createdAt: Date.now(),
        status: 'processing',
        urls,
      };
      history.value.unshift(job);
      saveHistory();
      pollStatus(data.id);
    } else {
      throw new Error('Extraction failed');
    }
  } catch (err) {
    console.error('Extraction start failed:', err);
  } finally {
    loading.value = false;
  }
};

/** Poll extraction status and update preview. */
const pollStatus = (id: string) => {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(async () => {
    try {
      const resp = await axios.get(`${apiConfig.basePath}/extract/${id}`, {
        headers: apiConfig.baseOptions?.headers,
      });
      currentStatus.value = resp.data.status;
      currentData.value = resp.data.data;
      const job = history.value.find((j) => j.id === id);
      if (job) job.status = resp.data.status;
      if (['completed', 'failed', 'cancelled'].includes(resp.data.status)) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      saveHistory();
    } catch (err) {
      console.error('Polling failed:', err);
    }
  }, 1000);
};

/** Stop polling for the current job. */
const cancelPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    currentStatus.value = 'cancelled';
  }
};

/** Generic helper to download a string as a file. */
const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/** Download the entire result as JSON. */
const downloadJson = () => {
  if (!currentData.value) return;
  downloadFile(JSON.stringify(currentData.value, null, 2), 'extract.json', 'application/json');
};

/** Download the user formatted JSON. */
const downloadUserJson = () => {
  if (!currentData.value) return;
  downloadFile(JSON.stringify(currentData.value, null, 2), 'user.json', 'application/json');
};

/** Download the result as plain text. */
const downloadText = () => {
  if (!currentData.value) return;
  downloadFile(String(currentData.value), 'extract.txt', 'text/plain');
};
</script>

<style scoped>
.extract-container {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
}
.form-group {
  margin-bottom: 15px;
}
.schema-error {
  color: #d9534f;
}
.progress-container {
  width: 100%;
  background-color: #e0e0e0;
  border-radius: 5px;
  margin-top: 10px;
  overflow: hidden;
}
.progress-bar {
  height: 20px;
  background-color: #4caf50;
  transition: width 0.5s ease;
}
.history-section {
  margin-top: 30px;
}
.download-buttons button {
  margin-right: 10px;
}
</style>
