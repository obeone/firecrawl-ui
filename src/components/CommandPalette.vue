<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { navItems, type NavItem } from '@/config/navigation';

/**
 * CommandPalette — a ⌘K / Ctrl+K quick navigator.
 *
 * Renders a centered overlay with a fuzzy-filtered list of destinations and
 * full keyboard control (arrow keys to move, Enter to go, Esc to close). The
 * open state is owned by the parent via `v-model:open`.
 */

const props = defineProps<{
  /** Whether the palette overlay is visible. */
  open: boolean;
}>();

const emit = defineEmits<{
  /** Emitted to update the open state (supports `v-model:open`). */
  (e: 'update:open', value: boolean): void;
}>();

const router = useRouter();

/** Current search query typed by the user. */
const query = ref('');
/** Index of the highlighted result in the filtered list. */
const activeIndex = ref(0);
/** Reference to the search input for autofocus on open. */
const inputRef = ref<HTMLInputElement | null>(null);

/**
 * Filters the navigation entries against the query. Matches on label,
 * description and keywords; an empty query returns everything.
 */
const results = computed<NavItem[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return navItems;
  return navItems.filter((item) => {
    const haystack = [item.label, item.description, ...item.keywords].join(' ').toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
});

// Keep the highlight within bounds whenever the result set changes.
watch(results, () => {
  activeIndex.value = 0;
});

// Reset and focus the input each time the palette opens.
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      query.value = '';
      activeIndex.value = 0;
      nextTick(() => inputRef.value?.focus());
    }
  },
);

/**
 * Closes the palette.
 */
function close(): void {
  emit('update:open', false);
}

/**
 * Navigates to the given destination and closes the palette.
 *
 * @param item - The navigation entry to open.
 */
function go(item: NavItem | undefined): void {
  if (!item) return;
  router.push(item.to);
  close();
}

/**
 * Moves the highlight by `delta`, wrapping around the result list.
 *
 * @param delta - Direction to move (+1 down, -1 up).
 */
function move(delta: number): void {
  const count = results.value.length;
  if (count === 0) return;
  activeIndex.value = (activeIndex.value + delta + count) % count;
}

/**
 * Handles keyboard interaction inside the palette.
 *
 * @param event - The originating keyboard event.
 */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    move(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    move(-1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    go(results.value[activeIndex.value]);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}
</script>

<template>
  <Transition name="palette">
    <div v-if="open" class="palette-overlay" @click.self="close" @keydown="onKeydown">
      <div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="palette-search">
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref="inputRef"
            v-model="query"
            type="text"
            class="palette-input"
            placeholder="Search pages and actions…"
            autocomplete="off"
            spellcheck="false"
            @keydown="onKeydown"
          />
          <kbd class="palette-hint">Esc</kbd>
        </div>

        <ul v-if="results.length" class="palette-list">
          <li
            v-for="(item, index) in results"
            :key="item.to"
            class="palette-item"
            :class="{ active: index === activeIndex }"
            @mouseenter="activeIndex = index"
            @click="go(item)"
          >
            <span class="palette-item-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path v-for="(d, i) in item.paths" :key="i" :d="d" />
              </svg>
            </span>
            <span class="palette-item-text">
              <span class="palette-item-label">{{ item.label }}</span>
              <span class="palette-item-desc">{{ item.description }}</span>
            </span>
            <span class="palette-item-enter" aria-hidden="true">↵</span>
          </li>
        </ul>

        <div v-else class="palette-empty">No matches for "{{ query }}"</div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Full-screen dimmed, blurred backdrop. */
.palette-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 12vh 1rem 1rem;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
}

/* The floating command surface. */
.palette {
  width: min(580px, 100%);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--box-shadow-container);
  overflow: hidden;
}

/* Search row. */
.palette-search {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.search-icon {
  flex-shrink: 0;
  fill: none;
  stroke: var(--color-text-mute);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.palette-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0;
  font-size: 1.05rem;
  color: var(--color-heading);
}

.palette-input:focus {
  outline: none;
  box-shadow: none;
}

.palette-hint {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-mute);
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.4rem;
}

/* Results. */
.palette-list {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  max-height: 52vh;
  overflow-y: auto;
}

.palette-item {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.7rem;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.palette-item.active {
  background: var(--brand-soft);
}

.palette-item-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--color-background-mute);
  color: var(--color-text-soft);
}

.palette-item.active .palette-item-icon {
  background: var(--gradient-fire);
  color: #fff;
}

.palette-item-icon svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.palette-item-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.palette-item-label {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 0.95rem;
}

.palette-item-desc {
  font-size: 0.82rem;
  color: var(--color-text-mute);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette-item-enter {
  margin-left: auto;
  font-size: 0.9rem;
  color: var(--brand-strong);
  opacity: 0;
}

.palette-item.active .palette-item-enter {
  opacity: 1;
}

.palette-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-mute);
  font-size: 0.95rem;
}

/* Open/close transition. */
.palette-enter-active,
.palette-leave-active {
  transition: opacity var(--transition-fast);
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-active .palette,
.palette-leave-active .palette {
  transition: transform var(--transition);
}

.palette-enter-from .palette,
.palette-leave-to .palette {
  transform: translateY(-12px) scale(0.98);
}
</style>
