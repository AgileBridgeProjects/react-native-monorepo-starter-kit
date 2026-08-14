/**
 * Shared UI component stubs for use in vi.mock('@/components/ui', ...) calls.
 *
 * Usage in a test file:
 *   vi.mock('@/components/ui', async () => await import('@/test/mocks/ui-mocks'));
 *
 * Or override individual components:
 *   vi.mock('@/components/ui', async () => ({
 *     ...(await import('@/test/mocks/ui-mocks')),
 *     OtpInput: MyCustomStub,
 *   }));
 */
import type React from 'react';
import { useState } from 'react';
import { vi } from 'vitest';

export const Button = ({
  children,
  isLoading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }) => (
  <button {...props}>{isLoading ? 'Loading...' : children}</button>
);

export const FormField = ({
  label,
  children,
  error,
  hint,
  htmlFor,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={htmlFor}>{label}</label>
    {children}
    {hint && <span>{hint}</span>}
    {error && <span>{error}</span>}
  </div>
);

export const FieldError = ({ message, id }: { message?: string; id?: string }) =>
  message ? <span id={id}>{message}</span> : null;

export const Typography = ({ children }: { children: React.ReactNode }) => <span>{children}</span>;

export const Skeleton = ({ className }: { className?: string }) => <div className={className} />;

export const SegmentedButton = <T extends string>({
  options,
  value,
  onValueChanged,
  legend,
}: {
  options: ReadonlyArray<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onValueChanged: (value: T) => void;
  legend: string;
  id?: string;
}) => (
  <fieldset>
    <legend>{legend}</legend>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onValueChanged(option.value)}
      >
        {option.label}
      </button>
    ))}
  </fieldset>
);

export const DateRangeBox = ({
  onChange,
  disabled,
}: {
  value?: { startDate: Date | null; endDate: Date | null };
  onChange?: (value: { startDate: Date | null; endDate: Date | null }) => void;
  disabled?: boolean;
  min?: Date;
  max?: Date;
}) => (
  <div data-testid="date-range-box">
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange?.({ startDate: null, endDate: null })}
    >
      set date range
    </button>
  </div>
);

export const Tabs = <T extends string>({
  options,
  value,
  onValueChanged,
  label,
  testIdPrefix,
}: {
  options: ReadonlyArray<{
    value: T;
    label: string;
    icon?: React.ReactNode;
    badge?: React.ReactNode;
  }>;
  value: T;
  onValueChanged: (value: T) => void;
  label: string;
  testIdPrefix?: string;
  className?: string;
  tabClassName?: string;
}) => (
  <div role="tablist" aria-label={label}>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        role="tab"
        aria-selected={value === option.value}
        data-testid={testIdPrefix ? `${testIdPrefix}-${option.value}` : undefined}
        onClick={() => onValueChanged(option.value)}
      >
        {option.label}
        {option.badge !== undefined && option.badge !== null && <span>{option.badge}</span>}
      </button>
    ))}
  </div>
);

export const OtpInput = ({
  value,
  onChange,
  onComplete,
  errorMessage,
  'data-testid': testId,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  error?: boolean;
  errorMessage?: string;
  'data-testid'?: string;
}) => (
  <div data-testid={testId}>
    <input
      aria-label="otp-input"
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        if (e.target.value.length === 6) onComplete?.(e.target.value);
      }}
    />
    {errorMessage && <span>{errorMessage}</span>}
  </div>
);

export const CountryPhoneInput = ({
  phoneNumber,
  onPhoneChange,
  error,
  testID,
}: {
  phoneNumber: string;
  onPhoneChange: (val: string) => void;
  countryCode: string;
  onCountryChange: (code: string) => void;
  error?: string;
  testID?: string;
}) => (
  <div>
    <input
      type="tel"
      value={phoneNumber}
      onChange={(e) => onPhoneChange(e.target.value)}
      data-testid={testID}
    />
    {error && <span>{error}</span>}
  </div>
);

