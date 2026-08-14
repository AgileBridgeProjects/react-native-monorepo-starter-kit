import type { WorkspaceClubSummary } from '@features/workspace/domain/types/workspace-club-summary';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WorkspaceState {
  clubId: string | null;
  clubName: string | null;
  clubLogoUrl: string | null;
  teamId: string | null;
  teamName: string | null;
}

export interface WorkspaceActions {
  /** Set just the club — team not yet chosen. */
  setClub: (club: WorkspaceClubSummary) => void;
  setWorkspace: (club: WorkspaceClubSummary, team: { id: string; name: string }) => void;
  clearWorkspace: () => void;
}

type WorkspaceStore = WorkspaceState & WorkspaceActions;

// ─── Store ───────────────────────────────────────────────────────────────────

/**
 * Global workspace context for the admin portal.
 *
 * SuperAdmins select a Club + Team pair here; all club-scoped pages
 * read from this store rather than maintaining their own per-page filter dropdowns.
 *
 * Persisted to `sessionStorage` so the selection survives navigation but is
 * automatically cleared when the browser tab is closed. Each tab is isolated —
 * two tabs can impersonate different clubs simultaneously.
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      clubId: null,
      clubName: null,
      clubLogoUrl: null,
      teamId: null,
      teamName: null,

      setClub: (club) =>
        set({
          clubId: club.id,
          clubName: club.name,
          clubLogoUrl: club.logoUrl,
          teamId: null,
          teamName: null,
        }),

      setWorkspace: (club, team) =>
        set({
          clubId: club.id,
          clubName: club.name,
          clubLogoUrl: club.logoUrl,
          teamId: team.id,
          teamName: team.name,
        }),

      clearWorkspace: () =>
        set({
          clubId: null,
          clubName: null,
          clubLogoUrl: null,
          teamId: null,
          teamName: null,
        }),
    }),
    {
      name: 'starterkit-workspace',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
