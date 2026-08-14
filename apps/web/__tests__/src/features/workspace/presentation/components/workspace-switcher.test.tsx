import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWorkspaceStore } from '@/store/workspace-store';
import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock state ───────────────────────────────────────────────────────

const mockListClubs = vi.hoisted(() =>
  vi.fn<
    (
      page: number,
      pageSize: number,
      filterText?: string,
    ) => Promise<{
      items: Array<{
        id: string;
        name: string;
        logoUrl: string | null;
        logoPrimaryColor: string | null;
        logoSecondaryColor: string | null;
        logoTertiaryColor: string | null;
        logoMaskColor: string | null;
        logoColorsAreDark: boolean;
        logoHasDarkColors: boolean;
        aiGenerationEnabled: boolean;
        monthlyAiCredits: number | null;
        teamCount: number;
      }>;
      totalCount: number;
      page: number;
      pageSize: number;
      hasNextPage: boolean;
    }>
  >(),
);

const mockGetTeams = vi.hoisted(() =>
  vi.fn<
    (params: unknown) => Promise<{
      items: Array<{ id: string; name: string }>;
      totalCount: number;
    }>
  >(),
);

const mockGetTeamById = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<{ id: string; name: string }>>(),
);

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
    i18n: { dir: () => 'ltr' },
  }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    grid: { searchDebounceMs: 0, flyoutPageSize: 25 },
    selectSearch: { searchTimeout: 0 },
  },
}));

vi.mock('@lib/http/query-config', () => ({
  queryCacheConfig: { list: {} },
}));

vi.mock('@lib/http/create-select-store', () => ({
  createSelectStore: (
    _load: unknown,
    byKey: (id: string) => Promise<{ id: string; name: string }>,
  ) => ({
    store: () => ({ byKey }),
  }),
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starterkit/shared')>();
  return { ...actual, iconSize: { xs: 16, sm: 20, md: 28, lg: 48 } };
});

vi.mock('@starterkit/icons', () => ({
  CloseIcon: () => <svg data-testid="icon-close" />,
  ClubsIcon: () => <svg data-testid="icon-clubs" />,
  SearchIcon: () => <svg data-testid="icon-search" />,
  UnfoldMoreIcon: () => <svg data-testid="icon-unfold" />,
}));

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({
    hasPermission: (key: string) => key === 'StarterKit.Platform.Admin',
    clubId: null,
    userId: null,
    isAuthenticated: true,
  }),
}));

vi.mock('@features/clubs/infrastructure/datasources/club-datasource', () => ({
  clubDatasource: { list: mockListClubs },
}));

vi.mock('@/proxy/services/teams/teams', () => ({
  getApiTeams: mockGetTeams,
  getApiTeamsId: mockGetTeamById,
}));

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui', () => ({
  PaginationFooter: () => null,
}));

vi.mock('@features/workspace/presentation/components/club-avatar', () => ({
  ClubAvatar: ({ name }: { name: string; logoUrl: string | null }) => (
    <span data-testid="club-avatar">{name.charAt(0).toUpperCase()}</span>
  ),
}));

