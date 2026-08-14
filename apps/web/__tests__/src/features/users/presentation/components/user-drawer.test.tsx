import { UserDrawer } from '@features/users/presentation/components/user-drawer';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationMethod } from '@/proxy/models';
import { makeUserRecord } from '@/test/factories/user.factory';

// ─── react-hook-form stub ────────────────────────────────────────────────────
// `mockAuthMethod` lets each test drive `watch('authMethod')` without
// needing the real form state machine.

const mockAuthMethod = vi.hoisted(() => ({ value: 'Credentials' as string }));

vi.mock('react-hook-form', () => ({
  Controller: ({
    render: renderFn,
  }: {
    render: (props: {
      field: {
        value: string;
        onChange: ReturnType<typeof vi.fn>;
        onBlur: ReturnType<typeof vi.fn>;
        ref: ReturnType<typeof vi.fn>;
      };
      fieldState: { error: undefined; isDirty: boolean; isTouched: boolean };
    }) => React.ReactNode;
  }) =>
    renderFn({
      field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() },
      fieldState: { error: undefined, isDirty: false, isTouched: false },
    }),
  useForm: () => ({
    control: {},
    handleSubmit: (fn: (data: unknown) => void) => (e: React.FormEvent) => {
      e?.preventDefault?.();
      fn({});
    },
    watch: (name?: string) => {
      if (name === 'authMethod') return mockAuthMethod.value;
      return '';
    },
    reset: vi.fn(),
    setValue: vi.fn(),
    clearErrors: vi.fn(),
    formState: { errors: {}, isValid: true, touchedFields: {} },
  }),
}));

vi.mock('@lib/firebase/config', () => ({
  firebaseApp: { name: '[DEFAULT]', options: {}, automaticDataCollectionEnabled: false },
  firebaseAuth: { currentUser: null },
}));

vi.mock('devextreme/ui/dialog', () => ({ confirm: vi.fn() }));

vi.mock('devextreme-react/button', () => ({
  default: ({ text, onClick }: { text?: string; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {text}
    </button>
  ),
}));

vi.mock('devextreme-react/text-box', () => ({
  default: ({
    value,
    onValueChanged,
    inputAttr,
    onFocusOut,
    disabled,
  }: {
    value?: string;
    onValueChanged?: (e: { value: string; previousValue?: string }) => void;
    inputAttr?: Record<string, string>;
    onFocusOut?: () => void;
    disabled?: boolean;
  }) => (
    <input
      id={inputAttr?.id}
      aria-label={inputAttr?.['aria-label']}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onValueChanged?.({ value: e.target.value, previousValue: value ?? '' })}
      onBlur={onFocusOut}
    />
  ),
}));

vi.mock('devextreme-react/number-box', () => ({
  default: ({
    value,
    onValueChanged,
    inputAttr,
  }: {
    value?: number | null;
    onValueChanged?: (e: { value: number | null }) => void;
    inputAttr?: Record<string, string>;
  }) => (
    <input
      type="number"
      id={inputAttr?.id}
      value={value ?? ''}
      onChange={(e) => onValueChanged?.({ value: e.target.value ? Number(e.target.value) : null })}
    />
  ),
}));

vi.mock('devextreme-react/select-box', () => ({
  default: ({
    value,
    onValueChanged,
    inputAttr,
    disabled,
    minSearchLength,
  }: {
    value?: string | null;
    onValueChanged?: (e: { value: string | null }) => void;
    inputAttr?: Record<string, string>;
    disabled?: boolean;
    minSearchLength?: number;
  }) => (
    <input
      data-testid={inputAttr?.id ?? 'select-box'}
      data-min-search-length={minSearchLength}
      aria-label={inputAttr?.['aria-label']}
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => onValueChanged?.({ value: e.target.value || null })}
    />
  ),
}));

vi.mock('devextreme-react/switch', () => ({
  default: ({
    value,
    onValueChanged,
    elementAttr,
  }: {
    value?: boolean;
    onValueChanged?: (e: { value: boolean }) => void;
    elementAttr?: Record<string, unknown>;
  }) => (
    <input
      type="checkbox"
      role="switch"
      aria-checked={value ?? false}
      data-testid={(elementAttr?.['data-testid'] as string) ?? 'domain-override-switch'}
      checked={value ?? false}
      onChange={(e) => onValueChanged?.({ value: e.target.checked })}
    />
  ),
}));

