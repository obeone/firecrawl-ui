<template>
  <div class="api-config-view">
    <h1>Configuration de l'API</h1>
    <p>Une clé API valide est requise pour utiliser Firecrawl.</p>
    <ApiKeyInput />
    <div class="actions">
      <button @click="handleContinue" class="primary">
        Continuer vers l'application
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import ApiKeyInput from '@/components/ApiKeyInput.vue'

export default defineComponent({
  name: 'ApiConfigView',
  components: {
    ApiKeyInput
  },
  setup() {
    const router = useRouter()

    const handleContinue = () => {
      router.push({ name: 'home' })
    }

    return {
      handleContinue
    }
  }
})
</script>

<style scoped>
.api-config-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.actions {
  margin-top: 2rem;
}

.primary {
  background-color: #0066cc;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.primary:hover {
  background-color: #0052a3;
}
</style>
