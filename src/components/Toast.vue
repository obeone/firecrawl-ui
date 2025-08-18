<template>
  <div :class="['toast', type]" role="alert">
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

/**
 * Toast Component
 *
 * Displays a temporary notification message.
 *
 * @param message - Text to display in the toast.
 * @param type - Either 'success' or 'error', determines styling.
 * @param duration - Duration in milliseconds before the toast dismisses itself.
 * Emits a `dismiss` event when the toast should be removed.
 */
interface Props {
  message: string;
  type: 'success' | 'error';
  duration?: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (e: 'dismiss'): void }>();

onMounted(() => {
  setTimeout(() => {
    emit('dismiss');
  }, props.duration ?? 3000);
});
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  padding: 0.75rem 1rem;
  color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.toast.success {
  background-color: #28a745;
}

.toast.error {
  background-color: #dc3545;
}
</style>
