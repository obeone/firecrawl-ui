<template>
  <div class="crawl-view">
    <h1>Configuration du Crawl</h1>
    <div class="form-container">
      <div class="input-group">
        <label for="url">URL de départ :</label>
        <input id="url" v-model="startUrl" type="text" placeholder="https://example.com">
      </div>
      <div class="input-group">
        <label for="depth">Profondeur :</label>
        <input id="depth" v-model.number="depth" type="number" min="1" max="10">
      </div>
      <div class="input-group">
        <label>Formats à inclure :</label>
        <div class="formats-checkboxes">
          <label v-for="format in availableFormats" :key="format.value">
            <input type="checkbox" v-model="selectedFormats" :value="format.value">
            {{ format.label }}
          </label>
        </div>
      </div>
      <button 
        @click="startCrawl" 
        class="submit-btn"
        :disabled="isLoading"
      >
        <span v-if="!isLoading">Démarrer le Crawl</span>
        <span v-else>En cours...</span>
      </button>
    </div>

    <div v-if="crawlId" class="monitoring">
      <h2>Suivi du crawl</h2>
      <div>
        <strong>ID :</strong> {{ crawlId }}
      </div>
      <div>
        <strong>Statut :</strong> {{ crawlStatus }}
      </div>
      <div>
        <strong>Progression :</strong>
        <span v-if="totalPages > 0">{{ completedPages }} / {{ totalPages }}</span>
        <span v-else>En attente...</span>
        <div v-if="totalPages > 0" class="progressbar-container">
          <div class="progressbar-bg">
            <div
              class="progressbar-fg"
              :style="{ width: ((completedPages / totalPages) * 100) + '%' }"
            ></div>
          </div>
          <span class="progressbar-percent">{{ Math.round((completedPages / totalPages) * 100) }}%</span>
        </div>
      </div>
      <div>
        <strong>Crédits utilisés :</strong> {{ creditsUsed }}
      </div>
      <button v-if="crawlStatus === 'scraping'" @click="cancelCrawl" class="cancel-btn">Annuler le crawl</button>
    </div>

    <div v-if="allCrawledData.length" class="results">
      <h2>Résultats partiels</h2>
      <div class="results-scrollbox">
        <ul>
          <li v-for="(item, idx) in allCrawledData" :key="idx">
            <strong>{{ item.metadata?.title || 'Sans titre' }}</strong>
            <br>
            <span>{{ item.metadata?.sourceURL }}</span>
            <span v-if="item.metadata?.statusCode"> - Code HTTP: {{ item.metadata.statusCode }}</span>
            <span v-if="item.metadata?.error" class="error"> - Erreur: {{ item.metadata.error }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-if="crawlStatus === 'completed' && !nextPageUrl" class="download-section">
      <button @click="downloadZip" class="download-btn">Télécharger les résultats (.zip)</button>
    </div>

    <div v-if="errorMsg" class="error-message">
      {{ errorMsg }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onUnmounted } from 'vue'
import type { CrawlingApi } from '../api-client/api.js'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
// @ts-ignore
// eslint-disable-next-line

const startUrl = ref('')
const depth = ref(1)
const availableFormats = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'rawHtml', label: 'Raw HTML' },
  { value: 'links', label: 'Liens' },
  { value: 'screenshot', label: 'Capture d\'écran' }
]
const selectedFormats = ref(['markdown'])

const isLoading = ref(false)
const crawlId = ref<string | null>(null)
const crawlStatus = ref<string>('en attente')
const totalPages = ref(0)
const completedPages = ref(0)
const creditsUsed = ref(0)
const nextPageUrl = ref<string | null>(null)
const allCrawledData = ref<any[]>([])
const pollingInterval = ref<number | null>(null)
const errorMsg = ref('')

const api = inject('api') as { crawling: CrawlingApi }

const startCrawl = async () => {
  if (!startUrl.value) return
  isLoading.value = true
  crawlId.value = null
  crawlStatus.value = 'en attente'
  totalPages.value = 0
  completedPages.value = 0
  creditsUsed.value = 0
  nextPageUrl.value = null
  allCrawledData.value = []
  errorMsg.value = ''

  try {
    const response = await api.crawling.crawlUrls({
      url: startUrl.value,
      maxDepth: depth.value,
      scrapeOptions: {
        formats: selectedFormats.value as any // Correction TS: cast en enum[]
      }
    })
    if (response.data?.success && response.data.id) {
      crawlId.value = response.data.id
      crawlStatus.value = 'scraping'
      pollCrawlStatus()
    } else {
      errorMsg.value = 'Erreur lors du démarrage du crawl.'
    }
  } catch (error: any) {
    errorMsg.value = 'Erreur de crawl: ' + (error?.message || error)
  } finally {
    isLoading.value = false
  }
}

