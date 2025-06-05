<template>
  <div class="extract-view">
    <h1>Lancer une extraction</h1>
    <form @submit.prevent="startExtract">
      <div class="form-group">
        <label for="urls">URLs (glob)</label>
        <textarea id="urls" v-model="urlsInput" rows="4" placeholder="https://exemple.com/blog/*" required></textarea>
      </div>
      <div class="form-group">
        <label for="prompt">Prompt d'extraction</label>
        <textarea id="prompt" v-model="promptInput" rows="3"></textarea>
      </div>
      <div class="form-group">
        <label for="schema">Schéma JSON (optionnel)</label>
        <textarea id="schema" v-model="schemaInput" rows="5"></textarea>
        <small v-if="schemaError" class="schema-error">Erreur : {{ schemaError }}</small>
      </div>
      <button type="submit" :disabled="loading || !!schemaError">{{ loading ? 'En cours...' : 'Lancer' }}</button>
    </form>

    <div v-if="currentId" class="status">
      <h2>Extraction {{ currentId }}</h2>
      <p>Statut : {{ status?.status || '...' }}</p>
      <div class="progress">
        <div class="bar" :style="{ width: progress + '%' }"></div>
      </div>
      <p v-if="totalUrls">{{ extractedCount }} / {{ totalUrls }} pages</p>
      <pre v-if="preview">{{ preview }}</pre>
      <div class="downloads" v-if="extractedCount > 0">
        <button @click="downloadJson">JSON</button>
        <button v-if="usingCustomJson" @click="downloadCustomJson">JSON user</button>
        <button v-else @click="downloadText">Text</button>
        <button v-if="status?.status === 'processing'" @click="cancelCurrent" class="cancel">Annuler</button>
      </div>
    </div>

    <h2>Historique</h2>
    <ul class="history">
      <li v-for="job in history" :key="job.id">
        <a href="#" @click.prevent="loadJob(job.id)">
          {{ job.label }} - {{ job.status }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { saveAs } from 'file-saver'
import type { ExtractionApi } from '@/api-client'

const api = inject<{ extraction: ExtractionApi }>('api')!

const urlsInput = ref('')
const promptInput = ref('')
const schemaInput = ref('')
const schemaError = ref<string | null>(null)

const loading = ref(false)
const currentId = ref<string | null>(null)
const status = ref<any>(null)
const totalUrls = ref<number | null>(null)
let timer: any

interface HistoryItem { id: string; label: string; status: string }
const history = ref<HistoryItem[]>([])

onMounted(() => {
  const saved = localStorage.getItem('extract_history')
  if (saved) history.value = JSON.parse(saved)
})

onUnmounted(() => clearInterval(timer))

const usingCustomJson = computed(() => schemaInput.value.trim().length > 0)

const parsedSchema = computed(() => {
  if (!schemaInput.value.trim()) {
    schemaError.value = null
    return undefined
  }
  try {
    const obj = JSON.parse(schemaInput.value)
    schemaError.value = null
    return obj
  } catch (e: any) {
    schemaError.value = e.message
    return null
  }
})

function saveHistory() {
  localStorage.setItem('extract_history', JSON.stringify(history.value))
}

async function startExtract() {
  if (parsedSchema.value === null) return
  const urls = urlsInput.value.split('\n').map(u => u.trim()).filter(Boolean)
  if (!urls.length) return
  totalUrls.value = urls.length
  loading.value = true
  try {
    const payload: any = { urls }
    if (promptInput.value) payload.prompt = promptInput.value
    if (parsedSchema.value) payload.schema = parsedSchema.value
    const { data } = await api.extraction.axios.post(
      `${api.extraction.basePath}/extract`,
      payload,
      { headers: api.extraction.configuration.baseOptions?.headers }
    )
    const jobId = data.id || data.extractId
    if (jobId) {
      currentId.value = jobId
      history.value.unshift({ id: jobId, label: urls[0], status: 'processing' })
      saveHistory()
      pollStatus()
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function loadJob(id: string) {
  currentId.value = id
  pollStatus()
}

function pollStatus() {
  clearInterval(timer)
  if (!currentId.value) return
  const fetchStatus = async () => {
    if (!currentId.value) return
    try {
      const { data } = await api.extraction.axios.get(
        `${api.extraction.basePath}/extract/${currentId.value}`,
        { headers: api.extraction.configuration.baseOptions?.headers }
      )
      status.value = data
      const h = history.value.find(j => j.id === currentId.value)
      if (h && data.status) { h.status = data.status; saveHistory() }
      if (['completed','failed','cancelled'].includes(data.status)) {
        clearInterval(timer)
      }
    } catch (e) {
      console.error(e)
    }
  }
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
}

const extractedCount = computed(() => {
  if (!status.value?.data) return 0
  return Array.isArray(status.value.data) ? status.value.data.length : Object.keys(status.value.data).length
})

const progress = computed(() => {
  if (!totalUrls.value) return 0
  return Math.min(100, Math.round((extractedCount.value / totalUrls.value) * 100))
})

const preview = computed(() => {
  if (!status.value?.data) return ''
  const data = Array.isArray(status.value.data) ? status.value.data.slice(0, 3) : status.value.data
  return JSON.stringify(data, null, 2)
})

function downloadJson() {
  if (!status.value?.data) return
  const blob = new Blob([JSON.stringify(status.value.data, null, 2)], { type: 'application/json' })
  saveAs(blob, `extract_${currentId.value}.json`)
}

function downloadCustomJson() {
  if (!status.value?.data) return
  const blob = new Blob([JSON.stringify(status.value.data, null, 2)], { type: 'application/json' })
  saveAs(blob, `extract_${currentId.value}_custom.json`)
}

function downloadText() {
  if (!status.value?.data) return
  const text = JSON.stringify(status.value.data, null, 2)
  const blob = new Blob([text], { type: 'text/plain' })
  saveAs(blob, `extract_${currentId.value}.txt`)
}

function cancelCurrent() {
  clearInterval(timer)
  if (status.value) status.value.status = 'cancelled'
  const h = history.value.find(j => j.id === currentId.value)
  if (h) { h.status = 'cancelled'; saveHistory() }
}
</script>

<style scoped>
.extract-view {
  max-width: 900px;
  margin: 0 auto;
}
.form-group {
  margin-bottom: 1rem;
}
.schema-error {
  color: #d9534f;
  font-size: 0.85rem;
}
.status {
  margin-top: 2rem;
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 4px;
}
.progress {
  width: 100%;
  height: 20px;
  background: #eee;
  margin: 0.5rem 0;
  border-radius: 10px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: #4caf50;
}
.downloads button {
  margin-right: 0.5rem;
}
.cancel {
  background-color: #e53935;
  color: #fff;
  margin-left: 0.5rem;
}
.history {
  margin-top: 2rem;
}
.history li {
  margin-bottom: 0.25rem;
}
</style>
