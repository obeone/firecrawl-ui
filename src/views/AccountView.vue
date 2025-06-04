<template>
  <div class="account-view">
    <h1>Credit Usage</h1>
    <router-link to="/account/history">View History</router-link>
    <div class="info" v-if="credits !== null">
      <p>You have {{ credits }} credits remaining.</p>
    </div>
    <div v-if="error" class="error">{{ error }}</div>
    <button @click="fetchCredits" :disabled="loading">
      {{ loading ? 'Loading...' : 'Refresh' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import type { BillingApi } from '@/api-client'
import { useHistory } from '@/composables/useHistory'

const api = inject('api') as { billing: BillingApi }
const { add } = useHistory('account')

const credits = ref<number | null>(null)
const loading = ref(false)
const error = ref('')

async function fetchCredits() {
  try {
    loading.value = true
    error.value = ''
    const { data } = await api.billing.getCreditUsage()
    credits.value = data.remainingCredits
    add({ id: Date.now().toString(), type: 'account', status: 'completed', createdAt: Date.now(), result: data })
  } catch (e: any) {
    error.value = e.message || 'Error'
  } finally {
    loading.value = false
  }
}

fetchCredits()
</script>

<style scoped>
.account-view {
  max-width: 600px;
  margin: 0 auto;
}
.error {
  color: red;
  margin-top: 1rem;
}
button {
  margin-top: 1rem;
}
</style>