// devextreme-react/button: plain <button> stub.
vi.mock('devextreme-react/button', () => ({
  default: ({
    onClick,
    elementAttr,
    disabled,
  }: {
    onClick: () => void;
    elementAttr?: Record<string, unknown>;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={(elementAttr?.['aria-label'] as string) ?? undefined}
    />
  ),
}));

// devextreme-react/select-box: plain <input> whose onChange bridges to DX's
// onValueChanged({ value }). RTL's fireEvent.change wraps state-setter calls
// in act(), avoiding the "React dispatcher is null" warning seen with native
// DX dispatching from outside React's scheduler.
vi.mock('devextreme-react/select-box', () => ({
  default: ({
    value,
    onValueChanged,
    inputAttr,
    elementAttr,
  }: {
    value?: string | null;
    onValueChanged?: (e: { value: string | null }) => void;
    inputAttr?: Record<string, string>;
    elementAttr?: Record<string, string>;
  }) => (
    <input
      data-testid={elementAttr?.['data-testid'] ?? 'select-box'}
      aria-label={inputAttr?.['aria-label']}
      value={value ?? ''}
      onChange={(e) => onValueChanged?.({ value: e.target.value || null })}
    />
  ),
}));

import { WorkspaceSwitcher } from '@features/workspace/presentation/components/workspace-switcher';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetWorkspace() {
  useWorkspaceStore.setState({
    clubId: null,
    clubName: null,
    clubLogoUrl: null,
    teamId: null,
    teamName: null,
  });
}

function makeClubResult(
  items: Array<{
    id: string;
    name: string;
    logoUrl?: string | null;
    teamCount?: number;
    logoPrimaryColor?: string | null;
    logoSecondaryColor?: string | null;
    logoTertiaryColor?: string | null;
    logoMaskColor?: string | null;
    logoColorsAreDark?: boolean;
    logoHasDarkColors?: boolean;
    aiGenerationEnabled?: boolean;
    monthlyAiCredits?: number | null;
  }>,
) {
  return {
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      logoUrl: c.logoUrl ?? null,
      logoPrimaryColor: c.logoPrimaryColor ?? null,
      logoSecondaryColor: c.logoSecondaryColor ?? null,
      logoTertiaryColor: c.logoTertiaryColor ?? null,
      logoMaskColor: c.logoMaskColor ?? null,
      logoColorsAreDark: c.logoColorsAreDark ?? false,
      logoHasDarkColors: c.logoHasDarkColors ?? false,
      aiGenerationEnabled: c.aiGenerationEnabled ?? false,
      monthlyAiCredits: c.monthlyAiCredits ?? null,
      teamCount: c.teamCount ?? 0,
    })),
    totalCount: items.length,
    page: 1,
    pageSize: 25,
    hasNextPage: false,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkspace();
    mockListClubs.mockResolvedValue(
      makeClubResult([
        { id: 'club-1', name: 'Acme Corp', teamCount: 2 },
        { id: 'club-2', name: 'Globex', teamCount: 1 },
      ]),
    );
    mockGetTeams.mockResolvedValue({
      items: [
        { id: 'dept-1', name: 'Engineering' },
        { id: 'dept-2', name: 'Sales' },
      ],
      totalCount: 2,
    });
    mockGetTeamById.mockImplementation((id) =>
      Promise.resolve(
        id === 'dept-1' ? { id: 'dept-1', name: 'Engineering' } : { id: 'dept-2', name: 'Sales' },
      ),
    );
  });

  describe('idle state — no workspace selected', () => {
    it('shows the "select workspace" placeholder on the trigger', () => {
      renderWithProviders(<WorkspaceSwitcher />);
      const trigger = screen.getByTestId('club-selector');
      expect(trigger.getAttribute('aria-label')).toContain('workspace:switcher.selectWorkspace');
    });

    it('shows the "select club first" hint instead of the team dropdown', () => {
      renderWithProviders(<WorkspaceSwitcher />);
      expect(screen.getByText('workspace:switcher.selectClubFirst')).toBeTruthy();
      expect(screen.queryByTestId('team-switcher')).toBeNull();
    });

    it('does not render the club flyout until the trigger is clicked', () => {
      renderWithProviders(<WorkspaceSwitcher />);
      expect(screen.queryByTestId('club-flyout')).toBeNull();
    });
  });

  describe('opening the club flyout', () => {
    it('renders the flyout with the search input and club list when the trigger is clicked', async () => {
      renderWithProviders(<WorkspaceSwitcher />);

      fireEvent.click(screen.getByTestId('club-selector'));

      expect(screen.getByTestId('club-flyout')).toBeTruthy();
      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeTruthy();
        expect(screen.getByText('Globex')).toBeTruthy();
      });
    });

    it('closes the flyout when Escape is pressed', async () => {
      renderWithProviders(<WorkspaceSwitcher />);
      fireEvent.click(screen.getByTestId('club-selector'));
      await waitFor(() => expect(screen.getByText('Acme Corp')).toBeTruthy());

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => expect(screen.queryByTestId('club-flyout')).toBeNull());
    });

    it('closes the flyout when the user clicks outside it', async () => {
      renderWithProviders(<WorkspaceSwitcher />);
      fireEvent.click(screen.getByTestId('club-selector'));
      await waitFor(() => expect(screen.getByText('Acme Corp')).toBeTruthy());

      fireEvent.mouseDown(document.body);

      await waitFor(() => expect(screen.queryByTestId('club-flyout')).toBeNull());
    });
  });

  describe('selecting a club', () => {
    it('writes the club to the workspace store and closes the flyout', async () => {
      renderWithProviders(<WorkspaceSwitcher />);
      fireEvent.click(screen.getByTestId('club-selector'));
      await waitFor(() => expect(screen.getByText('Acme Corp')).toBeTruthy());

      fireEvent.click(screen.getByText('Acme Corp'));

      await waitFor(() => expect(screen.queryByTestId('club-flyout')).toBeNull());
      const state = useWorkspaceStore.getState();
      expect(state.clubId).toBe('club-1');
      expect(state.clubName).toBe('Acme Corp');
      expect(state.teamId).toBeNull();
    });
  });

  describe('with a club already selected', () => {
    beforeEach(() => {
      useWorkspaceStore.setState({
        clubId: 'club-1',
        clubName: 'Acme Corp',
        clubLogoUrl: null,
        teamId: null,
        teamName: null,
      });
    });

    it('shows the club name on the trigger and renders the team dropdown', async () => {
      renderWithProviders(<WorkspaceSwitcher />);

      expect(screen.getByTestId('club-selector').getAttribute('aria-label')).toContain('Acme Corp');
      await waitFor(() => expect(screen.getByTestId('team-switcher')).toBeTruthy());
    });

    it('writes the team to the store when one is chosen', async () => {
      renderWithProviders(<WorkspaceSwitcher />);

      const dept = await waitFor(() => screen.getByTestId('team-switcher'));
      fireEvent.change(dept, { target: { value: 'dept-1' } });

      await waitFor(() => {
        const state = useWorkspaceStore.getState();
        expect(state.teamId).toBe('dept-1');
        expect(state.teamName).toBe('Engineering');
      });
    });
  });

  describe('clearing the team', () => {
    beforeEach(() => {
      useWorkspaceStore.setState({
        clubId: 'club-1',
        clubName: 'Acme Corp',
        clubLogoUrl: null,
        teamId: 'dept-1',
        teamName: 'Engineering',
      });
    });

    it('keeps the club but clears the team when the X is clicked', async () => {
      renderWithProviders(<WorkspaceSwitcher />);

      const clearBtn = await waitFor(() => screen.getByLabelText('workspace:switcher.clearTeam'));
      fireEvent.click(clearBtn);

      const state = useWorkspaceStore.getState();
      expect(state.clubId).toBe('club-1');
      expect(state.clubName).toBe('Acme Corp');
      expect(state.teamId).toBeNull();
      expect(state.teamName).toBeNull();
    });
  });
});
