import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ─── Hoisted captures ─────────────────────────────────────────────────────────

const capturedDataGridProps = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

// ─── DevExtreme stubs ────────────────────────────────────────────────────────

vi.mock('devextreme-react/data-grid', () => ({
  default: (props: Record<string, unknown>) => {
    capturedDataGridProps.current = props;
    return <div data-testid="dx-datagrid" />;
  },
  Column: () => null,
  Item: () => null,
  Pager: () => null,
  Paging: () => null,
  RemoteOperations: () => null,
  Selection: () => null,
  Toolbar: () => null,
}));

vi.mock('devextreme-react/button', () => ({
  default: () => null,
}));

// ─── Local component stubs ───────────────────────────────────────────────────

vi.mock('@/components/ui/grid-search-box', () => ({
  GridSearchBox: () => null,
}));

vi.mock('@/components/ui/grid-skeleton', () => ({
  GridSkeleton: () => null,
}));

vi.mock('@/components/ui/new-button', () => ({
  NewButton: () => null,
}));

vi.mock('@/components/ui/typography', () => ({
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// ─── Shared / lib stubs ───────────────────────────────────────────────────────

vi.mock('@starterkit/shared', () => ({
  cn: (...classes: (string | undefined | false | null)[]) => classes.filter(Boolean).join(' '),
}));

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    toast: { durationMs: 3000, errorDurationMs: 5000 },
    grid: { defaultPageSize: 25, actionsColumnWidth: 120, allowedPageSizes: [5, 10, 25, 50, 100] },
  },
}));

// ─── Component under test ─────────────────────────────────────────────────────

import { EntityDataGrid } from '@/components/ui/entity-data-grid';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EntityDataGrid', () => {
  const columns = [{ dataField: 'name' as const, caption: 'Name' }];

  describe('selection class (ABC-123)', () => {
    it('applies dx-grid-select-hidden to the wrapper when selectionMode is not provided', () => {
      const { container } = render(<EntityDataGrid dataSource={[]} columns={columns} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('dx-grid-select-hidden');
    });

    it('applies dx-grid-select-hidden to the wrapper when selectionMode is "none"', () => {
      const { container } = render(
        <EntityDataGrid dataSource={[]} columns={columns} selectionMode="none" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('dx-grid-select-hidden');
    });

    it('does NOT apply dx-grid-select-hidden when selectionMode is "multiple"', () => {
      const { container } = render(
        <EntityDataGrid dataSource={[]} columns={columns} selectionMode="multiple" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('dx-grid-select-hidden');
    });

    it('does NOT apply dx-grid-select-hidden when selectionMode is "single"', () => {
      const { container } = render(
        <EntityDataGrid dataSource={[]} columns={columns} selectionMode="single" />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('dx-grid-select-hidden');
    });
  });

  describe('selectedRowKeys controlled-mode guard (ABC-123)', () => {
    it('does NOT pass selectedRowKeys to DataGrid when selectedKeys prop is omitted', () => {
      render(<EntityDataGrid dataSource={[]} columns={columns} />);
      expect(Object.hasOwn(capturedDataGridProps.current, 'selectedRowKeys')).toBe(false);
    });

    it('does NOT pass selectedRowKeys to DataGrid when selectedKeys is undefined', () => {
      render(<EntityDataGrid dataSource={[]} columns={columns} selectedKeys={undefined} />);
      expect(Object.hasOwn(capturedDataGridProps.current, 'selectedRowKeys')).toBe(false);
    });

    it('DOES pass selectedRowKeys to DataGrid when selectedKeys is an empty array', () => {
      render(
        <EntityDataGrid
          dataSource={[]}
          columns={columns}
          selectionMode="multiple"
          selectedKeys={[]}
        />,
      );
      expect(Object.hasOwn(capturedDataGridProps.current, 'selectedRowKeys')).toBe(true);
      expect(capturedDataGridProps.current.selectedRowKeys).toEqual([]);
    });

    it('DOES pass selectedRowKeys to DataGrid when selectedKeys has values', () => {
      render(
        <EntityDataGrid
          dataSource={[]}
          columns={columns}
          selectionMode="multiple"
          selectedKeys={['id-1', 'id-2']}
        />,
      );
      expect(capturedDataGridProps.current.selectedRowKeys).toEqual(['id-1', 'id-2']);
    });
  });
});
