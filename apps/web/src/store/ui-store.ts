import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UiState {
  /** Desktop sidebar collapsed into an icon-only rail. */
  sidebarCollapsed: boolean;
}

export interface UiActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

type UiStore = UiState & UiActions;

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Persistent UI preferences for the admin portal.
 *
 * Persisted to `localStorage` so the choice survives reloads and tab restarts —
 * unlike the workspace store (sessionStorage), which is intentionally per-tab.
 */
export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'starterkit-ui',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
