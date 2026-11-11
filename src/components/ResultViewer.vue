<script setup lang="ts">
/**
 * ResultViewer.vue
 *
 * Shows one tab of a scraped document: raw markdown, HTML or links as text,
 * the screenshot as an image, and the metadata or the whole document as JSON.
 * Every text is rendered escaped through CodeBlock; nothing is injected as
 * HTML. Tab selection is left to the parent (see `buildDocumentTabs`), and an
 * unknown tab falls back to the JSON view.
 */
import { computed } from 'vue';
import CodeBlock from '@/components/playground/CodeBlock.vue';
import {
  getDocumentHtml,
  getDocumentLinks,
  getDocumentMarkdown,
  getDocumentMetadata,
  getDocumentScreenshot,
  type ScrapedDocument,
} from '@/utils/resultDocument';

const props = defineProps<{
  /** The scraped document, or null when there is none. */
  doc: ScrapedDocument | null;
  /** Key of the tab to show: markdown, html, links, screenshot, metadata or json. */
  tab: string;
  /** Value shown in the JSON tab; defaults to the document itself. */
  json?: unknown;
}>();

/** Value pretty-printed by the JSON tab. */
const jsonValue = computed<unknown>(() => (props.json !== undefined ? props.json : props.doc));
</script>

<template>
  <CodeBlock v-if="tab === 'markdown'" :content="getDocumentMarkdown(doc)" label="Markdown" />
  <CodeBlock v-else-if="tab === 'html'" :content="getDocumentHtml(doc)" label="HTML" />
  <CodeBlock v-else-if="tab === 'links'" :content="getDocumentLinks(doc)" label="Links" />
  <div v-else-if="tab === 'screenshot'" class="screenshot-pane">
    <img :src="getDocumentScreenshot(doc)" alt="Page screenshot" />
  </div>
  <CodeBlock v-else-if="tab === 'metadata'" :json="getDocumentMetadata(doc)" label="Metadata" />
  <CodeBlock v-else :json="jsonValue" label="JSON" />
</template>

<style scoped>
.screenshot-pane {
  height: 100%;
  overflow: auto;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  /* Glass fill keeps the aurora visible behind the screenshot. */
  background: var(--glass-fill);
}

.screenshot-pane img {
  max-width: 100%;
  height: auto;
  /* Glass-bordered image frame matches the panel language. */
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
}
</style>