export const CountrySelector = () => null;
export const CountryFlag = () => null;

export const toast = { error: vi.fn(), success: vi.fn() };
export const notify = vi.fn();

export const ConfirmDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  extraActions,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  extraActions?: React.ReactNode;
}) => {
  if (!visible) return null;
  return (
    <div data-testid="confirm-dialog" role="dialog">
      <span>{title}</span>
      <span>{message}</span>
      {extraActions}
      {confirmLabel && (
        <button type="button" data-testid="confirm-dialog-confirm" onClick={onConfirm}>
          {confirmLabel}
        </button>
      )}
      <button type="button" data-testid="confirm-dialog-cancel" onClick={onCancel}>
        {cancelLabel}
      </button>
    </div>
  );
};

export const DrawerPanel = ({
  title,
  visible,
  onHide,
  topContent,
  bottomContent,
  children,
  'data-testid': testId,
}: {
  title: string;
  visible: boolean;
  onHide: () => void;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  children: React.ReactNode;
  width?: number;
  'data-testid'?: string;
}) => {
  if (!visible) return null;
  return (
    <div role="dialog" aria-modal="true" data-testid={testId ?? 'drawer-panel'}>
      <h4>{title}</h4>
      <button type="button" aria-label="common:actions.closePanel" onClick={onHide}>
        close
      </button>
      {topContent}
      {children}
      {bottomContent}
    </div>
  );
};

export const ImageUploadField = ({
  id,
  label,
  onChange,
  onRemove,
  isUploading,
  previewUrl,
  error,
}: {
  id: string;
  label: string;
  isUploading: boolean;
  previewUrl?: string;
  onChange: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  hint?: string;
  previewAlt?: string;
  error?: string;
}) => (
  <div>
    <label htmlFor={id}>{label}</label>
    <input
      id={id}
      type="file"
      data-testid={`image-upload-field-${id}`}
      disabled={isUploading}
      onChange={(e) => {
        if (e.target.files?.[0]) onChange(e.target.files[0]);
      }}
    />
    {previewUrl && !isUploading && onRemove && (
      <button type="button" onClick={onRemove} data-testid={`image-upload-remove-${id}`}>
        common:actions.remove
      </button>
    )}
    {error && <span>{error}</span>}
  </div>
);

export const OptionalImageUploadField = ({
  id,
  label,
  toggleLabel,
  onChange,
  onRemove,
  isUploading,
  previewUrl,
  error,
}: {
  id: string;
  label: string;
  toggleLabel: string;
  isUploading: boolean;
  previewUrl?: string;
  onChange: (file: File) => void;
  onRemove?: () => void;
  accept?: string;
  hint?: string;
  previewAlt?: string;
  error?: string;
  showConfirmOnToggleOff?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
}) => {
  const [isOn, setIsOn] = useState(!!previewUrl);
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={isOn}
          onChange={(e) => setIsOn(e.target.checked)}
          aria-label={toggleLabel}
        />
        {toggleLabel}
      </label>
      {isOn && (
        <div>
          <label htmlFor={id}>{label}</label>
          <input
            id={id}
            type="file"
            data-testid={`image-upload-field-${id}`}
            disabled={isUploading}
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
            }}
          />
          {previewUrl && !isUploading && onRemove && (
            <button type="button" onClick={onRemove} data-testid={`image-upload-remove-${id}`}>
              common:actions.remove
            </button>
          )}
          {error && <span>{error}</span>}
        </div>
      )}
    </div>
  );
};

export const EntityFormShell = ({
  children,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
  cancelLabel,
  submitButtonTestId,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  submitButtonTestId?: string;
}) => (
  <div>
    {children}
    <button
      type="button"
      data-testid={submitButtonTestId ?? 'form-submit'}
      onClick={onSubmit}
      disabled={isSubmitting}
    >
      {submitLabel ?? 'Save'}
    </button>
    <button type="button" onClick={onCancel} disabled={isSubmitting}>
      {cancelLabel ?? 'common:actions.cancel'}
    </button>
  </div>
);

