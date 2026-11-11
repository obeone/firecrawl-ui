<script setup lang="ts">
/**
 * ChipMultiSelect.vue
 *
 * Multi-choice field rendered as a row of toggle chips. Each chip is a native
 * checkbox (visually hidden, still focusable and announced) wrapped in its
 * label, so keyboard, screen readers and form semantics come from the browser.
 * The group is a `<fieldset>` named by its `<legend>`.
 *
 * Bound with `v-model` to the array of selected values. The emitted array
 * follows the order of `options`; selected values missing from `options` are
 * kept at the end so nothing set elsewhere is silently dropped.
 */
import { useId } from 'vue';

/** One selectable chip. */
export interface ChipOption {
  /** Value stored in the model when the chip is on. */
  value: string;
  /** Text shown on the chip. */
  label: string;
}

const props = defineProps<{
  /** Name of the group, shown above the chips. */
  legend: string;
  /** Selectable entries, in display order. */
  options: readonly ChipOption[];
  /** Optional help text shown under the chips. */
  hint?: string;
}>();

/** Selected values. */
const selected = defineModel<string[]>({ required: true });

/** Id prefix for the hint, referenced by `aria-describedby`. */
const groupId = useId();

/**
 * Whether a value is currently selected.
 *
 * @param value - The option value to look up.
 * @returns `true` when the value is in the model.
 */
function isSelected(value: string): boolean {
  return selected.value.includes(value);
}

/**
 * Turn one option on or off and emit the new selection.
 *
 * @param value - The option value that changed.
 * @param on - Its new state.
 */
function setOption(value: string, on: boolean): void {
  const next = new Set(selected.value);
  if (on) {
    next.add(value);
  } else {
    next.delete(value);
  }
  const known = props.options.map((option) => option.value);
  const ordered = known.filter((v) => next.has(v));
  const extra = selected.value.filter((v) => next.has(v) && !known.includes(v));
  selected.value = [...ordered, ...extra];
}

/**
 * Change handler of a chip checkbox.
 *
 * @param value - The option value bound to the checkbox.
 * @param event - The native change event.
 */
function onChange(value: string, event: Event): void {
  setOption(value, (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <fieldset class="chips" :aria-describedby="hint ? `${groupId}-hint` : undefined">
    <legend class="chips__legend">{{ legend }}</legend>
    <div class="chips__list">
      <label v-for="option in options" :key="option.value" class="chips__option">
        <input
          class="chips__input"
          type="checkbox"
          :value="option.value"
          :checked="isSelected(option.value)"
          @change="onChange(option.value, $event)"
        />
        <span class="chips__face">
          <svg
            class="chips__icon"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            focusable="false"
          >
            <path
              v-if="isSelected(option.value)"
              d="M3.5 8.5 6.5 11.5 12.5 4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              v-else
              d="M8 3.5v9M3.5 8h9"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          {{ option.label }}
        </span>
      </label>
    </div>
    <small v-if="hint" :id="`${groupId}-hint`" class="chips__hint">{{ hint }}</small>
  </fieldset>
</template>

<style scoped>
.chips {
  min-width: 0;
  margin: 0 0 1.2rem;
  padding: 0;
  border: 0;
}

/* Same look as the field labels of the config forms. */
.chips__legend {
  padding: 0;
  margin-bottom: 0.55rem;
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 500;
}

.chips__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Wrapper label; neutralizes the block label style of the config forms. */
.chips .chips__option {
  position: relative;
  display: inline-flex;
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
}

/* Native checkbox kept for semantics and keyboard, hidden from view. */
.chips .chips__input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.chips__face {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.42rem 0.85rem 0.42rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-background-soft);
  color: var(--color-text);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.chips__icon {
  flex: none;
  color: var(--color-text-soft);
}

.chips__option:hover .chips__face {
  border-color: var(--color-border-hover);
  background: var(--color-background-mute);
  color: var(--color-heading);
}

.chips__input:checked + .chips__face {
  border-color: var(--control-accent-border);
  background: var(--brand-soft);
  color: var(--control-accent);
}

.chips__input:checked + .chips__face .chips__icon {
  color: var(--control-accent);
}

.chips__input:focus-visible + .chips__face {
  outline: 2px solid var(--violet-400);
  outline-offset: 2px;
}

.chips__hint {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-text-soft);
  font-size: 0.85rem;
}

@media (prefers-reduced-motion: reduce) {
  .chips__face {
    transition: none;
  }
}
</style>
