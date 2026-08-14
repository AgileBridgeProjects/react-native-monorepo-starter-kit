import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../ui-store';

describe('useUiStore', () => {
  // Zustand stores are singletons — reset to the initial state before each test
  // so cases stay isolated from one another.
  beforeEach(() => {
    useUiStore.setState({ sidebarCollapsed: false });
    localStorage.clear();
  });

  it('defaults to an expanded sidebar', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBeFalsy();
  });

  it('toggleSidebar flips the collapsed flag', () => {
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBeTruthy();

    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBeFalsy();
  });

  it('setSidebarCollapsed sets the flag explicitly', () => {
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBeTruthy();

    useUiStore.getState().setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBeFalsy();
  });

  it('persists the collapsed preference to localStorage under the starterkit-ui key', () => {
    useUiStore.getState().setSidebarCollapsed(true);

    const persisted = localStorage.getItem('starterkit-ui');
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted as string).state.sidebarCollapsed).toBeTruthy();
  });
});
