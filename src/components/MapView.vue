<template>
  <MapViewV2 v-if="isV2" />
  <MapViewV1 v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApiVersion } from '@/config/apiVersion';
import MapViewV1 from './MapViewV1.vue';
import MapViewV2 from './MapViewV2.vue';

const { apiVersion } = useApiVersion();

/**
 * Determines whether the v2 sitemap interface should be shown.
 *
 * @returns {boolean} True when the v2 API is active.
 */
const isV2 = computed<boolean>(() => apiVersion.value === 'v2');
</script>
