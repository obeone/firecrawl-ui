// @vitest-environment jsdom
import { createApp, h, nextTick, ref, type App, type VNodeChild } from 'vue';
import { afterEach, describe, expect, it } from 'vitest';
import OptionsDisclosure from './OptionsDisclosure.vue';

/** Apps mounted by the current test, unmounted after it. */
const mounted: App[] = [];

afterEach(() => {
  mounted.splice(0).forEach((app) => app.unmount());
  document.body.innerHTML = '';
});

/**
 * Mount a render function in a fresh app attached to the document.
 *
 * @param render - Render function of the test app.
 * @returns The mount point.
 */
function mountRender(render: () => VNodeChild): HTMLElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const app = createApp({ render });
  app.mount(root);
  mounted.push(app);
  return root;
}

/**
 * Mount an OptionsDisclosure bound to a reactive `collapsed` flag.
 *
 * @param props - Extra props for the component.
 * @param initial - Initial folded state.
 * @returns The root element and the bound state.
 */
function mount(props: Record<string, unknown> = {}, initial = true) {
  const collapsed = ref(initial);
  const root = mountRender(() =>
    h(
      OptionsDisclosure,
      {
        title: 'Scrape Options',
        collapsed: collapsed.value,
        'onUpdate:collapsed': (value: boolean) => {
          collapsed.value = value;
        },
        ...props,
      },
      {
        default: () => h('input', { id: 'inner', type: 'text' }),
        hint: () => 'Some hint',
      },
    ),
  );
  return { root, collapsed };
}

/**
 * Return the body element of the disclosure.
 *
 * @param root - The mount point.
 * @returns The body element.
 */
function body(root: HTMLElement): HTMLElement {
  return root.querySelector('.disclosure__body') as HTMLElement;
}

describe('OptionsDisclosure', () => {
  it('renders a fieldset named by its legend, with the header inside the legend', () => {
    const { root } = mount();
    const legend = root.querySelector('fieldset > legend');
    expect(legend?.textContent).toContain('Scrape Options');
    expect(legend?.querySelector('button')).not.toBeNull();
  });

  it('starts folded and wires aria-expanded / aria-controls', () => {
    const { root } = mount();
    const button = root.querySelector('button') as HTMLButtonElement;
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(body(root).id);
    expect(body(root).id).not.toBe('');
    expect(body(root).style.display).toBe('none');
  });

  it('toggles on click and emits the new folded state', async () => {
    const { root, collapsed } = mount();
    const button = root.querySelector('button') as HTMLButtonElement;
    button.click();
    await nextTick();
    expect(collapsed.value).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(body(root).style.display).toBe('');
    expect(root.querySelector('fieldset')?.classList.contains('disclosure--open')).toBe(true);
    button.click();
    await nextTick();
    expect(collapsed.value).toBe(true);
    expect(body(root).style.display).toBe('none');
  });

  it('keeps folded content in the DOM so form state survives', () => {
    const { root } = mount();
    expect(root.querySelector('#inner')).not.toBeNull();
    expect(root.querySelector('.disclosure__hint')?.textContent).toBe('Some hint');
  });

  it('renders a plain, always open header when not collapsible', () => {
    const { root } = mount({ collapsible: false });
    expect(root.querySelector('button')).toBeNull();
    expect(root.querySelector('legend')?.textContent).toContain('Scrape Options');
    expect(body(root).style.display).toBe('');
  });

  it('gives each instance of one app its own body id', () => {
    const root = mountRender(() => [
      h(OptionsDisclosure, { title: 'A' }),
      h(OptionsDisclosure, { title: 'B' }),
    ]);
    const ids = Array.from(root.querySelectorAll('.disclosure__body'), (el) => el.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
