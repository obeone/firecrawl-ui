<template>
  <component :is="currentComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import MapViewV1 from './map/MapViewV1.vue';
import MapViewV2 from './map/MapViewV2.vue';
import { useApiVersion } from '@/stores/apiVersion.js';

/**
 * Wrapper component switching the map interface according to the configured API version.
 */
export default defineComponent({
  name: 'MapView',
  components: {
    MapViewV1,
    MapViewV2,
  },
  setup() {
    const { apiVersion } = useApiVersion();
    const currentComponent = computed(() => (apiVersion.value === 'v2' ? MapViewV2 : MapViewV1));

    return {
      currentComponent,
    };
  },
});
</script>
