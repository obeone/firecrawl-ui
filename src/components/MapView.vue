<template>
  <component :is="activeComponent" />
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { useApiVersion } from '@/stores/apiVersion';
import MapViewV1 from './MapViewV1.vue';
import MapViewV2 from './MapViewV2.vue';

/**
 * Wrapper component selecting the map view matching the configured API version.
 */
export default defineComponent({
  name: 'MapView',
  components: {
    MapViewV1,
    MapViewV2,
  },
  setup() {
    const apiVersion = useApiVersion();
    const activeComponent = computed(() => (apiVersion.value === 'v2' ? MapViewV2 : MapViewV1));

    return { activeComponent };
  },
});
</script>
