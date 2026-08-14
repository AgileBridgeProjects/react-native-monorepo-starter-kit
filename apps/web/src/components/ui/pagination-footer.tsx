import { useTranslation } from '@lib/i18n';
import Button from 'devextreme-react/button';
import SelectBox from 'devextreme-react/select-box';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/cn';

// ─── Props ───────────────────────────────────────────────────────────────────

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  /** When provided, renders a page-size selector. */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PaginationFooter({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  className,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: PaginationFooterProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-border px-md py-sm',
        className,
      )}
    >
      <div className="flex items-center gap-xs">
        <Button
          icon="chevronleft"
          type="normal"
          stylingMode="text"
          disabled={currentPage <= 1}
          onClick={onPrevious}
          elementAttr={{ 'aria-label': t('common:pagination.previous') }}
        />
        <Typography variant="label" className="select-none text-text-muted">
          {currentPage} / {totalPages}
        </Typography>
        <Button
          icon="chevronright"
          type="normal"
          stylingMode="text"
          disabled={currentPage >= totalPages}
          onClick={onNext}
          elementAttr={{ 'aria-label': t('common:pagination.next') }}
        />
      </div>
      {pageSize !== undefined && pageSizeOptions && onPageSizeChange && (
        <SelectBox
          value={pageSize}
          dataSource={pageSizeOptions}
          onValueChanged={(e) => onPageSizeChange(e.value as number)}
          stylingMode="outlined"
          elementAttr={{ 'aria-label': t('common:pagination.perPage') }}
          width={90}
        />
      )}
    </div>
  );
}

export type { PaginationFooterProps };
