'use client';

import type { ReactNode } from 'react';

import { DetailPanel, DetailPanelFooter } from './detail-panel';
import { Typography } from './typography';

export interface MasterDetailEditPanelProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  isDirty?: boolean;
  unsavedLabel?: string;
  canSave?: boolean;
  cancelLabel: string;
  saveLabel: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveTestId?: string;
  testId?: string;
}

export function MasterDetailEditPanel({
  title,
  description,
  children,
  isDirty,
  unsavedLabel,
  canSave,
  cancelLabel,
  saveLabel,
  isSaving,
  onCancel,
  onSave,
  saveTestId,
  testId,
}: MasterDetailEditPanelProps) {
  return (
    <DetailPanel
      data-testid={testId}
      footer={
        <DetailPanelFooter
          isDirty={isDirty}
          unsavedLabel={unsavedLabel}
          canSave={canSave}
          cancelLabel={cancelLabel}
          saveLabel={saveLabel}
          isSaving={isSaving}
          onCancel={onCancel}
          onSave={onSave}
          saveTestId={saveTestId}
        />
      }
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <Typography variant="body-sm" className="font-semibold">
              {title}
            </Typography>
          )}
          {description && (
            <Typography variant="caption" className="block text-text-muted">
              {description}
            </Typography>
          )}
        </div>
      )}
      {children}
    </DetailPanel>
  );
}
