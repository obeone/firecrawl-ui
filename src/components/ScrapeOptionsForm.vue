<script setup lang="ts" generic="T extends ScrapeOptionsFormValue">
/**
 * ScrapeOptionsForm.vue
 *
 * Form fields shared by the views that send scrape options: the output formats
 * select, the "only main content" toggle and the include/exclude tag filters.
 * Bound with `v-model` to a {@link ScrapeOptionsFormValue}; a wider object is
 * accepted and its extra fields are passed through unchanged.
 *
 * The fields render without a wrapper element so they lay out exactly like
 * the parent's own fields. `part` renders only the formats select or only the
 * filters, for views that place them in different sections. The default slot
 * renders right after the "only main content" toggle, for view-specific
 * toggles.
 */
import { computed, type WritableComputedRef } from 'vue';
import {
  withFormField,
  type FormatOption,
  type ScrapeOptionsFormValue,
} from '@/utils/scrapeOptions';

const props = withDefaults(
  defineProps<{
    /** The edited options. */
    modelValue: T;
    /** Entries of the output formats select. */
    formatOptions: readonly FormatOption[];
    /** Which fields to render: everything, only the formats or only the filters. */
    part?: 'all' | 'formats' | 'filters';
    /** Render the include/exclude tag inputs. */
    showTags?: boolean;
  }>(),
  { part: 'all', showTags: true },
);

const emit = defineEmits<{
  /** Emitted with a new options object whenever a field changes. */
  'update:modelValue': [value: T];
}>();

/**
 * Two-way binding to one field of the model, emitting a new object on change.
 *
 * @param key - The field to bind.
 * @returns A writable computed usable with `v-model`.
 */
function bindField<K extends keyof ScrapeOptionsFormValue>(key: K): WritableComputedRef<T[K]> {
  return computed<T[K]>({
    get: () => props.modelValue[key],
    set: (value) => emit('update:modelValue', withFormField(props.modelValue, key, value)),
  });
}

/** Selected output formats. */
const formats = bindField('formats');
/** "Only main content" toggle. */
const onlyMainContent = bindField('onlyMainContent');
/** Include tags filter text. */
const includeTags = bindField('includeTags');
/** Exclude tags filter text. */
const excludeTags = bindField('excludeTags');

/** Whether the formats select is rendered. */
const showFormats = computed<boolean>(() => props.part !== 'filters');
/** Whether the content filters are rendered. */
const showFilters = computed<boolean>(() => props.part !== 'formats');
</script>

<template>
  <div v-if="showFormats" class="form-group">
    <label for="formats">Output Formats:</label>
    <select id="formats" v-model="formats" multiple>
      <option v-for="option in formatOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <small>Select one or more formats.</small>
  </div>
  <template v-if="showFilters">
    <label class="checkbox-label">
      <input v-model="onlyMainContent" type="checkbox" />
      Only Main Content (exclude headers, footers, etc.)
    </label>
    <slot />
    <template v-if="showTags">
      <div class="form-group">
        <label for="includeTags">Include Tags (CSS Selectors):</label>
        <input
          id="includeTags"
          v-model="includeTags"
          type="text"
          placeholder="article, .main-content"
        />
        <small
          >Comma-separated CSS selectors. Only content within these tags will be included.</small
        >
      </div>
      <div class="form-group">
        <label for="excludeTags">Exclude Tags (CSS Selectors):</label>
        <input id="excludeTags" v-model="excludeTags" type="text" placeholder="footer, .sidebar" />
        <small>Comma-separated CSS selectors to exclude content within these tags.</small>
      </div>
    </template>
  </template>
</template>
