'use client';

import { BULK_UPLOAD_MAX_ROWS } from '@features/users/domain/constants';
import { userDatasource } from '@features/users/infrastructure/datasources/user-datasource';
import { UserBulkUploadInvalidGrid } from '@features/users/presentation/components/user-bulk-upload-invalid-grid';
import { UserBulkUploadValidGrid } from '@features/users/presentation/components/user-bulk-upload-valid-grid';
import { useBulkUploadConfirm } from '@features/users/presentation/hooks/use-bulk-upload-confirm';
import { useBulkUploadPreview } from '@features/users/presentation/hooks/use-bulk-upload-preview';
import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { DownloadIcon } from '@starterkit/icons';
import { cn } from '@starterkit/shared';
import { useMemo, useState } from 'react';
import {
  Button as AppButton,
  DrawerPanel,
  FileDropZone,
  notify,
  Skeleton,
  Tabs,
  Typography,
} from '@/components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBulkUploadDialogProps {
  visible: boolean;
  clubId: string;
  /** Optional team — users will be assigned to it if provided. */
  teamId?: string;
  onHide: () => void;
  onConfirmed: () => void;
}

type Step = 'upload' | 'preview';
type PreviewTab = 'ready' | 'errors' | 'duplicates' | 'unprocessable';

// ─── Component ───────────────────────────────────────────────────────────────

