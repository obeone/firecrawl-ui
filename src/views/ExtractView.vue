<template>
  <component :is="activeComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useApiVersion } from '@/stores/apiVersion';
import ExtractViewV1 from './ExtractViewV1.vue';
import ExtractViewV2 from './ExtractViewV2.vue';

/**
 * Wrapper component selecting the extraction view matching the configured API version.
 */
export default defineComponent({
  name: 'ExtractView',
  components: {
    ExtractViewV1,
    ExtractViewV2,
  },
  setup() {
    const apiVersion = useApiVersion();
    const activeComponent = computed(() =>
      apiVersion.value === 'v2' ? ExtractViewV2 : ExtractViewV1,
    );

    return { activeComponent };
  },
});
</script>