export const FileDropZone = ({
  onFile,
  accept,
  disabled,
  fileName,
  onClear,
  'data-testid': testId,
}: {
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  hint?: string;
  fileName?: string;
  onClear?: () => void;
  'data-testid'?: string;
}) => (
  <div>
    <input
      type="file"
      accept={accept}
      disabled={disabled}
      data-testid={testId ?? 'file-drop-zone-input'}
      onChange={(e) => {
        if (e.target.files?.[0]) onFile(e.target.files[0]);
      }}
    />
    {fileName && <span>{fileName}</span>}
    {fileName && onClear && !disabled && (
      <button type="button" onClick={onClear} data-testid="file-drop-zone-clear">
        clear
      </button>
    )}
  </div>
);

export const PickerCard = ({
  title,
  onClick,
  disabled,
  'data-testid': testId,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
  isSelected?: boolean;
  badge?: string;
  className?: string;
  'data-testid'?: string;
}) => (
  <button type="button" onClick={onClick} disabled={disabled} data-testid={testId}>
    {title}
  </button>
);

export const CoverImageBanner = ({
  id,
  imageUrl,
  gradient,
  alt,
  onChange,
  onRemove,
  isUploading,
}: {
  id: string;
  imageUrl?: string | null;
  gradient?: string | null;
  alt?: string;
  onChange?: (file: File) => void;
  onRemove?: () => void;
  isUploading?: boolean;
  accept?: string;
}) => (
  <div data-testid={`cover-image-banner-${id}`}>
    <input
      id={id}
      type="file"
      data-testid={`image-upload-field-${id}`}
      disabled={isUploading}
      onChange={(e) => {
        if (e.target.files?.[0]) onChange?.(e.target.files[0]);
      }}
    />
    {imageUrl && (
      // biome-ignore lint/performance/noImgElement: mock component — Next Image adds unnecessary overhead in tests
      <img src={imageUrl} alt={alt} />
    )}
    {gradient && !imageUrl && <div data-testid={`cover-gradient-${id}`} />}
    {imageUrl && onRemove && (
      <button type="button" onClick={onRemove} data-testid={`image-upload-remove-${id}`}>
        Remove
      </button>
    )}
  </div>
);

export const GradientPickerPill = ({
  selectedGradientId,
  idPrefix,
  onGradientSelect,
  onClear,
}: {
  selectedGradientId?: string;
  hasContent?: boolean;
  onGradientSelect: (id: string) => void;
  onClear: () => void;
  idPrefix?: string;
}) => (
  <div data-testid={`${idPrefix ?? 'gradient'}-picker-pill`}>
    {selectedGradientId && <span>{selectedGradientId}</span>}
    <button
      type="button"
      onClick={() => onGradientSelect('blue')}
      data-testid={`${idPrefix}-gradient-blue`}
    >
      select gradient
    </button>
    <button type="button" onClick={onClear} data-testid={`${idPrefix}-gradient-none`}>
      clear
    </button>
  </div>
);

export const StepIndicator = ({
  steps,
  currentStep,
}: {
  steps: { label: string }[];
  currentStep: number;
}) => (
  <nav aria-label="Step indicator">
    {steps.map((s, i) => (
      <span key={s.label} aria-current={i === currentStep ? 'step' : undefined}>
        {s.label}
      </span>
    ))}
  </nav>
);

export const stepIndicatorCircleVariants = () => '';

export const CoverImagePicker = ({
  onChange,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  clubId?: string;
}) => (
  <div data-testid="cover-image-picker">
    <button type="button" onClick={() => onChange('https://cdn.example.com/img.jpg')}>
      select cover image
    </button>
  </div>
);

