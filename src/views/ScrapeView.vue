<template>
  <div class="scrape-view">
    <h1>Scrape a URL</h1>
    <form @submit.prevent="submit">
      <div class="form-group">
        <label for="url">URL</label>
        <input id="url" v-model="form.url" required placeholder="https://example.com" />
      </div>
      <div class="form-group">
        <label for="formats">Formats</label>
        <select id="formats" v-model="form.formats" multiple>
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="rawHtml">Raw HTML</option>
          <option value="links">Links</option>
          <option value="screenshot">Screenshot</option>
          <option value="screenshot@fullPage">Screenshot Full Page</option>
          <option value="json">JSON</option>
          <option value="changeTracking">Change Tracking</option>
        </select>
      </div>
      <label>
        <input type="checkbox" v-model="form.onlyMainContent" /> Only Main Content
      </label>
      <div class="form-group">
        <label>Include Tags</label>
        <input v-model="includeTags" placeholder="p,div" />
      </div>
      <div class="form-group">
        <label>Exclude Tags</label>
        <input v-model="excludeTags" placeholder="script,style" />
      </div>
      <div class="form-group">
        <label>Wait For (ms)</label>
        <input type="number" v-model.number="form.waitFor" min="0" />
      </div>
      <div class="form-group">
        <label>Timeout (ms)</label>
        <input type="number" v-model.number="form.timeout" min="0" />
      </div>
      <label><input type="checkbox" v-model="form.mobile" /> Mobile</label>
      <label><input type="checkbox" v-model="form.skipTlsVerification" /> Skip TLS Verification</label>
      <div class="form-group">
        <label>Proxy</label>
        <select v-model="form.proxy">
          <option value="">Default</option>
          <option value="basic">Basic</option>
          <option value="stealth">Stealth</option>
        </select>
      </div>
      <label><input type="checkbox" v-model="form.blockAds" /> Block Ads</label>
      <label><input type="checkbox" v-model="form.removeBase64Images" /> Remove Base64 Images</label>
      <div class="form-group">
        <label>Headers (JSON)</label>
        <textarea v-model="headersJson" rows="4" placeholder='{"User-Agent":"MyBot"}'></textarea>
      </div>
      <div class="form-group">
        <label>JSON Options</label>
        <textarea v-model="jsonOptionsJson" rows="4" placeholder='{"schema":{}}'></textarea>
      </div>
      <div class="form-group">
        <label>Change Tracking Options</label>
        <textarea v-model="changeTrackingJson" rows="4" placeholder='{"modes":["git-diff"]}'></textarea>
      </div>
      <button type="submit" :disabled="loading">{{ loading ? 'Processing...' : 'Scrape' }}</button>
    </form>

    <div v-if="error" class="error">{{ error }}</div>
    <pre v-if="result">{{ result }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue'
import axios from 'axios'
import apiConfig from '../config/api'

export default defineComponent({
  name: 'ScrapeView',
  setup() {
    const form = reactive({
      url: '',
      formats: ['markdown'] as string[],
      onlyMainContent: true,
      waitFor: 0,
      mobile: false,
      skipTlsVerification: false,
      timeout: 30000,
      proxy: '',
      blockAds: true,
      removeBase64Images: false
    })
    const includeTags = ref('')
    const excludeTags = ref('')
    const headersJson = ref('{}')
    const jsonOptionsJson = ref('')
    const changeTrackingJson = ref('')
    const loading = ref(false)
    const error = ref('')
    const result = ref('')

    const submit = async () => {
      error.value = ''
      let headers: any = {}
      let jsonOptions: any = undefined
      let changeOptions: any = undefined
      try { headers = headersJson.value ? JSON.parse(headersJson.value) : {} } catch { error.value = 'Invalid headers JSON'; return }
      try { jsonOptions = jsonOptionsJson.value ? JSON.parse(jsonOptionsJson.value) : undefined } catch { error.value = 'Invalid JSON options'; return }
      try { changeOptions = changeTrackingJson.value ? JSON.parse(changeTrackingJson.value) : undefined } catch { error.value = 'Invalid change tracking options'; return }

      const payload: any = {
        url: form.url,
        formats: form.formats,
        onlyMainContent: form.onlyMainContent,
        headers: Object.keys(headers).length ? headers : undefined,
        waitFor: form.waitFor || undefined,
        mobile: form.mobile || undefined,
        skipTlsVerification: form.skipTlsVerification || undefined,
        timeout: form.timeout || undefined,
        proxy: form.proxy || undefined,
        blockAds: form.blockAds,
        removeBase64Images: form.removeBase64Images,
        jsonOptions,
        changeTrackingOptions: changeOptions
      }
      if (includeTags.value.trim()) payload.includeTags = includeTags.value.split(',').map(t => t.trim()).filter(Boolean)
      if (excludeTags.value.trim()) payload.excludeTags = excludeTags.value.split(',').map(t => t.trim()).filter(Boolean)
      loading.value = true
      try {
        const apiKey = localStorage.getItem('firecrawl_api_key') || ''
        const { data } = await axios.post(`${apiConfig.basePath}/scrape`, payload, { headers: { Authorization: `Bearer ${apiKey}` } })
        result.value = JSON.stringify(data, null, 2)
      } catch (e: any) {
        error.value = e.response?.data?.error || e.message
      } finally {
        loading.value = false
      }
    }

    return { form, includeTags, excludeTags, headersJson, jsonOptionsJson, changeTrackingJson, loading, error, result, submit }
  }
})
</script>

<style scoped>
.scrape-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
.form-group {
  margin-bottom: 1rem;
}
.error {
  color: red;
  margin-top: 1rem;
}
pre {
  background: #f6f8fa;
  padding: 1rem;
  overflow-x: auto;
}
</style>
