import { act, fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeUserRecord } from '@/test/factories/user.factory';
import { renderWithProviders } from '@/test/utils/render-with-providers';

// ─── Hoisted mock variables ───────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file, so these refs must be
// created with vi.hoisted() to be in scope when the factories run.

const mockConfirm = vi.hoisted(() => vi.fn());
const mockMutate = vi.hoisted(() => vi.fn());
const mockReload = vi.hoisted(() => vi.fn());

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@features/auth/presentation/hooks/use-current-session', () => ({
  useCurrentSession: () => ({
    hasPermission: () => true,
    userId: null,
    clubId: null,
    isAuthenticated: true,
  }),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    toast: { durationMs: 3000, errorDurationMs: 5000 },
    grid: { actionsColumnWidth: 120, allowedPageSizes: [5, 10, 25, 50, 100] },
    popup: { defaultWidth: 520, largeWidth: 640 },
  },
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starterkit/shared')>();
  return { ...actual, appConfig: { name: 'StarterKit' } };
});

vi.mock('@starterkit/icons', () => ({
  UsersIcon: () => <svg data-testid="users-icon" />,
  DownloadIcon: () => <svg data-testid="download-icon" />,
  EditIcon: () => <svg data-testid="edit-icon" />,
  EmailIcon: () => <svg data-testid="email-icon" />,
  PhoneIcon: () => <svg data-testid="phone-icon" />,
  AddIcon: () => <svg data-testid="add-icon" />,
  CloudUploadIcon: () => <svg data-testid="cloud-upload-icon" />,
  BlockIcon: () => <svg data-testid="block-icon" />,
  CopyIcon: () => <svg data-testid="copy-icon" />,
  ClockIcon: () => <svg data-testid="clock-icon" />,
  CancelIcon: () => <svg data-testid="cancel-icon" />,
  SuccessIcon: () => <svg data-testid="success-icon" />,
  LockIcon: () => <svg data-testid="lock-icon" />,
  WarningIcon: () => <svg data-testid="warning-icon" />,
}));

vi.mock('@features/users/presentation/hooks/use-club-options', () => ({
  useClubOptions: () => ({
    data: [{ id: 'c1', name: 'Acme Corp' }],
    isLoading: false,
  }),
}));

vi.mock('@features/users/presentation/hooks/use-team-options', () => ({
  useTeamOptions: () => ({ data: [], isLoading: false }),
}));

vi.mock('@features/users/presentation/hooks/use-user-grid-store', () => ({
  useUserGridStore: () => ({ store: { reload: mockReload } }),
}));

vi.mock('@features/users/presentation/hooks/use-set-user-active', () => ({
  useSetUserActive: () => ({ mutate: mockMutate }),
}));

vi.mock('devextreme/ui/dialog', () => ({ confirm: mockConfirm }));

// devextreme-react/button: plain <button> stub.
vi.mock('devextreme-react/button', () => ({
  default: ({
    text,
    onClick,
    elementAttr,
  }: {
    text: string;
    onClick: () => void;
    elementAttr: Record<string, unknown>;
  }) => (
    <button type="button" onClick={onClick} {...elementAttr}>
      {text}
    </button>
  ),
}));

// devextreme-react/select-box: render a plain <input> whose onChange bridges to
// DX's onValueChanged({ value }). RTL's fireEvent.change wraps the handler
// in act automatically, avoiding the "React dispatcher is null" error that
// occurs when state setters are called from outside React's scheduler.
vi.mock('devextreme-react/select-box', () => ({
  default: ({
    onValueChanged,
    inputAttr,
    disabled,
  }: {
    onValueChanged?: (e: { value: string | null }) => void;
    inputAttr?: Record<string, string>;
    disabled?: boolean;
  }) => (
    <input
      data-testid={inputAttr?.id ?? 'select-box'}
      aria-label={inputAttr?.['aria-label']}
      disabled={disabled}
      onChange={(e) => onValueChanged?.({ value: e.target.value || null })}
    />
  ),
}));

