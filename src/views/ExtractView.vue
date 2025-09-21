<template>
  <component :is="currentComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import ExtractViewV1 from './extract/ExtractViewV1.vue';
import ExtractViewV2 from './extract/ExtractViewV2.vue';
import { useApiVersion } from '@/stores/apiVersion.js';

/**
 * Wrapper view that selects the extraction workflow matching the active API version.
 */
export default defineComponent({
  name: 'ExtractView',
  components: {
    ExtractViewV1,
    ExtractViewV2,
  },
  setup() {
    const { apiVersion } = useApiVersion();
    const currentComponent = computed(() =>
      apiVersion.value === 'v2' ? ExtractViewV2 : ExtractViewV1,
    );

    return {
      currentComponent,
    };
  },
});
</script>
