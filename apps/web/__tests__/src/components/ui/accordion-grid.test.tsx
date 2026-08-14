import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccordionGrid } from '@/components/ui/accordion-grid';

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

interface ParentRow {
  id: string;
  name: string;
}

function ExpansionHarness() {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const parent = { id: 'club-1', name: 'Acme' };

  return (
    <>
      <output data-testid="expanded-ids">{expandedIds.join(',')}</output>
      <AccordionGrid<ParentRow, never>
        items={[{ id: parent.id, data: parent }]}
        renderParent={(item) => item.name}
        renderChild={() => null}
        onExpand={(_item, id) =>
          setExpandedIds((current) => (current.includes(id) ? current : [...current, id]))
        }
      />
    </>
  );
}

describe('AccordionGrid', () => {
  it('notifies its parent about expansion outside its state updater', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<ExpansionHarness />);
    fireEvent.click(screen.getByTestId('accordion-grid-parent-club-1'));

    expect(screen.getByTestId('expanded-ids')).toHaveTextContent('club-1');
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('Cannot update a component');
    consoleError.mockRestore();
  });

  it('mirrors configured row content during initial loading', () => {
    render(
      <AccordionGrid<ParentRow, never>
        items={[]}
        isLoading
        renderParent={(item) => item.name}
        renderParentEnd={() => null}
        renderChild={() => null}
        skeletonConfig={{
          rowCount: 3,
          showLeadingVisual: true,
          badgeCount: 2,
          showActions: true,
        }}
      />,
    );

    expect(screen.getAllByTestId('accordion-grid-skeleton-row')).toHaveLength(3);
    expect(screen.getAllByTestId('accordion-grid-skeleton-leading')).toHaveLength(3);
    expect(screen.getAllByTestId('accordion-grid-skeleton-badge')).toHaveLength(6);
    expect(screen.getAllByTestId('accordion-grid-skeleton-action')).toHaveLength(3);
  });

  it('delays revealing structure-matched child rows to avoid loading flashes', () => {
    vi.useFakeTimers();
    render(<ExpansionHarness />);

    fireEvent.click(screen.getByTestId('accordion-grid-parent-club-1'));
    const childSkeleton = screen.getByTestId('accordion-grid-child-skeleton');
    expect(childSkeleton).toHaveClass('opacity-0');

    act(() => vi.advanceTimersByTime(140));

    expect(childSkeleton).toHaveClass('opacity-100');
    vi.useRealTimers();
  });
});