const pollCrawlStatus = async () => {
  if (!crawlId.value) return
  if (pollingInterval.value) clearInterval(pollingInterval.value)
  const poll = async () => {
    try {
      const res = await api.crawling.getCrawlStatus(crawlId.value!) // Non-null assertion
      const data = res.data
      crawlStatus.value = data.status ?? 'en attente'
      totalPages.value = data.total || 0
      completedPages.value = data.completed || 0
      creditsUsed.value = data.creditsUsed || 0
      nextPageUrl.value = data.next || null
      if (Array.isArray(data.data)) {
        // Accumule sans doublons
        const existingUrls = new Set(allCrawledData.value.map((item: any) => item.metadata?.sourceURL))
        for (const item of data.data) {
          if (!existingUrls.has(item.metadata?.sourceURL)) {
            allCrawledData.value.push(item)
          }
        }
      }
      if (data.status === 'completed' && !data.next) {
        clearInterval(pollingInterval.value!)
        pollingInterval.value = null
      }
      if (data.status === 'failed' || data.status === 'cancelled') {
        clearInterval(pollingInterval.value!)
        pollingInterval.value = null
      }
      // Pagination : si next existe, on va chercher la page suivante
      if (data.next) {
        fetchNextPage(data.next)
      }
    } catch (e: any) {
      errorMsg.value = 'Erreur lors du suivi du crawl : ' + (e?.message || e)
      clearInterval(pollingInterval.value!)
      pollingInterval.value = null
    }
  }
  await poll()
  pollingInterval.value = setInterval(poll, 5000) as unknown as number
}

const fetchNextPage = async (url: string) => {
  try {
    const res = await api.crawling.getCrawlStatus(crawlId.value!, { url })
    const data = res.data
    nextPageUrl.value = data.next || null
    if (Array.isArray(data.data)) {
      const existingUrls = new Set(allCrawledData.value.map((item: any) => item.metadata?.sourceURL))
      for (const item of data.data) {
        if (!existingUrls.has(item.metadata?.sourceURL)) {
          allCrawledData.value.push(item)
        }
      }
    }
    if (!data.next) {
      nextPageUrl.value = null
    }
  } catch (e: any) {
    errorMsg.value = 'Erreur lors de la récupération des pages paginées : ' + (e?.message || e)
  }
}

const cancelCrawl = async () => {
  if (!crawlId.value) return
  try {
    await api.crawling.cancelCrawl(crawlId.value)
    crawlStatus.value = 'cancelled'
    if (pollingInterval.value) clearInterval(pollingInterval.value)
  } catch (e: any) {
    errorMsg.value = 'Erreur lors de l\'annulation : ' + (e?.message || e)
  }
}

const downloadZip = async () => {
  const zip = new JSZip()
  // Ajout du JSON global
  zip.file('results.json', JSON.stringify(allCrawledData.value, null, 2))
  // Ajout des fichiers individuels
  for (const item of allCrawledData.value) {
    const baseName = (item.metadata?.sourceURL || 'page').replace(/https?:\/\//, '').replace(/[^\w\d\-_.]/g, '_')
    if (item.markdown) zip.file(`${baseName}/content.md`, item.markdown)
    if (item.html) zip.file(`${baseName}/content.html`, item.html)
    if (item.rawHtml) zip.file(`${baseName}/raw.html`, item.rawHtml)
    if (item.links) zip.file(`${baseName}/links.txt`, item.links.join('\n'))
    if (item.screenshot) {
      // Screenshot en base64, on extrait le type MIME si présent
      const match = /^data:(image\/\w+);base64,/.exec(item.screenshot)
      const mime = match ? match[1] : 'image/png'
      const ext = mime.split('/')[1] || 'png'
      const base64 = item.screenshot.replace(/^data:image\/\w+;base64,/, '')
      zip.file(`${baseName}/screenshot.${ext}`, base64, { base64: true })
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, 'firecrawl_results.zip')
}

onUnmounted(() => {
  if (pollingInterval.value) clearInterval(pollingInterval.value)
})
</script>

<style scoped>
.crawl-view {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
.input-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}
input[type="text"], input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.formats-checkboxes {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.submit-btn, .cancel-btn, .download-btn {
  background-color: #42b983;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-top: 1rem;
}
.submit-btn:hover, .cancel-btn:hover, .download-btn:hover {
  background-color: #3aa876;
}
.monitoring {
  margin-top: 2rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}
.results {
  margin-top: 2rem;
  border-top: 1px solid #eee;
  padding-top: 1rem;
}
.download-section {
  margin-top: 2rem;
}
.error-message, .error {
  color: #d32f2f;
  margin-top: 1rem;
}
</style>

<style scoped>
.progressbar-container {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.progressbar-bg {
  width: 200px;
  height: 16px;
  background: #eee;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}
.progressbar-fg {
  height: 100%;
  background: #42b983;
  width: 0;
  transition: width 0.3s;
}
.progressbar-percent {
  min-width: 32px;
  font-size: 0.95em;
  color: #333;
  font-weight: bold;
}
.results-scrollbox {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #444857;
  border-radius: 6px;
  padding: 1rem;
  background: #23272f;
  color: #f8f8f2;
  font-family: 'Fira Mono', 'Consolas', 'Menlo', monospace;
  font-size: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
</style>
