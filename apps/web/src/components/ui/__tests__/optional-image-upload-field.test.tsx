/// <reference types="@testing-library/jest-dom" />
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OptionalImageUploadField } from '../optional-image-upload-field';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('devextreme-react/switch', () => ({
  default: ({
    value,
    onValueChanged,
    elementAttr,
  }: {
    value: boolean;
    onValueChanged: (e: { value: boolean }) => void;
    elementAttr?: Record<string, string>;
  }) => (
    <input
      type="checkbox"
      checked={value}
      aria-label={elementAttr?.['aria-label']}
      onChange={(e) => onValueChanged({ value: e.target.checked })}
    />
  ),
}));

vi.mock('../image-upload-field', () => ({
  ImageUploadField: ({
    id,
    label,
    onChange,
    onRemove,
    previewUrl,
  }: {
    id: string;
    label: string;
    isUploading: boolean;
    previewUrl?: string;
    onChange: (file: File) => void;
    onRemove?: () => void;
    accept?: string;
    error?: string;
  }) => (
    <div data-testid={`image-upload-field-${id}`}>
      <span>{label}</span>
      <input
        type="file"
        data-testid={`file-input-${id}`}
        onChange={(e) => {
          if (e.target.files?.[0]) onChange(e.target.files[0]);
        }}
      />
      {previewUrl && onRemove && (
        <button type="button" data-testid={`remove-btn-${id}`} onClick={onRemove}>
          Remove
        </button>
      )}
    </div>
  ),
}));

vi.mock('../confirm-dialog', () => ({
  ConfirmDialog: ({
    visible,
    onConfirm,
    onCancel,
    title,
  }: {
    visible: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    message: string;
  }) =>
    visible ? (
      <div role="dialog" data-testid="confirm-dialog" aria-label={title}>
        <button type="button" data-testid="confirm-ok" onClick={onConfirm}>
          Confirm
        </button>
        <button type="button" data-testid="confirm-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    ) : null,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  id: 'test-image',
  label: 'Test image',
  toggleLabel: 'Add image',
  isUploading: false,
  onChange: vi.fn(),
  onRemove: vi.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OptionalImageUploadField', () => {
  describe('initial state', () => {
    it('renders the toggle label', () => {
      render(<OptionalImageUploadField {...defaultProps} />);
      expect(screen.getByText('Add image')).toBeTruthy();
    });

    it('hides the upload field when no previewUrl (create mode)', () => {
      render(<OptionalImageUploadField {...defaultProps} />);
      expect(screen.queryByTestId('image-upload-field-test-image')).toBeNull();
    });

    it('shows the upload field when previewUrl is set (edit mode)', () => {
      render(
        <OptionalImageUploadField {...defaultProps} previewUrl="https://example.com/img.png" />,
      );
      expect(screen.getByTestId('image-upload-field-test-image')).toBeTruthy();
    });
  });

  describe('toggle interaction', () => {
    it('shows the upload field when the toggle is switched on', () => {
      render(<OptionalImageUploadField {...defaultProps} />);
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle);
      expect(screen.getByTestId('image-upload-field-test-image')).toBeTruthy();
    });

    it('hides the upload field when toggled off', () => {
      render(
        <OptionalImageUploadField {...defaultProps} previewUrl="https://example.com/img.png" />,
      );
      const toggle = screen.getByRole('checkbox');
      fireEvent.click(toggle); // toggle off
      expect(screen.queryByTestId('image-upload-field-test-image')).toBeNull();
    });

    it('calls onRemove when toggled off without confirmation', () => {
      const onRemove = vi.fn();
      render(
        <OptionalImageUploadField
          {...defaultProps}
          previewUrl="https://example.com/img.png"
          onRemove={onRemove}
        />,
      );
      fireEvent.click(screen.getByRole('checkbox')); // toggle off
      expect(onRemove).toHaveBeenCalledOnce();
    });
  });

  describe('confirmation on toggle-off', () => {
    it('shows the confirm dialog when showConfirmOnToggleOff and previewUrl is set', () => {
      render(
        <OptionalImageUploadField
          {...defaultProps}
          previewUrl="https://example.com/img.png"
          showConfirmOnToggleOff
          confirmTitle="Remove image?"
          confirmMessage="This will remove the image."
        />,
      );
      fireEvent.click(screen.getByRole('checkbox')); // toggle off
      expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
    });

    it('does NOT show confirm dialog when previewUrl is absent', () => {
      render(
        <OptionalImageUploadField
          {...defaultProps}
          showConfirmOnToggleOff
          confirmTitle="Remove image?"
        />,
      );
      // Toggle on first, then toggle off — no previewUrl so no confirm
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('checkbox'));
      expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    });

    it('calls onRemove and hides upload field on confirm', () => {
      const onRemove = vi.fn();
      render(
        <OptionalImageUploadField
          {...defaultProps}
          previewUrl="https://example.com/img.png"
          onRemove={onRemove}
          showConfirmOnToggleOff
          confirmTitle="Remove?"
          confirmMessage="Sure?"
        />,
      );
      fireEvent.click(screen.getByRole('checkbox')); // open confirm
      fireEvent.click(screen.getByTestId('confirm-ok'));
      expect(onRemove).toHaveBeenCalledOnce();
      expect(screen.queryByTestId('image-upload-field-test-image')).toBeNull();
    });

    it('keeps toggle on and upload visible when confirmation is cancelled', () => {
      render(
        <OptionalImageUploadField
          {...defaultProps}
          previewUrl="https://example.com/img.png"
          showConfirmOnToggleOff
          confirmTitle="Remove?"
          confirmMessage="Sure?"
        />,
      );
      fireEvent.click(screen.getByRole('checkbox')); // open confirm
      fireEvent.click(screen.getByTestId('confirm-cancel'));
      expect(screen.getByTestId('image-upload-field-test-image')).toBeTruthy();
    });
  });
});
