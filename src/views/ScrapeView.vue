<template>
  <component :is="activeComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useApiVersion } from '@/stores/apiVersion';
import ScrapeViewV1 from './ScrapeViewV1.vue';
import ScrapeViewV2 from './ScrapeViewV2.vue';

/**
 * Wrapper component selecting the appropriate scrape view based on the active API version.
 */
export default defineComponent({
  name: 'ScrapeView',
  components: {
    ScrapeViewV1,
    ScrapeViewV2,
  },
  setup() {
    const apiVersion = useApiVersion();
    const activeComponent = computed(() =>
      apiVersion.value === 'v2' ? ScrapeViewV2 : ScrapeViewV1,
    );

    return { activeComponent };
  },
});
</script>
