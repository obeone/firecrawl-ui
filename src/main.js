  import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import apiConfig from './config/api'
import { CrawlingApi, ScrapingApi } from './api-client'

const app = createApp(App)

// Configurer l'API
const api = {
  crawling: new CrawlingApi(apiConfig),
  scraping: new ScrapingApi(apiConfig)
}

// Fournir l'API à toute l'application
app.provide('api', api)

app
  .use(router)
  .mount('#app')
