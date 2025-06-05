<template>
  <div class="crawl-view">
    <h1>Lancer un Crawl</h1>
    <form @submit.prevent="startCrawl">
      <div class="form-group">
        <label for="url">URL de base :</label>
        <input id="url" v-model="form.url" required placeholder="https://exemple.com" />
      </div>
      <div class="form-group">
        <label for="include">Includes (Regex):</label>
        <input id="include" v-model="includeInput" placeholder="blog/.*" />
      </div>
      <div class="form-group">
        <label for="exclude">Excludes (Regex):</label>
        <input id="exclude" v-model="excludeInput" placeholder="admin/.*" />
      </div>
      <div class="grid-layout">
        <div class="form-group">
          <label for="maxDepth">Profondeur max:</label>
          <input id="maxDepth" type="number" v-model.number="form.maxDepth" min="1" />
        </div>
        <div class="form-group">
          <label for="limit">Limite de pages:</label>
          <input id="limit" type="number" v-model.number="form.limit" min="1" />
        </div>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.ignoreSitemap" /> Ignorer le sitemap
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.allowExternalLinks" /> Liens externes
        </label>
      </div>

      <fieldset class="form-group options-fieldset">
        <legend>Formats de sortie</legend>
        <select multiple v-model="form.scrapeOptions.formats">
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="screenshot">Screenshot</option>
        </select>
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.scrapeOptions.onlyMainContent" /> Contenu principal uniquement
        </label>
      </fieldset>
      <button type="submit" :disabled="loading">{{ loading ? 'En cours...' : 'Démarrer' }}</button>
    </form>

    <div v-if="currentId" class="status">
      <h2>Crawl {{ currentId }}</h2>
      <p>Statut : {{ status?.status || '...' }}</p>
      <div class="progress">
        <div class="bar" :style="{ width: progress + '%' }"></div>
      </div>
      <p>{{ status?.completed || 0 }} / {{ status?.total || 0 }} pages</p>
      <pre v-if="preview">{{ preview }}</pre>
      <div class="downloads">
        <button @click="downloadJson" :disabled="!status?.data">Télécharger JSON</button>
        <button
          v-for="fmt in form.scrapeOptions.formats"
          :key="fmt"
          @click="downloadFormat(fmt)"
          :disabled="!status?.data"
        >
          {{ fmt }}
        </button>
        <button
          v-if="status?.status === 'scraping'"
          @click="cancelCurrent"
          class="cancel"
        >
          Arrêter
        </button>
      </div>
    </div>

    <h2>Historique</h2>
    <ul class="history">
      <li v-for="job in history" :key="job.id">
        <a href="#" @click.prevent="loadJob(job.id)">
          {{ job.url }} - {{ job.status }}
        </a>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue'
import type { CrawlingApi, CrawlUrlsRequest, CrawlStatusResponseObj } from '@/api-client'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const api = inject<{ crawling: CrawlingApi }>('api')!

const form = reactive<CrawlUrlsRequest>({
  url: '',
  includePaths: [],
  excludePaths: [],
  maxDepth: undefined,
  ignoreSitemap: false,
  limit: undefined,
  allowExternalLinks: false,
  scrapeOptions: {
    formats: ['markdown'],
    onlyMainContent: true
  }
})

const includeInput = ref('')
const excludeInput = ref('')
const loading = ref(false)
const currentId = ref<string | null>(null)
const status = ref<CrawlStatusResponseObj | null>(null)
let timer: any

const history = ref<Array<{ id: string; url: string; status: string }>>([])

onMounted(() => {
  const saved = localStorage.getItem('crawl_history')
  if (saved) history.value = JSON.parse(saved)
})

onUnmounted(() => clearInterval(timer))

const preview = computed(() =>
  status.value?.data ? JSON.stringify(status.value.data.slice(0, 3), null, 2) : ''
)
const progress = computed(() => {
  if (!status.value?.total) return 0
  return Math.round(((status.value.completed || 0) / status.value.total) * 100)
})

function saveHistory() {
  localStorage.setItem('crawl_history', JSON.stringify(history.value))
}

async function startCrawl() {
  includeInput.value && (form.includePaths = includeInput.value.split(',').map(s => s.trim()).filter(Boolean))
  excludeInput.value && (form.excludePaths = excludeInput.value.split(',').map(s => s.trim()).filter(Boolean))
  loading.value = true
  try {
    const { data } = await api.crawling.crawlUrls(form)
    if (data.id) {
      currentId.value = data.id
      history.value.unshift({ id: data.id, url: form.url, status: 'scraping' })
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
      const { data } = await api.crawling.getCrawlStatus(currentId.value)
      status.value = data
      const h = history.value.find(j => j.id === currentId.value)
      if (h && data.status) { h.status = data.status; saveHistory() }
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(timer)
      }
    } catch (e) {
      console.error(e)
    }
  }
  fetchStatus()
  timer = setInterval(fetchStatus, 5000)
}

function downloadJson() {
  if (!status.value?.data) return
  const blob = new Blob([JSON.stringify(status.value.data, null, 2)], { type: 'application/json' })
  saveAs(blob, `crawl_${currentId.value}.json`)
}

async function downloadFormat(fmt: string) {
  if (!status.value?.data) return
  const zip = new JSZip()
  const key = fmt.includes('@') ? fmt.split('@')[0] : fmt
  let ext = '.txt'
  if (key === 'markdown') ext = '.md'
  else if (key === 'html' || key === 'rawHtml') ext = '.html'
  else if (key === 'json') ext = '.json'
  status.value.data.forEach((page, idx) => {
    const data: any = (page as any)[key]
    if (!data) return
    const meta: any = (page as any).metadata || {}
    let fileName = `page_${idx + 1}`
    if (meta.sourceURL) {
      try {
        const urlObj = new URL(meta.sourceURL)
        fileName = `${urlObj.hostname}${urlObj.pathname}`
      } catch {
        // ignore malformed URLs
      }
    }
    fileName = fileName
      .replace(/^\/+/, '')
      .replace(/\/$/, '')
      .replace(/[\\/?%*:|"<>]/g, '_') || `page_${idx + 1}`
    const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)
    zip.file(`${fileName}${ext}`, content)
  })
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${key}_files_${currentId.value}.zip`)
}

async function cancelCurrent() {
  if (!currentId.value) return
  try {
    await api.crawling.cancelCrawl(currentId.value)
    if (status.value) status.value.status = 'cancelled'
    const h = history.value.find(j => j.id === currentId.value)
    if (h) { h.status = 'cancelled'; saveHistory() }
    clearInterval(timer)
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped>
.crawl-view {
  max-width: 900px;
  margin: 0 auto;
}
.form-group {
  margin-bottom: 1rem;
}
.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
