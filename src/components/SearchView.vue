<template>
  <SearchViewV2 v-if="isV2" />
  <SearchViewV1 v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApiVersion } from '@/config/apiVersion';
import SearchViewV1 from './SearchViewV1.vue';
import SearchViewV2 from './SearchViewV2.vue';

const { apiVersion } = useApiVersion();

/**
 * Indicates whether the v2 search workflow should be active.
 *
 * @returns {boolean} True when the v2 API is selected.
 */
const isV2 = computed<boolean>(() => apiVersion.value === 'v2');
</script>
