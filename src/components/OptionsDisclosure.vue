<script setup lang="ts">
/**
 * OptionsDisclosure.vue
 *
 * Glass card grouping related form fields under a header. When `collapsible`
 * (the default) the header is a button that shows or hides the body, with an
 * animated chevron, `aria-expanded` and `aria-controls`; otherwise the header
 * is a plain title and the body is always shown.
 *
 * The markup stays a `<fieldset>` with a `<legend>` so the fields keep their
 * group name for assistive technologies; the legend is floated so it renders
 * inside the card instead of straddling its border.
 *
 * Bind the folded state with `v-model:collapsed`. The default slot is the body;
 * the optional `hint` slot renders a short note at the top of the body.
 */
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Text of the header. */
    title: string;
    /** Whether the header folds and unfolds the body. */
    collapsible?: boolean;
  }>(),
  { collapsible: true },
);

/** Whether the body is hidden. Ignored when the card is not collapsible. */
const collapsed = defineModel<boolean>('collapsed', { default: false });

/** Id tying the toggle button to the body it controls. */
const bodyId = useId();

/** Whether the body is currently shown. */
const isOpen = computed<boolean>(() => !props.collapsible || !collapsed.value);

/**
 * Fold or unfold the body.
 */
function toggle(): void {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <fieldset
    class="disclosure"
    :class="{ 'disclosure--open': isOpen, 'disclosure--static': !collapsible }"
  >
    <legend class="disclosure__legend">
      <button
        v-if="collapsible"
        type="button"
        class="disclosure__toggle"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-controls="bodyId"
        @click="toggle"
      >
        <span class="disclosure__title">{{ title }}</span>
        <span class="disclosure__chevron" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" focusable="false">
            <path
              d="M3.5 6 8 10.5 12.5 6"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <span v-else class="disclosure__heading">
        <span class="disclosure__title">{{ title }}</span>
      </span>
    </legend>
    <div v-show="isOpen" :id="bodyId" class="disclosure__body">
      <p v-if="$slots.hint" class="disclosure__hint"><slot name="hint" /></p>
      <slot />
    </div>
  </fieldset>
</template>

<style scoped>
/*
 * Card surface, same glass recipe as the panels it sits in. Forms laid out
 * with a flex gap set --disclosure-gap to 0.
 */
.disclosure {
  min-width: 0;
  margin: 0 0 var(--disclosure-gap, 1.25rem);
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  background: var(--glass-fill);
  box-shadow: var(--box-shadow-card);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.disclosure:hover {
  border-color: var(--color-border-hover);
}

/* Open state: brand-tinted edge so an unfolded group reads at a glance. */
.disclosure--open:not(.disclosure--static) {
  border-color: var(--control-accent-border);
}

/*
 * Floated legend: it leaves the border and becomes the first row inside the
 * card, so the header always sits within the surface.
 */
.disclosure__legend {
  float: left;
  width: 100%;
  padding: 0;
  margin: 0;
}

/* Clickable header row. Overrides the primary button look set on form buttons. */
.disclosure .disclosure__toggle,
.disclosure .disclosure__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  margin: 0;
  padding: 0.85rem 1.1rem;
  border: 0;
  border-radius: calc(var(--radius-md) - 1px);
  background: transparent;
  box-shadow: none;
  transform: none;
  color: var(--color-heading);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
}

.disclosure .disclosure__toggle {
  cursor: pointer;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.disclosure .disclosure__toggle:hover,
.disclosure .disclosure__toggle:active {
  background: var(--color-background-mute);
  box-shadow: none;
  transform: none;
  color: var(--color-heading);
}

.disclosure .disclosure__toggle:focus-visible {
  outline: 2px solid var(--violet-400);
  outline-offset: -2px;
}

/* Divider under the header once the body is visible. */
.disclosure--open .disclosure__toggle,
.disclosure--open .disclosure__heading {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.disclosure--open .disclosure__legend {
  border-bottom: 1px solid var(--color-border);
}

.disclosure--open .disclosure__toggle .disclosure__title {
  color: var(--control-accent);
}

/* Round chevron badge; turns half a circle when the group opens. */
.disclosure__chevron {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-background-soft);
  color: var(--color-text-soft);
  transition:
    transform var(--transition),
    color var(--transition-fast),
    border-color var(--transition-fast),
    background var(--transition-fast);
}

.disclosure__toggle:hover .disclosure__chevron {
  border-color: var(--color-border-hover);
  color: var(--color-heading);
}

.disclosure--open .disclosure__chevron {
  transform: rotate(180deg);
  border-color: var(--control-accent-border);
  background: var(--brand-soft);
  color: var(--control-accent);
}

/* Body starts below the floated header row. */
.disclosure__body {
  clear: both;
  padding: 1rem 1.1rem 0.1rem;
}

.disclosure__hint {
  margin: 0 0 1rem;
  color: var(--color-text-soft);
  font-size: 0.85rem;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .disclosure,
  .disclosure .disclosure__toggle,
  .disclosure__chevron {
    transition: none;
  }
}
</style>
