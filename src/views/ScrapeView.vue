<template>
  <ScrapeViewV2 v-if="isV2" />
  <ScrapeViewV1 v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApiVersion } from '@/config/apiVersion';
import ScrapeViewV1 from './ScrapeViewV1.vue';
import ScrapeViewV2 from './ScrapeViewV2.vue';

const { apiVersion } = useApiVersion();

/**
 * Indicates whether the v2 API is active.
 *
 * @returns {boolean} True when the selected API version is v2.
 */
const isV2 = computed<boolean>(() => apiVersion.value === 'v2');
</script>
