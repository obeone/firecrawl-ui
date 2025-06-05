import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import apiPlugin from './plugins/api'
import ApiKeyInput from './components/ApiKeyInput.vue'

const app = createApp(App)

// Gestion globale des erreurs similaires à main.ts
app.config.errorHandler = (err, instance, info) => {
  if (err instanceof Error && err.message.includes('401')) {
    router.push({ name: 'ApiConfig' })
  }
  console.error('Error:', err, info)
}

app.use(apiPlugin)
app.use(router)

// Enregistrer ApiKeyInput globalement
app.component('ApiKeyInput', ApiKeyInput)

app.mount('#app')