vi.mock('@features/users/presentation/components/user-drawer', () => ({
  UserDrawer: ({
    visible,
    onHide,
    editUser,
  }: {
    visible: boolean;
    onHide: () => void;
    editUser?: { id: string } | null;
  }) =>
    visible ? (
      <div data-testid="user-drawer">
        <span data-testid="drawer-mode">{editUser ? 'edit' : 'create'}</span>
        <button type="button" data-testid="drawer-close" onClick={onHide}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@features/users/presentation/components/user-bulk-upload-dialog', () => ({
  UserBulkUploadDialog: () => null,
}));

vi.mock('@features/users/presentation/components/change-password-drawer', () => ({
  ChangePasswordDrawer: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="change-password-drawer" /> : null,
}));

vi.mock('@features/users/presentation/components/user-grid', () => ({
  UserGrid: ({ hasClubSelected }: { hasClubSelected: boolean }) =>
    hasClubSelected ? (
      <div data-testid="standard-data-grid">
        <div data-testid="entity-data-grid" />
      </div>
    ) : (
      <div>users:emptyState.selectClub</div>
    ),
}));

// StandardDataGrid: renders action-column cellRender with a test row so
// we can assert the Edit button text and click behavior.
vi.mock('@/components/ui', () => ({
  EntityDataGrid: ({
    columns,
  }: {
    columns?: {
      key?: string;
      dataField?: string;
      cellRender?: (row: { data: unknown }) => React.ReactNode;
    }[];
  }) => {
    const actionCol = columns?.find((c) => c.key === 'actions');
    const testUser = makeUserRecord({ isActive: true });
    return <div data-testid="entity-data-grid">{actionCol?.cellRender?.({ data: testUser })}</div>;
  },
  StandardDataGrid: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="standard-data-grid">{children}</div>
  ),
  PageHeader: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {action}
    </header>
  ),
  FormField: ({
    label,
    htmlFor,
    children,
  }: {
    label: string;
    htmlFor?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  ),
  DrawerPanel: ({
    children,
    visible,
  }: {
    children?: React.ReactNode;
    visible?: boolean;
    title?: string;
    onHide?: () => void;
  }) => (visible ? <div data-testid="drawer-panel">{children}</div> : null),
  EntityFormShell: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="entity-form-shell">{children}</div>
  ),
  ActionMenu: ({ items }: { items?: { text: string; onClick: () => void }[] }) => (
    <div data-testid="action-menu">
      {items?.map((item) => (
        <button key={item.text} type="button" onClick={item.onClick}>
          {item.text}
        </button>
      ))}
    </div>
  ),
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
  Typography: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Tooltip: ({ children }: { children?: React.ReactNode }) => <span role="tooltip">{children}</span>,
  ImageUploadField: () => <input type="file" />,
  Skeleton: () => <div data-testid="skeleton" />,
  Tabs: () => <div data-testid="tabs" />,
  StatusBadge: ({ label }: { label?: string }) => <span>{label}</span>,
  CellPlaceholder: () => <span />,
  Spinner: () => <span />,
  GoogleBrandIcon: () => <span />,
  MicrosoftBrandIcon: () => <span />,
  AccordionGrid: ({ isLoading }: { isLoading?: boolean }) => (
    <div data-testid="accordion-grid" aria-busy={isLoading} />
  ),
  GridSearchBox: ({ onSearch }: { value?: string; onSearch?: (value: string) => void }) => (
    <input data-testid="grid-search-box" onChange={(e) => onSearch?.(e.target.value)} />
  ),
  ModalShell: ({
    children,
    visible,
  }: {
    children?: React.ReactNode;
    visible?: boolean;
    title?: string;
    onHide?: () => void;
  }) => (visible ? <div data-testid="modal-shell">{children}</div> : null),
  SegmentedButton: ({
    items,
  }: {
    items?: { text: string; key: string; onClick?: () => void }[];
  }) => (
    <div data-testid="segmented-button">
      {items?.map((item) => (
        <button key={item.key} type="button" onClick={item.onClick}>
          {item.text}
        </button>
      ))}
    </div>
  ),
  FileDropZone: () => <div data-testid="file-drop-zone" />,
}));

import { UsersView } from '@features/users/presentation/components/users-view';
import { useWorkspaceStore } from '@/store/workspace-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return renderWithProviders(<UsersView />);
}

/** Simulates selecting a club via the workspace store. */
function selectClub(id = 'c1') {
  act(() => {
    useWorkspaceStore.setState({
      clubId: id,
      clubName: 'Acme Corp',
      clubLogoUrl: null,
      teamId: null,
      teamName: null,
    });
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersPage', () => {
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

  describe('initial render', () => {
    it('renders the page container', () => {
      renderPage();
      expect(screen.getByTestId('users-page')).toBeTruthy();
    });

    it('shows empty state when no club is selected', () => {
      renderPage();
      expect(screen.getByText('users:emptyState.selectClub')).toBeTruthy();
    });

    it('does not show the data grid before a club is selected', () => {
      renderPage();
      expect(screen.queryByTestId('standard-data-grid')).toBeNull();
    });
  });

  describe('after club is selected', () => {
    it('hides empty state and shows the data grid', () => {
      renderPage();
      selectClub();

      expect(screen.queryByText('users:emptyState.selectClub')).toBeNull();
      expect(screen.getByTestId('standard-data-grid')).toBeTruthy();
    });
  });

  describe('user drawer', () => {
    it('opens in create mode when Add User is clicked', () => {
      renderPage();
      selectClub();

      fireEvent.click(screen.getByTestId('users-add-button'));

      expect(screen.getByTestId('user-drawer')).toBeTruthy();
      expect(screen.getByTestId('drawer-mode').textContent).toBe('create');
    });

    it('closes the drawer when the hide callback is called', () => {
      renderPage();
      selectClub();

      fireEvent.click(screen.getByTestId('users-add-button'));
      expect(screen.getByTestId('user-drawer')).toBeTruthy();

      fireEvent.click(screen.getByTestId('drawer-close'));
      expect(screen.queryByTestId('user-drawer')).toBeNull();
    });
  });
});
