<template>
  <div class="home">
    <h1>Firecrawl UI</h1>
    <div class="actions">
      <button @click="testScraping">Test Scraping</button>
      <button @click="testCrawling">Test Crawling</button>
    </div>
    <div v-if="result" class="result">
      <pre>{{ result }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HomeView',
  data() {
    return {
      result: null as any
    }
  },
  methods: {
    async testScraping() {
      try {
        const response = await this.$api.scraping.scrapeAndExtractFromUrl({
          url: 'https://example.com',
          formats: ['markdown']
        })
        this.result = response.data
      } catch (error) {
        this.result = { error: error.message }
      }
    },
    async testCrawling() {
      try {
        const response = await this.$api.crawling.crawlUrls({
          url: 'https://example.com',
          maxDepth: 1
        })
        this.result = response.data
      } catch (error) {
        this.result = { error: error.message }
      }
    }
  }
})
</script>

<style scoped>
.home {
  padding: 2rem;
}
.actions {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}
.result {
  margin-top: 2rem;
  padding: 1rem;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