export const CoverPickerPanel = ({
  onImageUrlChange,
  onClear,
  idPrefix,
}: {
  imageUrl?: string;
  brandColor?: string;
  bleedPx?: number;
  uploadInputId?: string;
  onImageUrlChange: (url: string | undefined) => void;
  onClear: () => void;
  idPrefix?: string;
}) => (
  <div data-testid={`${idPrefix ?? 'cover'}-picker-panel`}>
    <button
      type="button"
      onClick={() => onImageUrlChange('gradient:blue')}
      data-testid={`${idPrefix}-gradient-blue`}
    >
      select gradient
    </button>
    <button type="button" onClick={onClear} data-testid={`${idPrefix}-clear`}>
      clear
    </button>
  </div>
);

export const ProgressBar = ({
  percent,
  'data-testid': testId,
}: {
  percent: number;
  trackClass?: string;
  heightClass?: string;
  'data-testid'?: string;
}) => (
  <div
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    data-testid={testId ?? 'progress-bar'}
  />
);

export const DetailPanel = ({
  children,
  footer,
  'data-testid': testId,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  'data-testid'?: string;
}) => (
  <div data-testid={testId}>
    {children}
    {footer}
  </div>
);

export const DetailPanelFooter = ({
  isDirty,
  unsavedLabel,
  canSave = true,
  cancelLabel,
  saveLabel,
  onCancel,
  onSave,
  saveTestId,
}: {
  isDirty?: boolean;
  unsavedLabel?: string;
  canSave?: boolean;
  cancelLabel: string;
  saveLabel: string;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveTestId?: string;
}) => (
  <div>
    {isDirty && unsavedLabel && (
      <span data-testid="sub-topic-unsaved-indicator">{unsavedLabel}</span>
    )}
    <button type="button" onClick={onCancel}>
      {cancelLabel}
    </button>
    <button type="button" onClick={onSave} disabled={!canSave} data-testid={saveTestId}>
      {saveLabel}
    </button>
  </div>
);

export const TeamSharingStep = ({
  state,
  onChange,
  teams,
}: {
  state: { selectedDeptIds: Set<string>; search: string };
  onChange: (patch: Partial<{ selectedDeptIds: Set<string>; search: string }>) => void;
  teams: Array<{ id: string; name: string }>;
  [key: string]: unknown;
}) => (
  <div data-testid="team-sharing-step">
    {teams.map((d) => (
      <button
        key={d.id}
        type="button"
        data-testid={`dept-option-${d.id}`}
        aria-pressed={state.selectedDeptIds.has(d.id)}
        onClick={() => {
          const next = new Set(state.selectedDeptIds);
          if (next.has(d.id)) next.delete(d.id);
          else next.add(d.id);
          onChange({ selectedDeptIds: next });
        }}
      >
        {d.name}
      </button>
    ))}
  </div>
);

export function defaultTeamSharingState() {
  return { selectedDeptIds: new Set<string>(), search: '' };
}

export const UrlReachabilityStatus = ({ url }: { url: string }) => (
  <span data-testid="url-reachability-status">{url}</span>
);

export const Input = ({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  'data-testid': testId,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { 'data-testid'?: string }) => (
  <input
    id={id}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    data-testid={testId}
    {...rest}
  />
);

export const inputVariants = () => '';
export const inputContainerVariants = () => '';

export const TextAreaField = ({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  description?: string;
  height?: number;
}) => (
  <div>
    {label && <label htmlFor={id}>{label}</label>}
    <textarea
      id={id}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange?.(e.target.value)}
    />
  </div>
);

export const WizardFooterActions = ({
  actions,
}: {
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: string;
    disabled?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
    testId?: string;
  }>;
}) => (
  <div>
    {actions.map((action) => (
      <button
        key={action.testId ?? action.label}
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        data-testid={action.testId}
      >
        {action.icon}
        {action.isLoading ? 'Loading...' : action.label}
      </button>
    ))}
  </div>
);

