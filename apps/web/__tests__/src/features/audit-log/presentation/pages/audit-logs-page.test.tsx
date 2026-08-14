import { AuditLogsPage } from '@features/audit-log/presentation/pages/audit-logs-page';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditAction } from '@/proxy/models';
import { makeAuditLog } from '@/test/factories';
import { renderWithProviders } from '@/test/utils/render-with-providers';

const mockUseAuditLog = vi.hoisted(() => vi.fn());

const gridRow = makeAuditLog({
  id: 'audit-1',
  oldValues: null,
  newValues: null,
});

const detailedAuditLog = makeAuditLog({
  id: 'audit-1',
  action: AuditAction.Update,
  entityName: 'Team',
  entityId: 'team-42',
  oldValues: '{"name":"Old name"}',
  newValues: '{"name":"New name"}',
});

vi.mock('@features/audit-log/presentation/hooks/use-audit-log', () => ({
  useAuditLog: (id: string) => mockUseAuditLog(id),
  useAuditLogEntityNames: () => ({ data: [], isLoading: false }),
  useAuditLogUsers: () => ({ data: [], isLoading: false }),
}));

vi.mock('@features/audit-log/infrastructure/datasources/audit-log-datasource', () => ({
  auditLogStore: {},
}));

vi.mock('@features/audit-log/presentation/components/audit-log-grid-toolbar', () => ({
  AuditLogGridToolbar: () => null,
}));

vi.mock('@lib/i18n', () => ({
  formatAdminDate: (value: string) => value,
  formatAdminTime: (value: string) => value,
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === 'audit-log:popup.titleWithDetails') {
        return `${params?.entityName} — ${params?.action}`;
      }

      return key;
    },
  }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    toast: { errorDurationMs: 5000 },
    grid: { defaultPageSize: 10, allowedPageSizes: [10, 25, 50] },
    drawer: {
      sizes: { sm: 420, md: 520, lg: 640, xl: 800 },
      collapsibleDefaults: { minWidth: 520, maxWidth: 800 },
    },
  },
}));

vi.mock('devextreme-react/data-grid', () => ({
  Column: ({
    cellRender,
  }: {
    cellRender?: (args: { data: typeof gridRow }) => React.ReactNode;
  }) => <>{cellRender?.({ data: gridRow })}</>,
  Item: () => null,
  Pager: () => null,
  Paging: () => null,
  Toolbar: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@starterkit/icons', () => ({
  CheckIcon: () => <span data-testid="check-icon" />,
  CopyIcon: () => <span data-testid="copy-icon" />,
  InfoIcon: () => <span data-testid="info-icon" />,
  ChevronLeftIcon: () => <span />,
  ChevronRightIcon: () => <span />,
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@starterkit/shared')>();
  return { ...actual, iconSize: { xs: 16, sm: 20, md: 28, lg: 48 } };
});

vi.mock('@/components/ui', () => ({
  ActionMenu: ({ items }: { items: { label: string; onClick: () => void }[] }) => (
    <div>
      {items.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DrawerPanel: ({
    visible,
    title,
    subtitle,
    badge,
    children,
  }: {
    visible: boolean;
    title?: React.ReactNode;
    subtitle?: string;
    badge?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    visible ? (
      <div data-testid="audit-log-drawer">
        <div>{title}</div>
        {subtitle && <div>{subtitle}</div>}
        {badge}
        {children}
      </div>
    ) : null,
  GridSearchBox: () => null,
  JsonBlock: ({ label, json }: { label: string; json: string | null }) =>
    json ? <div>{`${label}:${json}`}</div> : null,
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  Skeleton: () => <div data-testid="skeleton" />,
  StandardDataGrid: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Typography: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  FormField: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div>
      <span>{label}</span>
      {children}
    </div>
  ),
  GridFilterMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@features/audit-log/presentation/components/audit-action-badge', () => ({
  AuditActionBadge: ({ action }: { action: AuditAction }) => <span>{action}</span>,
}));

vi.mock('@features/audit-log/presentation/components/audit-log-diff', () => ({
  AuditLogDiff: ({
    oldValues,
    newValues,
  }: {
    action: AuditAction;
    oldValues?: string | null;
    newValues?: string | null;
  }) => (
    <div data-testid="audit-log-diff">
      {oldValues && <div>{`before:${oldValues}`}</div>}
      {newValues && <div>{`after:${newValues}`}</div>}
    </div>
  ),
}));

vi.mock('@features/audit-log/presentation/components/audit-log-filter-bar', () => ({
  AuditLogFilterBar: () => null,
}));

vi.mock('devextreme-react/select-box', () => ({ default: () => null }));

function renderPage() {
  return renderWithProviders(<AuditLogsPage />);
}

describe('AuditLogsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuditLog.mockImplementation((id: string) => ({
      data: id === 'audit-1' ? detailedAuditLog : undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
  });

  it('opens the detail drawer using fetched audit log data even when the grid row has no diff payload', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'common:grid.view' }));

    expect(screen.getByTestId('audit-log-drawer')).toBeInTheDocument();
    expect(screen.getAllByText('Team').length).toBeGreaterThan(0);
    expect(screen.getByText('team-42')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-diff')).toBeInTheDocument();
    expect(screen.getByText('after:{"name":"New name"}')).toBeInTheDocument();
  });
});
