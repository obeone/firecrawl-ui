<template>
  <div class="spinner"></div>
</template>

<script setup lang="ts">
/**
 * LoadingSpinner Component
 *
 * Displays an animated spinner to indicate a loading state.
 */
</script>

<style scoped>
.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #0066cc;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