export const DrawerFooter = ({
  leading,
  onCancel,
  cancelLabel = 'Cancel',
  cancelTestId,
  extraActions = [],
  onSubmit,
  submitLabel,
  isLoading,
  disabled: _disabled,
  submitTestId,
}: {
  leading?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  cancelTestId?: string;
  extraActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    testId?: string;
  }>;
  onSubmit?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  submitTestId?: string;
  [key: string]: unknown;
}) => (
  <div>
    {leading}
    {onCancel && (
      <button type="button" onClick={onCancel} data-testid={cancelTestId}>
        {cancelLabel}
      </button>
    )}
    {extraActions.map((action) => (
      <button
        key={action.testId ?? action.label}
        type="button"
        onClick={action.onClick}
        disabled={action.disabled || action.isLoading}
        data-testid={action.testId}
      >
        {action.isLoading ? 'Loading...' : action.label}
      </button>
    ))}
    {submitLabel && onSubmit && (
      <button type="button" onClick={onSubmit} disabled={isLoading} data-testid={submitTestId}>
        {isLoading ? 'Loading...' : submitLabel}
      </button>
    )}
  </div>
);

export const WizardDrawerFooter = ({
  leading,
  actions,
}: {
  leading?: React.ReactNode;
  actions: React.ReactNode;
  className?: string;
}) => (
  <div>
    {leading}
    {actions}
  </div>
);

export const wizardDrawerFooterVariants = () => '';

export const CreditCostFooter = ({
  label,
  costText,
  isLoading,
  onToggleBreakdown,
  testId,
}: {
  label: string;
  costText?: React.ReactNode | null;
  unavailableText?: React.ReactNode;
  isLoading: boolean;
  isBreakdownOpen?: boolean;
  onToggleBreakdown: () => void;
  breakdownContent?: React.ReactNode;
  testId?: string;
}) => (
  <div data-testid={testId ?? 'credit-cost-footer'}>
    <span>{label}</span>
    {isLoading ? <span>Loading...</span> : costText && <span>{costText}</span>}
    <button type="button" onClick={onToggleBreakdown}>
      toggle
    </button>
  </div>
);

export const creditCostFooterPopoverVariants = () => '';

export const MasterDetailEditPanel = ({
  children,
  title,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  isDirty?: boolean;
  unsavedLabel?: string;
  footer?: React.ReactNode;
  'data-testid'?: string;
}) => (
  <div data-testid="master-detail-edit-panel">
    {title && <h3>{title}</h3>}
    {children}
  </div>
);

export const MasterDetailReviewPanel = <TItem,>({
  items,
  getItemId: _getItemId,
  renderItem,
  title,
}: {
  items: readonly TItem[];
  getItemId: (item: TItem) => string;
  renderItem: (args: { item: TItem; isSelected: boolean; onSelect: () => void }) => React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  selectedId?: string | null;
  onSelectItem?: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  'data-testid'?: string;
}) => (
  <div data-testid="master-detail-review-panel">
    <div>{title}</div>
    {items.map((item) => renderItem({ item, isSelected: false, onSelect: () => {} }))}
  </div>
);

export const GenerationProgress = ({
  children,
  statusMessage,
  progressPercent,
  showProgress,
  progressLabel,
}: {
  children?: React.ReactNode;
  statusMessage: string;
  progressPercent: number;
  showProgress: boolean;
  progressLabel: string;
}) => (
  <div data-testid="generate-progress">
    <span>{statusMessage}</span>
    {children}
    {showProgress && (
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progressLabel}
      />
    )}
  </div>
);

export const RichTextEditor = ({
  editorKey,
  defaultValue,
  onValueChanged,
  disabled,
  placeholder,
  'data-testid': testId,
}: {
  editorKey?: string;
  defaultValue?: string;
  onValueChanged?: (e: { value?: string }) => void;
  height?: number;
  disabled?: boolean;
  placeholder?: string;
  'data-testid'?: string;
}) => (
  <textarea
    data-testid={testId ?? `rich-text-editor-${editorKey ?? 'default'}`}
    defaultValue={defaultValue}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(e) => onValueChanged?.({ value: e.target.value })}
  />
);
