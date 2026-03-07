<template>
  <ExtractViewV2 v-if="isV2" />
  <ExtractViewV1 v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useApiVersion } from '@/config/apiVersion';
import ExtractViewV1 from './ExtractViewV1.vue';
import ExtractViewV2 from './ExtractViewV2.vue';

const { apiVersion } = useApiVersion();

/**
 * Indicates whether the v2 extraction workflow should be displayed.
 *
 * @returns {boolean} True when the v2 API is active.
 */
const isV2 = computed<boolean>(() => apiVersion.value === 'v2');
</script>