// ─── Shared UI stubs ─────────────────────────────────────────────────────────

vi.mock('@/components/ui', () => ({
  DrawerPanel: ({
    title,
    subtitle,
    visible,
    onHide,
    children,
  }: {
    title: React.ReactNode;
    subtitle?: string;
    visible: boolean;
    onHide: () => void;
    children: React.ReactNode;
  }) => {
    if (!visible) return null;
    return (
      <div role="dialog" data-testid="drawer-panel">
        <h4>{title}</h4>
        {subtitle && <p data-testid="drawer-subtitle">{subtitle}</p>}
        <button type="button" onClick={onHide}>
          close
        </button>
        {children}
      </div>
    );
  },
  EntityFormShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="entity-form-shell">{children}</div>
  ),
  CollapsibleSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({
    label,
    children,
    error,
    htmlFor,
  }: {
    label: string;
    htmlFor?: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <span>{error}</span>}
    </div>
  ),
  StatusBadge: ({ label }: { label: string }) => <span>{label}</span>,
  CountryPhoneInput: ({
    phoneNumber,
    onPhoneChange,
    htmlFor,
    error,
  }: {
    phoneNumber: string;
    onPhoneChange: (val: string) => void;
    htmlFor?: string;
    error?: string;
  }) => (
    <div>
      <input
        id={htmlFor ?? 'phone-number'}
        value={phoneNumber}
        onChange={(e) => onPhoneChange(e.target.value)}
      />
      {error && <span>{error}</span>}
    </div>
  ),
  GoogleBrandIcon: () => <span data-testid="google-icon" />,
  MicrosoftBrandIcon: () => <span data-testid="microsoft-icon" />,
  Typography: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...rest}>{children}</button>
  ),
  ConfirmDialog: ({
    visible,
    onConfirm,
    onCancel,
  }: {
    visible: boolean;
    title?: string;
    message?: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) =>
    visible ? (
      <div role="alertdialog">
        <button type="button" onClick={onConfirm}>
          confirm
        </button>
        <button type="button" onClick={onCancel}>
          cancel
        </button>
      </div>
    ) : null,
  DrawerFooter: ({
    onCancel,
    cancelLabel = 'Cancel',
    cancelTestId,
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
    onSubmit?: () => void;
    submitLabel?: string;
    isLoading?: boolean;
    disabled?: boolean;
    submitTestId?: string;
    [key: string]: unknown;
  }) => (
    <div>
      {onCancel && (
        <button type="button" onClick={onCancel} data-testid={cancelTestId}>
          {cancelLabel}
        </button>
      )}
      {submitLabel && onSubmit && (
        <button type="button" onClick={onSubmit} disabled={isLoading} data-testid={submitTestId}>
          {isLoading ? 'Loading...' : submitLabel}
        </button>
      )}
    </div>
  ),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@lib/i18n', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@starterkit/shared', async (importOriginal) => {
  const { CUSTOM_AUTH_EMAIL_DOMAIN } = await importOriginal<typeof import('@starterkit/shared')>();
  return {
    getFullName: (f: string, l: string) => `${f} ${l}`.trim(),
    splitName: (n: string) => {
      const [firstName = '', ...rest] = (n ?? '').split(' ');
      return { firstName, lastName: rest.join(' ') };
    },
    iconSize: { xs: 12, sm: 16, md: 20, lg: 24 },
    cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
    defaultFirebaseConfig: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
    },
    CUSTOM_AUTH_EMAIL_DOMAIN,
    DEFAULT_PHONE_COUNTRY: 'ZA',
    getPhoneCountries: () => [{ code: 'ZA', dialCode: '+27', name: 'South Africa' }],
    getCountryName: (code: string) => code,
    JERSEY_NUMBER_MIN: 0,
    JERSEY_NUMBER_MAX: 99,
  };
});

vi.mock('@starterkit/icons', () => ({
  EmailIcon: () => <span data-testid="email-icon" />,
  PhoneIcon: () => <span data-testid="phone-icon" />,
}));

