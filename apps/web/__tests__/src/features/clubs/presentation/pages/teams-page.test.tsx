import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock variables ───────────────────────────────────────────────────

const mockDeleteTeam = vi.hoisted(() => vi.fn());
const mockReload = vi.hoisted(() => vi.fn());

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({ hasPermission: () => true }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: { toast: { durationMs: 3000, errorDurationMs: 5000 } },
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starterkit/shared')>();
  return { ...actual, iconSize: { xs: 16, sm: 20, md: 28, lg: 48 } };
});

vi.mock('@starterkit/icons', () => ({
  AddIcon: () => <svg data-testid="add-icon" />,
  ShareWithTeamsIcon: () => <svg data-testid="teams-icon" />,
}));

vi.mock('@features/clubs/presentation/hooks/use-delete-team', () => ({
  useDeleteTeam: () => ({ mutate: mockDeleteTeam, isPending: false }),
}));

vi.mock('@features/clubs/infrastructure/datasources/team-datasource', () => ({
  createTeamStore: () => ({ reload: mockReload }),
}));

vi.mock('@features/clubs/presentation/components/team-dialog', () => ({
  TeamDialog: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="team-dialog" /> : null,
}));

vi.mock('@/components/ui', () => ({
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
  EntityDataGrid: () => <div data-testid="teams-grid" />,
  ConfirmDialog: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="confirm-dialog" /> : null,
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
  NewButton: ({
    label,
    ...rest
  }: { label?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...rest}>
      {label ?? 'buttons:new'}
    </button>
  ),
  Typography: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

import { TeamsPage } from '@features/clubs/presentation/pages/teams-page';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return renderWithProviders(<TeamsPage />);
}

function selectClub(id = 'club-1') {
  act(() => {
    useWorkspaceStore.setState({
      clubId: id,
      clubName: 'Test Corp',
      clubLogoUrl: null,
      teamId: null,
      teamName: null,
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TeamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      clubId: null,
      clubName: null,
      clubLogoUrl: null,
      teamId: null,
      teamName: null,
    });
  });

  it('shows an empty-state prompt when no club is selected', () => {
    renderPage();

    expect(screen.getByText('clubs:teams.noClubSelected')).toBeTruthy();
    expect(screen.queryByTestId('teams-grid')).toBeNull();
  });

  it('renders the teams grid once a club is selected', () => {
    renderPage();
    selectClub();

    expect(screen.queryByText('clubs:teams.noClubSelected')).toBeNull();
    expect(screen.getByTestId('teams-grid')).toBeTruthy();
  });

  it('opens the add-team dialog when "Add Team" is clicked', () => {
    renderPage();
    selectClub();

    fireEvent.click(screen.getByTestId('teams-add-button'));

    expect(screen.getByTestId('team-dialog')).toBeTruthy();
  });
});
