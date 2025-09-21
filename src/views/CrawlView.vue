<template>
  <CrawlViewV2 v-if="isV2" />
  <CrawlViewV1 v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApiVersion } from '@/config/apiVersion';
import CrawlViewV1 from './CrawlViewV1.vue';
import CrawlViewV2 from './CrawlViewV2.vue';

const { apiVersion } = useApiVersion();

/**
 * Determines whether the v2 API is selected.
 *
 * @returns {boolean} True when the v2 API is active.
 */
const isV2 = computed<boolean>(() => apiVersion.value === 'v2');
</script>