export function UserBulkUploadDialog({
  visible,
  clubId,
  teamId,
  onHide,
  onConfirmed,
}: UserBulkUploadDialogProps) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>('ready');

  const previewMutation = useBulkUploadPreview();
  const confirmMutation = useBulkUploadConfirm();

  const preview = previewMutation.data;
  const readyCount = preview?.readyToAdd?.length ?? 0;
  const errorCount = preview?.validationErrors?.length ?? 0;
  const dupCount = preview?.duplicates?.length ?? 0;
  const unprocessableCount = preview?.unprocessable?.length ?? 0;
  const isBlankFile = !!preview && readyCount + errorCount + dupCount + unprocessableCount === 0;
  const isConfirming = confirmMutation.isPending;

  function handleClose() {
    setStep('upload');
    setSelectedFile(null);
    setActiveTab('ready');
    previewMutation.reset();
    confirmMutation.reset();
    onHide();
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true);
    try {
      const blob = await userDatasource.getBulkUploadTemplate(clubId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-bulk-upload-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch {
      notify(t('users:bulkUpload.toast.downloadFailed'), 'error', uiConfig.toast.errorDurationMs);
    } finally {
      setIsDownloading(false);
    }
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file);
    if (file) void triggerPreview(file);
  }

  async function triggerPreview(file: File) {
    previewMutation.reset();
    setStep('preview');
    setActiveTab('ready');
    try {
      await previewMutation.mutateAsync({ clubId, teamId, file });
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('exceeds the maximum')
          ? t('users:bulkUpload.toast.tooManyRows', { maxRows: BULK_UPLOAD_MAX_ROWS })
          : t('users:bulkUpload.toast.previewFailed');
      notify(message, 'error', uiConfig.toast.errorDurationMs);
      setStep('upload');
    }
  }

  async function handleConfirm() {
    if (!preview?.readyToAdd?.length) return;

    try {
      const result = await confirmMutation.mutateAsync({
        clubId,
        teamId: teamId ?? null,
        validRows: preview.readyToAdd,
      });
      const failedCount = +(result.failedCount ?? 0);
      const createdCount = +(result.createdCount ?? 0);
      if (failedCount > 0) {
        notify(
          t('users:bulkUpload.toast.partialSuccess', {
            created: createdCount,
            failed: failedCount,
          }),
          'warning',
          uiConfig.toast.durationMs,
        );
      } else {
        notify(
          t('users:bulkUpload.toast.success', { count: createdCount }),
          'success',
          uiConfig.toast.durationMs,
        );
      }
      onConfirmed();
      handleClose();
    } catch {
      notify(t('users:bulkUpload.toast.confirmFailed'), 'error', uiConfig.toast.errorDurationMs);
    }
  }

  const tabOptions = useMemo(
    () => [
      {
        value: 'ready' as PreviewTab,
        label: t('users:bulkUpload.step2.readyTabLabel'),
        badge: readyCount,
      },
      {
        value: 'errors' as PreviewTab,
        label: t('users:bulkUpload.step2.errorsTabLabel'),
        badge: errorCount,
      },
      {
        value: 'duplicates' as PreviewTab,
        label: t('users:bulkUpload.step2.duplicatesTabLabel'),
        badge: dupCount,
      },
      {
        value: 'unprocessable' as PreviewTab,
        label: t('users:bulkUpload.step2.unprocessableTabLabel'),
        badge: unprocessableCount,
      },
    ],
    [t, readyCount, errorCount, dupCount, unprocessableCount],
  );

  const previewBody = isConfirming ? (
    <div className="flex flex-col items-center gap-md py-xl text-center">
      <Typography variant="body-sm" className="text-text-secondary">
        {t('users:bulkUpload.confirming', { count: readyCount })}
      </Typography>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-border">
        <div className="absolute inset-y-0 left-0 w-2/5 origin-left rounded-full bg-primary [animation:indeterminate-progress_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  ) : isBlankFile ? (
    <div className="rounded-md border border-border bg-surface p-md">
      <Typography variant="body-sm" className="text-text-secondary">
        {t('users:bulkUpload.emptyState.blankFile')}
      </Typography>
    </div>
  ) : (
    <>
      <Tabs
        label={t('users:bulkUpload.step2.title')}
        options={tabOptions}
        value={activeTab}
        onValueChanged={setActiveTab}
      />
      {activeTab === 'ready' && (
        <UserBulkUploadValidGrid
          data={preview?.readyToAdd ?? []}
          emptyText={t('users:bulkUpload.emptyState.ready')}
        />
      )}
      {activeTab === 'errors' && (
        <UserBulkUploadInvalidGrid
          data={preview?.validationErrors ?? []}
          emptyText={t('users:bulkUpload.emptyState.errors')}
        />
      )}
      {activeTab === 'duplicates' && (
        <UserBulkUploadInvalidGrid
          data={preview?.duplicates ?? []}
          emptyText={t('users:bulkUpload.emptyState.duplicates')}
        />
      )}
      {activeTab === 'unprocessable' && (
        <UserBulkUploadInvalidGrid
          data={preview?.unprocessable ?? []}
          emptyText={t('users:bulkUpload.emptyState.unprocessable')}
        />
      )}
    </>
  );

  return (
    <DrawerPanel
      title={t('users:bulkUpload.title')}
      visible={visible}
      onHide={handleClose}
      collapsible={uiConfig.drawer.collapsiblePresets.bulkUpload}
      defaultCollapsed={step === 'upload'}
      data-testid="users-bulk-upload-drawer"
    >
      {step === 'upload' && (
        <div className="flex flex-col gap-lg">
          <Typography variant="body">
            {teamId
              ? t('users:bulkUpload.step1.descriptionWithTeam', {
                  maxRows: BULK_UPLOAD_MAX_ROWS,
                })
              : t('users:bulkUpload.step1.description', { maxRows: BULK_UPLOAD_MAX_ROWS })}
          </Typography>

          <AppButton
            variant="outlined"
            onClick={handleDownloadTemplate}
            isLoading={isDownloading}
            disabled={isDownloading}
          >
            <DownloadIcon aria-hidden="true" />
            {t('users:bulkUpload.downloadTemplate')}
          </AppButton>

          <div className="flex flex-col gap-xs">
            <Typography variant="body-sm" className="font-medium text-text">
              {t('users:bulkUpload.uploadLabel')}
            </Typography>
            <FileDropZone
              onFile={(file) => handleFileChange(file)}
              onClear={() => handleFileChange(null)}
              fileName={selectedFile?.name}
              hint={t('users:bulkUpload.uploadHint', { maxRows: BULK_UPLOAD_MAX_ROWS })}
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              data-testid="users-bulk-upload-file-input"
            />
          </div>

          <div className="flex justify-end gap-sm">
            <AppButton variant="outlined" onClick={handleClose} disabled={isDownloading}>
              {t('users:bulkUpload.cancelButton')}
            </AppButton>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="flex flex-col gap-lg">
          {previewMutation.isPending && (
            <div className="flex flex-col overflow-hidden rounded-md border border-border">
              {/* Tab bar */}
              <div className="flex gap-sm border-b border-border bg-surface px-md py-sm">
                <Skeleton className="h-7 w-20 rounded-sm" />
                <Skeleton className="h-7 w-14 rounded-sm" />
                <Skeleton className="h-7 w-24 rounded-sm" />
                <Skeleton className="h-7 w-28 rounded-sm" />
              </div>
              {/* Column headers */}
              <div className="flex items-center border-b border-border px-md py-sm">
                {Array.from({ length: 5 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                  <div key={i} className="flex-1 px-xs">
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
              {/* Data rows */}
              {(['sk-0', 'sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'] as const).map((rowKey, rowIdx) => (
                <div
                  key={rowKey}
                  className={cn(
                    'flex items-center border-b border-border px-md py-sm',
                    rowIdx % 2 !== 0 ? 'bg-surface' : 'bg-surface-elevated',
                  )}
                >
                  {Array.from({ length: 5 }, (_, colIdx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders have no stable identity
                    <div key={colIdx} className="flex-1 px-xs">
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {preview && previewBody}

          <div className="flex justify-end gap-sm">
            <AppButton
              variant="outlined"
              onClick={() => {
                previewMutation.reset();
                setStep('upload');
              }}
              disabled={isConfirming || previewMutation.isPending}
            >
              {t('users:bulkUpload.backButton')}
            </AppButton>
            <AppButton
              onClick={handleConfirm}
              isLoading={isConfirming}
              disabled={readyCount === 0 || isBlankFile || previewMutation.isPending}
              data-testid="users-bulk-upload-confirm-button"
            >
              {t('users:bulkUpload.addButton', { count: readyCount })}
            </AppButton>
          </div>
        </div>
      )}
    </DrawerPanel>
  );
}
