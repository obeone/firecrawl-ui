import { createApp } from 'vue'
import App from './App.vue'
import apiPlugin from './plugins/api'
import router from './router'
import ApiKeyInput from './components/ApiKeyInput.vue'

const app = createApp(App)

// Gestion globale des erreurs
app.config.errorHandler = (err, instance, info) => {
  if (err instanceof Error && err.message.includes('401')) {
    // Rediriger vers la page de configuration de l'API si erreur 401
    router.push({ name: 'ApiConfig' })
  }
  console.error('Error:', err, info)
}

app.use(apiPlugin)
app.use(router)

// Enregistrer le composant globalement
app.component('ApiKeyInput', ApiKeyInput)

app.mount('#app')
