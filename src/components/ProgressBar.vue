<template>
  <div class="progress-container">
    <div class="progress" :style="{ width: percent + '%' }"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, required: true }
})

const percent = computed(() => Math.min(100, Math.max(0, props.value)))
</script>

<style scoped>
.progress-container {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}
.progress {
  height: 100%;
  background: #42b883;
  transition: width 0.3s ease;
}
</style>
