// @vitest-environment jsdom
import { createApp, h, nextTick, ref, type App } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import ChipMultiSelect from './ChipMultiSelect.vue';

/** Apps mounted by the current test, unmounted after it. */
const mounted: App[] = [];

afterEach(() => {
  mounted.splice(0).forEach((app) => app.unmount());
  document.body.innerHTML = '';
});

const OPTIONS = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
  { value: 'links', label: 'Links' },
];

/**
 * Mount a ChipMultiSelect bound to a reactive selection.
 *
 * @param initial - Initially selected values.
 * @param hint - Optional hint text.
 * @returns The root element and the bound selection.
 */
function mount(initial: string[], hint?: string) {
  const selected = ref<string[]>(initial);
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = createApp({
    render: () =>
      h(ChipMultiSelect, {
        legend: 'Output Formats',
        options: OPTIONS,
        hint,
        modelValue: selected.value,
        'onUpdate:modelValue': (value: string[]) => {
          selected.value = value;
        },
      }),
  });
  app.mount(root);
  mounted.push(app);
  return { root, selected };
}

/**
 * Return the checkbox of one chip.
 *
 * @param root - The mount point.
 * @param value - The option value.
 * @returns The checkbox input.
 */
function chip(root: HTMLElement, value: string): HTMLInputElement {
  return root.querySelector(`input[value="${value}"]`) as HTMLInputElement;
}

describe('ChipMultiSelect', () => {
  it('renders one labelled checkbox per option inside a named group', () => {
    const { root } = mount(['markdown']);
    expect(root.querySelector('fieldset > legend')?.textContent).toBe('Output Formats');
    const inputs = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(inputs).toHaveLength(3);
    expect(inputs[1].closest('label')?.textContent?.trim()).toBe('HTML');
    expect(chip(root, 'markdown').checked).toBe(true);
    expect(chip(root, 'html').checked).toBe(false);
  });

  it('adds a value when a chip is turned on, in option order', async () => {
    const { root, selected } = mount(['links']);
    chip(root, 'markdown').click();
    await nextTick();
    expect(selected.value).toEqual(['markdown', 'links']);
    expect(chip(root, 'markdown').checked).toBe(true);
  });

  it('removes a value when a chip is turned off', async () => {
    const { root, selected } = mount(['markdown', 'html']);
    chip(root, 'markdown').click();
    await nextTick();
    expect(selected.value).toEqual(['html']);
  });

  it('keeps selected values that are not among the options', async () => {
    const { root, selected } = mount(['custom', 'markdown']);
    chip(root, 'html').click();
    await nextTick();
    expect(selected.value).toEqual(['markdown', 'html', 'custom']);
  });

  it('describes the group with its hint', () => {
    const { root } = mount([], 'Select one or more formats.');
    const fieldset = root.querySelector('fieldset') as HTMLFieldSetElement;
    const hintId = fieldset.getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId as string)?.textContent).toBe(
      'Select one or more formats.',
    );
  });

  it('omits aria-describedby without a hint', () => {
    const { root } = mount([]);
    expect(root.querySelector('fieldset')?.hasAttribute('aria-describedby')).toBe(false);
  });
});
