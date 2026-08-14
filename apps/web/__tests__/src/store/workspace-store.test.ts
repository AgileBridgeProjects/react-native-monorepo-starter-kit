import type { WorkspaceClubSummary } from '@features/workspace/domain/types/workspace-club-summary';
import { useWorkspaceStore } from '@store/workspace-store';
import { beforeEach, describe, expect, it } from 'vitest';

const baseClub: WorkspaceClubSummary = {
  id: 'club-1',
  name: 'Acme Corp',
  logoUrl: null,
};

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      clubId: null,
      clubName: null,
      clubLogoUrl: null,
      teamId: null,
      teamName: null,
    });
  });

  it('starts with no workspace selected', () => {
    const state = useWorkspaceStore.getState();
    expect(state.clubId).toBeNull();
    expect(state.clubName).toBeNull();
    expect(state.clubLogoUrl).toBeNull();
    expect(state.teamId).toBeNull();
    expect(state.teamName).toBeNull();
  });

  it('setClub stores club and clears team', () => {
    useWorkspaceStore.getState().setClub({
      ...baseClub,
      logoUrl: 'https://cdn.example.com/logo.png',
    });

    const state = useWorkspaceStore.getState();
    expect(state.clubId).toBe('club-1');
    expect(state.clubName).toBe('Acme Corp');
    expect(state.clubLogoUrl).toBe('https://cdn.example.com/logo.png');
    expect(state.teamId).toBeNull();
    expect(state.teamName).toBeNull();
  });

  it('setWorkspace stores club and team', () => {
    useWorkspaceStore.getState().setWorkspace(baseClub, { id: 'dept-1', name: 'Engineering' });

    const state = useWorkspaceStore.getState();
    expect(state.clubId).toBe('club-1');
    expect(state.clubName).toBe('Acme Corp');
    expect(state.teamId).toBe('dept-1');
    expect(state.teamName).toBe('Engineering');
  });

  it('clearWorkspace resets all values to null', () => {
    useWorkspaceStore.getState().setWorkspace(baseClub, { id: 'dept-1', name: 'Engineering' });

    useWorkspaceStore.getState().clearWorkspace();

    const state = useWorkspaceStore.getState();
    expect(state.clubId).toBeNull();
    expect(state.clubName).toBeNull();
    expect(state.clubLogoUrl).toBeNull();
    expect(state.teamId).toBeNull();
    expect(state.teamName).toBeNull();
  });
});
