'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { DownloadIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useCallback, useState } from 'react';
import { DropZone } from './drop-zone';
import { notify } from './toast';
import { Typography } from './typography';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ExcelImportProps<TRow> {
  /** Parse the selected file and return parsed rows. Throw to show an error toast. */
  parseFile: (file: File) => Promise<TRow[]>;
  /** Render the preview UI (table, summary, etc.) for parsed rows. */
  renderPreview: (props: ExcelImportPreviewProps<TRow>) => React.ReactNode;
  /** Description text shown above the drop zone. */
  description: string;
  /** Label for the upload button. */
  uploadLabel: string;
  /** Toast message shown when parsed rows are empty. */
  emptyMessage: string;
  /** URL of the downloadable Excel template file for this question type. */
  templateUrl?: string;
}

export interface ExcelImportPreviewProps<TRow> {
  rows: TRow[];
  isParsing: boolean;
  onCancel: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ExcelImport<TRow>({
  parseFile,
  renderPreview,
  description,
  uploadLabel,
  emptyMessage,
  templateUrl,
}: ExcelImportProps<TRow>) {
  const { t } = useTranslation();
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<TRow[] | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setIsParsing(true);
      try {
        const rows = await parseFile(file);
        if (rows.length === 0) {
          notify(emptyMessage, 'warning', uiConfig.toast.durationMs);
          return;
        }
        setPreview(rows);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('common:errors.unknown');
        notify(message, 'error', uiConfig.toast.errorDurationMs);
      } finally {
        setIsParsing(false);
      }
    },
    [parseFile, emptyMessage, t],
  );

  function handleCancel() {
    setPreview(null);
  }

  if (preview) {
    return <>{renderPreview({ rows: preview, isParsing, onCancel: handleCancel })}</>;
  }

  return (
    <div className="flex flex-col gap-sm">
      <Typography variant="body-sm" className="text-text-secondary">
        {description}
      </Typography>
      {templateUrl && (
        <a
          href={templateUrl}
          download
          className="inline-flex w-fit items-center gap-xs text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          <DownloadIcon size={iconSize.xs} aria-hidden="true" />
          {t('common:actions.downloadTemplate')}
        </a>
      )}
      <DropZone
        onFile={processFile}
        accept=".xlsx,.xls"
        disabled={isParsing}
        isLoading={isParsing}
        buttonLabel={uploadLabel}
        hint={t('common:actions.supportsExcel', { formats: '.xlsx, .xls', maxSize: '10MB' })}
        inputAriaLabel={uploadLabel}
        inputTestId="excel-file-input"
        buttonTestId="excel-upload-button"
      />
    </div>
  );
}