vi.mock('@lib/http', () => ({ ApiError: class ApiError extends Error {} }));
vi.mock('@lib/ui-config', () => ({
  uiConfig: {
    toast: { durationMs: 3000 },
    selectSearch: { searchTimeout: 300, minSearchLength: 0 },
    popup: { defaultWidth: 520, largeWidth: 640 },
    accordion: { animationDurationMs: 200 },
  },
}));

vi.mock('@hookform/resolvers/standard-schema', () => ({
  standardSchemaResolver: () => async (values: unknown) => ({ values, errors: {} }),
}));

vi.mock('@features/users/presentation/utils/add-user-schema', () => ({
  createAddUserSchema: () => ({}),
  PHONE_REQUIRED_ROLES: ['Coach', 'Parent', 'Director', 'ClubAdmin'],
}));

vi.mock('@features/users/presentation/utils/email-domain', () => ({
  buildEmail: (username: string, domain: string) => `${username}@${domain}`,
  extractUsername: (email: string) => email.split('@')[0] ?? '',
}));

// ─── Hook mocks ───────────────────────────────────────────────────────────────

vi.mock('@/store/auth-store', () => ({
  useAuthStore: (sel: (s: { user: { email: string } | null }) => unknown) =>
    sel({ user: { email: 'admin@acme.co' } }),
}));

vi.mock('@features/users/presentation/hooks/use-create-user', () => ({
  useCreateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-update-user', () => ({
  useUpdateUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-delete-user', () => ({
  useDeleteUser: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-set-user-active', () => ({
  useSetUserActive: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-link-user-to-club', () => ({
  useLinkUserToClub: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-remove-avatar', () => ({
  useRemoveAvatar: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@features/users/presentation/hooks/use-roles', () => ({
  useRoles: () => ({ data: [] }),
}));

vi.mock('@features/users/presentation/hooks/use-user-defaults', () => ({
  useUserDefaults: () => ({ data: undefined }),
}));

vi.mock('@features/users/presentation/hooks/use-user-details', () => ({
  useUserDetails: () => ({ data: undefined }),
}));

vi.mock('@/lib/hooks', () => ({
  useTeamSelectStore: () => ({
    dataSource: [],
    isLoading: false,
  }),
  useAthleteSelectStore: () => ({
    dataSource: [],
    isLoading: false,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const baseProps = {
  visible: true,
  onHide: vi.fn(),
  defaultClubId: 'club-1',
};

beforeEach(() => {
  mockAuthMethod.value = AuthenticationMethod.Credentials;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UserDrawer', () => {
  describe('subtitle (club name)', () => {
    it('shows club name as subtitle when in add mode', () => {
      render(<UserDrawer {...baseProps} defaultClubName="Acme Corp" />);
      expect(screen.getByTestId('drawer-subtitle')).toHaveTextContent('Acme Corp');
    });

    it('does not show subtitle in edit mode', () => {
      const editUser = makeUserRecord({
        id: 'u-1',
        clubId: 'club-1',
        email: 'user@acme.co',
        displayName: 'John Doe',
        createdAt: '2024-01-01T00:00:00Z',
      });
      render(<UserDrawer {...baseProps} defaultClubName="Acme Corp" editUser={editUser} />);
      expect(screen.queryByTestId('drawer-subtitle')).not.toBeInTheDocument();
    });

    it('shows no subtitle when defaultClubName is not provided', () => {
      render(<UserDrawer {...baseProps} />);
      expect(screen.queryByTestId('drawer-subtitle')).not.toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('renders the drawer when visible', () => {
      render(<UserDrawer {...baseProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<UserDrawer {...baseProps} visible={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('phone number field', () => {
    it('renders the phone number field in create mode regardless of auth method', () => {
      render(<UserDrawer {...baseProps} />);
      expect(document.querySelector('#user-phone')).toBeInTheDocument();
    });
  });

  describe('team selector', () => {
    it('loads team options as soon as the dropdown opens', () => {
      render(<UserDrawer {...baseProps} />);
      expect(screen.getByTestId('user-team')).toHaveAttribute('data-min-search-length', '0');
    });
  });
});
