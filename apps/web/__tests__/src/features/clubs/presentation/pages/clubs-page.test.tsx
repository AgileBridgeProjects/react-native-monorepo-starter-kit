import { ClubsPage } from '@features/clubs/presentation/pages/clubs-page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockHasPermission, mockRouterPush } = vi.hoisted(() => ({
  mockHasPermission: vi.fn<(key: string) => boolean>().mockReturnValue(true),
  mockRouterPush: vi.fn(),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({ hasPermission: mockHasPermission }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    toast: { durationMs: 3000, errorDurationMs: 5000 },
    grid: { allowedPageSizes: [10, 25, 50] },
  },
}));

vi.mock('@features/clubs/presentation/hooks/use-clubs', () => ({
  useClubs: () => ({
    data: {
      items: [
        {
          id: 'club-1',
          name: 'Test Corp',
          teamCount: 2,
          activeUserCount: 3,
          aiGenerationEnabled: false,
        },
      ],
      totalCount: 1,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@features/clubs/presentation/hooks/use-create-club', () => ({
  useCreateClub: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/clubs/presentation/hooks/use-delete-club', () => ({
  useDeleteClub: () => ({ mutate: vi.fn() }),
}));

vi.mock('@features/clubs/presentation/hooks/use-update-club', () => ({
  useUpdateClub: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/clubs/presentation/components/club-form-inline', () => ({
  ClubFormInline: () => null,
}));

vi.mock('@features/workspace/presentation/components/club-avatar', () => ({
  ClubAvatar: () => null,
}));

vi.mock('@hookform/resolvers/standard-schema', () => ({
  standardSchemaResolver: () => async () => ({ values: {}, errors: {} }),
}));

vi.mock('@starterkit/icons', () => ({
  AddIcon: () => null,
  DeleteIcon: () => null,
  EditIcon: () => null,
  ShareWithTeamsIcon: () => <svg data-testid="teams-pill-icon" />,
  SparkleIcon: () => <svg data-testid="ai-generation-pill-icon" />,
  UsersIcon: () => <svg data-testid="users-pill-icon" />,
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starterkit/shared')>();
  return { ...actual, iconSize: { xs: 16, sm: 20, md: 28, lg: 48 } };
});

vi.mock('@/components/ui', async () => {
  const uiMocks = await import('@/test/mocks/ui-mocks');
  return {
    ...uiMocks,
    // Renders renderParentEnd per club — this page no longer has expandable children
    // (Team/Season management moved to the standalone Teams page follow-up).
    AccordionGrid: ({
      items,
      renderParent,
      renderParentEnd,
    }: {
      items: Array<{ id: string; data: unknown }>;
      renderParent?: (data: unknown) => React.ReactNode;
      renderParentEnd?: (data: unknown) => React.ReactNode;
    }) => (
      <div data-testid="accordion-grid">
        {items.map((item) => (
          <div key={item.id}>
            {renderParent?.(item.data)}
            {renderParentEnd?.(item.data)}
          </div>
        ))}
      </div>
    ),
    // Spreads buttonProps (including data-testid) onto a button element, and renders each
    // item's label so tests can assert on which specific actions are offered.
    // Returns null for empty items, mirroring the real component's behaviour.
    ActionMenu: ({
      items,
      buttonProps,
    }: {
      items: Array<{ label: string }>;
      buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
      'aria-label'?: string;
    }) =>
      items.length === 0 ? null : (
        <button type="button" {...buttonProps}>
          menu
          {items.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </button>
      ),
    Banner: () => null,
    ConfirmDialog: () => null,
    DrawerPanel: ({
      visible,
      children,
    }: {
      visible: boolean;
      children: React.ReactNode;
      title?: React.ReactNode;
      onHide?: () => void;
      width?: number;
      'data-testid'?: string;
    }) => (visible ? <div>{children}</div> : null),
    EntityFormShell: ({
      children,
      extraActions,
    }: {
      children: React.ReactNode;
      extraActions?: React.ReactNode;
      onSubmit?: () => void;
      onCancel?: () => void;
      isSubmitting?: boolean;
      submitLabel?: string;
      className?: string;
    }) => (
      <div>
        {children}
        {extraActions}
      </div>
    ),
    PageHeader: ({ action }: { action?: React.ReactNode }) => <div>{action}</div>,
    PaginationFooter: () => null,
    StatusBadge: ({ icon: Icon, label }: { icon?: React.ComponentType; label?: string }) => (
      <span>
        {Icon && <Icon />}
        {label}
      </span>
    ),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ClubsPage />
    </QueryClientProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ClubsPage — permission gating', () => {
  it('displays a logo thumbnail beside the club name', () => {
    renderPage();

    expect(screen.getByTestId('club-logo-club-1')).toBeInTheDocument();
    expect(screen.getByText('Test Corp')).toBeInTheDocument();
  });

  it('displays icons in the team and user count pills', () => {
    renderPage();

    expect(screen.getByTestId('teams-pill-icon')).toBeInTheDocument();
    expect(screen.getByTestId('users-pill-icon')).toBeInTheDocument();
  });

  it('does not display an AI badge when AI generation is disabled', () => {
    renderPage();

    expect(screen.queryByTestId('ai-generation-pill-icon')).not.toBeInTheDocument();
    expect(screen.queryByText('clubs:table.aiGeneration.enabled')).not.toBeInTheDocument();
  });

  describe('when the user has Clubs.Manage permission', () => {
    it('shows the Add Club button in the header', () => {
      mockHasPermission.mockReturnValue(true);
      renderPage();
      expect(screen.getByTestId('clubs-add-button')).toBeInTheDocument();
    });

    it('shows edit and delete in the club action menu', () => {
      mockHasPermission.mockReturnValue(true);
      renderPage();
      const menu = screen.getByTestId('club-actions-club-1');
      expect(menu).toBeInTheDocument();
      expect(screen.getByText('common:grid.edit')).toBeInTheDocument();
      expect(screen.getByText('common:grid.delete')).toBeInTheDocument();
    });
  });

  describe('when the user does not have Clubs.Manage permission', () => {
    it('hides the Add Club button in the header', () => {
      mockHasPermission.mockReturnValue(false);
      renderPage();
      expect(screen.queryByTestId('clubs-add-button')).not.toBeInTheDocument();
    });

    it('hides edit and delete but keeps Manage teams in the club action menu', () => {
      mockHasPermission.mockImplementation((key: string) => key === 'StarterKit.Teams.View');
      renderPage();
      expect(screen.getByTestId('club-actions-club-1')).toBeInTheDocument();
      expect(screen.getByText('clubs:teams.manageButton')).toBeInTheDocument();
      expect(screen.queryByText('common:grid.edit')).not.toBeInTheDocument();
      expect(screen.queryByText('common:grid.delete')).not.toBeInTheDocument();
    });
  });

  describe('when the user does not have Teams.View permission', () => {
    it('hides Manage teams from the club action menu and renders the team badge as non-interactive', () => {
      mockHasPermission.mockImplementation((key: string) => key !== 'StarterKit.Teams.View');
      renderPage();
      expect(screen.queryByText('clubs:teams.manageButton')).not.toBeInTheDocument();
      const badge = screen.getByText('clubs:teams.count');
      expect(badge.closest('button')).not.toBeInTheDocument();
    });
  });

  it('navigates to the Teams page when the team-count badge is clicked', () => {
    mockHasPermission.mockReturnValue(true);
    renderPage();
    fireEvent.click(screen.getByText('clubs:teams.count'));
    expect(mockRouterPush).toHaveBeenCalledWith('/teams');
  });

  it('navigates to the Teams page when "Manage teams" is clicked', () => {
    mockHasPermission.mockReturnValue(true);
    renderPage();
    fireEvent.click(screen.getByText('clubs:teams.manageButton'));
    expect(mockRouterPush).toHaveBeenCalledWith('/teams');
  });
});
