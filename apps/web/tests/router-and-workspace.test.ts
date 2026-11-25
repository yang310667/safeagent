import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAppRouter } from '@/router';
import WorkspaceView from '@/views/WorkspaceView.vue';

describe('Router Navigation & Workspace Interaction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('navigates across all defined application routes using Hash History', async () => {
    const router = createAppRouter();
    const expectedPaths = [
      '/',
      '/workspace',
      '/risk-matrix',
      '/knowledge',
      '/accident-cases',
      '/learning-log',
      '/evaluation',
      '/future-research',
      '/about',
    ];

    for (const path of expectedPaths) {
      await router.push(path);
      await router.isReady();
      expect(router.currentRoute.value.path).toBe(path);
      expect(router.currentRoute.value.meta.title).toBeTruthy();
    }
  });

  it('fills workspace input when clicking a preset scenario and keeps submit disabled', async () => {
    const wrapper = mount(WorkspaceView);

    const submitBtn = wrapper.get('[data-testid="submit-workspace-btn"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();

    const scenarioBtn = wrapper.get('[data-testid="scenario-btn-exhaust-fan-maintenance"]');
    await scenarioBtn.trigger('click');

    const textarea = wrapper.get('[data-testid="workspace-input"]');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('廠區頂樓');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('排氣風車');

    const clearBtn = wrapper.get('[data-testid="clear-workspace-btn"]');
    await clearBtn.trigger('click');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });
});
