<template>
  <div class="api-key-input">
    <h2>Configuration de l'API</h2>
    <form @submit.prevent="saveApiConfig">
      <div class="form-group">
        <label for="apiKey">Clé API Firecrawl:</label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="Entrez votre clé API"
          required
        >
        <small>
          Vous pouvez obtenir votre clé API sur <a href="https://app.firecrawl.dev" target="_blank">le dashboard Firecrawl</a>
        </small>
      </div>
      <div class="form-group">
        <label for="baseUrl">URL de base de l'API Firecrawl (optionnel):</label>
        <input
          id="baseUrl"
          v-model="baseUrl"
          type="text"
          placeholder="https://api.firecrawl.dev/v1"
        >
        <small>
          Laissez vide pour utiliser l'URL par défaut.
        </small>
      </div>
      <button type="submit">Enregistrer</button>
    </form>
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
    <div v-if="success" class="success-message">
      Clé API enregistrée avec succès!
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'

export default defineComponent({
  name: 'ApiKeyInput',
  setup() {
    const apiKey = ref(localStorage.getItem('firecrawl_api_key') || '')
    const baseUrl = ref(localStorage.getItem('firecrawl_base_url') || '')
    const error = ref('')
    const success = ref(false)

    // Afficher automatiquement si aucune clé n'est configurée
    onMounted(() => {
      if (!apiKey.value) {
        error.value = 'Veuillez configurer votre clé API pour continuer'
      }
      // Récupérer l'URL de base au montage
      baseUrl.value = localStorage.getItem('firecrawl_base_url') || ''
    })

    const saveApiConfig = () => {
      try {
        if (!apiKey.value) {
          throw new Error('Veuillez entrer une clé API valide')
        }
        // Enregistrer la clé API
        localStorage.setItem('firecrawl_api_key', apiKey.value)
        // Enregistrer l'URL de base (même si vide, pour écraser une ancienne valeur si nécessaire)
        localStorage.setItem('firecrawl_base_url', baseUrl.value)

        success.value = true
        error.value = ''
        setTimeout(() => success.value = false, 3000)

        // Optionnel: Recharger la page ou reconfigurer l'instance API pour prise en compte immédiate
        window.location.reload();
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Erreur inconnue'
        success.value = false
      }
    }

    return {
      apiKey,
      baseUrl,
      error,
      success,
      saveApiConfig
    }
  }
})
</script>

<style scoped>
.api-key-input {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  background-color: #0066cc;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error-message {
  color: #cc0000;
  margin-top: 10px;
}

.success-message {
  color: #00aa00;
  margin-top: 10px;
}

small {
  display: block;
  margin-top: 5px;
  font-size: 0.8em;
  color: #666;
}
</style>
