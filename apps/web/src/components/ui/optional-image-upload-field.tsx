'use client';

import Switch from 'devextreme-react/switch';
import { useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { ImageUploadField, type ImageUploadFieldProps } from './image-upload-field';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface OptionalImageUploadFieldProps extends ImageUploadFieldProps {
  /** Label shown on the toggle switch row. */
  toggleLabel: string;
  /**
   * When true, a confirmation dialog is shown before removing the image on toggle-off.
   * Pass `true` when an existing saved image is present (edit mode with initialImageUrl).
   */
  showConfirmOnToggleOff?: boolean;
  /** Title for the removal confirmation dialog. */
  confirmTitle?: string;
  /** Message body for the removal confirmation dialog. */
  confirmMessage?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Wraps `ImageUploadField` behind a toggle switch.
 * - Default state: toggle off → upload field hidden.
 * - Initialises to on when `previewUrl` is set (edit mode with existing image).
 * - Shows a confirmation dialog before removing a saved image when
 *   `showConfirmOnToggleOff` is true.
 *
 * Use a `key` prop tied to `visible` + `initialImageUrl` on the parent so this
 * component remounts and re-initialises when the form drawer opens/closes.
 */
export function OptionalImageUploadField({
  toggleLabel,
  showConfirmOnToggleOff = false,
  confirmTitle = '',
  confirmMessage = '',
  previewUrl,
  onRemove,
  isUploading,
  ...imageProps
}: OptionalImageUploadFieldProps) {
  const [isOn, setIsOn] = useState(!!previewUrl);
  const [confirmVisible, setConfirmVisible] = useState(false);

  function handleToggle(checked: boolean) {
    if (checked) {
      setIsOn(true);
      return;
    }
    // Toggling off — ask for confirmation when a saved image is present
    if (showConfirmOnToggleOff && previewUrl) {
      setConfirmVisible(true);
    } else {
      onRemove?.();
      setIsOn(false);
    }
  }

  function handleConfirmClear() {
    setConfirmVisible(false);
    onRemove?.();
    setIsOn(false);
  }

  return (
    <div className="flex flex-col gap-sm">
      {/* Toggle row */}
      <div className="flex items-center gap-sm">
        <Switch
          value={isOn}
          disabled={isUploading}
          onValueChanged={(e) => handleToggle(Boolean(e.value))}
          elementAttr={{ 'aria-label': toggleLabel }}
        />
        <span className="text-sm font-medium text-text">{toggleLabel}</span>
      </div>

      {/* Upload field — only rendered when toggled on */}
      {isOn && (
        <ImageUploadField
          {...imageProps}
          isUploading={isUploading}
          previewUrl={previewUrl}
          onRemove={onRemove}
        />
      )}

      {/* Confirmation dialog for removing a saved image */}
      {showConfirmOnToggleOff && (
        <ConfirmDialog
          visible={confirmVisible}
          title={confirmTitle}
          message={confirmMessage}
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmVisible(false)}
        />
      )}
    </div>
  );
}
