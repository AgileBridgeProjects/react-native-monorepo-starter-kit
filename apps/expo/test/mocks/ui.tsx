/**
 * Shared, interaction-wired mock for the `@/components/ui` barrel.
 *
 * Use in a test file to override the lightweight global mock from `test/setup.ts`
 * with components that actually forward handlers and render host elements:
 *
 *   vi.mock('@/components/ui', async () => (await import('@/test/mocks/ui')).makeUiMock());
 *
 * Pass overrides to tweak-spot a single component for one file:
 *
 *   vi.mock('@/components/ui', async () => {
 *     const { makeUiMock } = await import('@/test/mocks/ui');
 *     return makeUiMock({ Avatar: ({ initials }) => React.createElement('Text', null, initials) });
 *   });
 *
 * Form inputs (`FormField`, `PhoneInput`, `OtpInput`) are wired through the real
 * react-hook-form `Controller`/callbacks so submit + validation logic is exercised.
 */
import * as ReactNS from 'react';
import { Controller } from 'react-hook-form';
import { useFieldRequirementLabel } from '@/components/ui/field-requirement-hint';

const React = (ReactNS as { default?: typeof ReactNS }).default ?? ReactNS;
// biome-ignore lint/suspicious/noExplicitAny: test mocks render RN host string elements
const h = React.createElement as (...args: any[]) => any;
// biome-ignore lint/suspicious/noExplicitAny: mock components accept arbitrary screen props
type AnyProps = Record<string, any>;

/**
 * A react-hook-form `Controller`-wired `TextInput`, so submit + validation logic runs.
 * Shared by `makeUiMock().FormField` and any per-file field mock (e.g. PasswordField):
 *
 *   vi.mock('.../password-field', async () => {
 *     const { controllerField } = await import('@/test/mocks/ui');
 *     return { PasswordField: ({ control, name }) =>
 *       controllerField(control, name, { testID: `setup-${name}-input` }) };
 *   });
 */
export function controllerField(
  control: unknown,
  name: string,
  extra: Record<string, unknown> = {},
) {
  return h(Controller, {
    control,
    name,
    render: ({ field }: AnyProps) =>
      h('TextInput', {
        value: field.value,
        onChangeText: field.onChange,
        onBlur: field.onBlur,
        ...extra,
      }),
  });
}

export function makeUiMock(overrides: Record<string, unknown> = {}) {
  return {
    // Real value, not a mocked component — consumers compute a pixel cap from it
    // (`windowHeight * BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO`), so it must resolve to a number.
    BOTTOM_SHEET_BODY_MAX_HEIGHT_RATIO: 0.6,
    Typography: ({ children, ...rest }: AnyProps) => h('Text', rest, children),
    Button: ({ children, onPress, testID, disabled }: AnyProps) =>
      h(
        'Pressable',
        {
          testID,
          onPress: disabled ? undefined : onPress,
          accessibilityState: { disabled: !!disabled },
        },
        h('Text', null, children),
      ),
    Alert: ({ message, variant, onDismiss, testID }: AnyProps) =>
      message
        ? h(
            'Pressable',
            { testID: testID ?? `alert-${variant}`, onPress: onDismiss },
            h('Text', null, message),
          )
        : null,
    // `onFocus`/`onBlur` are wired through — focus arms behaviour on some
    // screens, not just a border colour. Mirrors the mock in `test/setup.ts`.
    Input: ({
      value,
      onChangeText,
      onFocus,
      onBlur,
      placeholder,
      testID,
      accessibilityLabel,
    }: AnyProps) =>
      h('TextInput', {
        value,
        onChangeText,
        onFocus,
        onBlur,
        placeholder,
        testID,
        accessibilityLabel,
      }),
    // Renders the label (and its requirement marker) as well as the wired input, so consumer
    // tests can assert how a field is labelled, not just that it exists.
    FormField: ({ control, name, testID, placeholder, label, requirement }: AnyProps) =>
      label
        ? h(
            'View',
            null,
            h('Text', null, label, requirement ? h('Text', null, requirement) : null),
            controllerField(control, name, { testID, placeholder }),
          )
        : controllerField(control, name, { testID, placeholder }),
    // Placeholder doubles as the label (no separate label line). Renders the requirement marker
    // through the real `useFieldRequirementLabel` (translated, e.g. "Optional") rather than the
    // raw prop value — this is the one field row real forms actually mount, so its marker text
    // needs to match what `CalendarEventCreateScreen`-style tests assert on screen.
    SettingsTextRow: ({
      control,
      name,
      testID,
      placeholder,
      requirement,
      accessibilityLabel,
    }: AnyProps) => {
      const requirementLabel = useFieldRequirementLabel(requirement);
      return h(
        'View',
        null,
        h('Text', null, placeholder, requirementLabel ? h('Text', null, requirementLabel) : null),
        controllerField(control, name, { testID, placeholder, accessibilityLabel }),
      );
    },
    // Zero-footprint mount point in the real component; tests only care about the children.
    BottomSheetSlot: ({ children }: AnyProps) => children ?? null,
    PhoneInput: ({ value, onChangeText, onBlur, testID, errorMessage }: AnyProps) =>
      h('TextInput', { value, onChangeText, onBlur, testID, accessibilityLabel: errorMessage }),
    OtpInput: ({ value, onChange, onComplete, testID, errorMessage }: AnyProps) =>
      h('TextInput', {
        testID,
        value,
        onChangeText: onChange,
        onSubmitEditing: onComplete,
        accessibilityLabel: errorMessage,
      }),
    Icon: () => null,
    IconSymbol: () => null,
    // Renders its testID: callers hang list-row and empty-state testIDs off the circle.
    IconCircle: ({ testID }: AnyProps) => h('View', { testID }),
    GradientBackground: ({ children, testID, className }: AnyProps) =>
      h('View', { testID, className }, children),
    Card: ({ children, testID, className }: AnyProps) => h('View', { testID, className }, children),
    BottomSheet: ({ children, visible, title, footer, testID }: AnyProps) =>
      visible
        ? h('View', { testID }, [
            h('Text', { key: 'title' }, title),
            h('View', { key: 'body' }, children),
            footer ? h('View', { key: 'footer' }, footer) : null,
          ])
        : null,
    SettingsGroup: ({ children, testID, header, footer }: AnyProps) =>
      h('View', { testID }, [
        header ? h('Text', { key: 'header' }, header) : null,
        h('View', { key: 'rows' }, children),
        footer ? h('Text', { key: 'footer' }, footer) : null,
      ]),
    SettingsRow: ({ children, label, onPress, testID, disabled }: AnyProps) =>
      h(onPress ? 'Pressable' : 'View', { onPress, testID, accessibilityState: { disabled } }, [
        h('Text', { key: 'label' }, label),
        children ?? null,
      ]),
    Skeleton: ({ testID }: AnyProps) => h('View', { testID }),
    Spacer: () => h('View', null),
    BackButton: ({ onPress, testID, label }: AnyProps) =>
      h('Pressable', { onPress, testID }, h('Text', null, label)),
    ProgressBar: ({ testID, value }: AnyProps) =>
      h('View', { testID, accessibilityValue: { now: value } }),
    PageScrollView: ({ children, testID, title }: AnyProps) =>
      h('View', { testID }, title ? h('Text', null, title) : null, children),
    PrimaryScreenLayout: ({ children, testID }: AnyProps) => h('View', { testID }, children),
    KeyboardDismissView: ({ children }: AnyProps) => h(React.Fragment, null, children),
    AnchoredFooter: ({ children, testID }: AnyProps) => h('View', { testID }, children),
    // `requirement` renders as its raw value ('required'/'optional') rather than the translated
    // word, so consumer tests can assert a field is marked without depending on the `common`
    // namespace being wired up in that file's i18n mock.
    FieldRequirementHint: ({ requirement }: AnyProps) =>
      requirement ? h('Text', null, requirement) : null,
    PillFieldLabel: ({ children, requirement }: AnyProps) =>
      h('Text', null, children, requirement ? h('Text', null, requirement) : null),
    PillInput: ({
      label,
      requirement,
      value,
      onChangeText,
      onBlur,
      testID,
      placeholder,
    }: AnyProps) =>
      h(
        'View',
        null,
        label ? h('Text', null, label, requirement ? h('Text', null, requirement) : null) : null,
        h('TextInput', { value, onChangeText, onBlur, testID, placeholder }),
      ),
    // Mirrors the real control's accessibilityRole/State so consumers can assert which option
    // is selected and fire presses exactly as they would against the component itself.
    SingleSelectPillGroup: ({ options, value, onChange, getTestId }: AnyProps) =>
      h(
        'View',
        null,
        (options ?? []).map((option: AnyProps) =>
          h(
            'Pressable',
            {
              key: option.value,
              testID: getTestId?.(option.value),
              accessibilityRole: 'radio',
              accessibilityState: { selected: option.value === value },
              accessibilityLabel: option.label,
              onPress: () => onChange?.(option.value),
            },
            h('Text', null, option.label),
          ),
        ),
      ),
    InfoBanner: ({ testID, message }: AnyProps) =>
      h('View', { testID }, message ? h('Text', null, message) : null),
    StatusChip: ({ label, testID }: AnyProps) => h('View', { testID }, h('Text', null, label)),
    Avatar: ({ initials, testID }: AnyProps) => h('View', { testID }, h('Text', null, initials)),
    DownloadStateButton: ({ testID }: AnyProps) => h('View', { testID }),
    ImageWithFallback: ({ testID }: AnyProps) => h('View', { testID }),
    CategoryFilter: ({ testID }: AnyProps) => h('View', { testID }),
    // Mirrors FilterChip's real markup (accessibilityRole/accessibilityState) so consumer
    // tests can assert selection and fire presses the same way they would against the
    // real component.
    FilterChipRow: ({ items, selectedId, onSelect, testID, getItemTestId }: AnyProps) =>
      h(
        'View',
        { testID },
        (items ?? []).map((item: AnyProps) =>
          h(
            'Pressable',
            {
              key: item.id,
              testID: getItemTestId?.(item.id),
              accessibilityRole: 'button',
              accessibilityState: { selected: item.id === selectedId },
              onPress: () => onSelect(item.id),
            },
            h('Text', null, item.label),
          ),
        ),
      ),
    // State machine mirroring the real AsyncStateView precedence.
    AsyncStateView: ({
      data,
      isLoading,
      isError,
      isEmpty,
      loadingView,
      errorTitle,
      errorActionLabel,
      onErrorAction,
      emptyTitle,
      renderContent,
    }: AnyProps) => {
      if (isLoading) return loadingView ?? h('View', { testID: 'async-loading' });
      if (isError)
        return h(
          'View',
          { testID: 'async-error' },
          errorTitle ? h('Text', null, errorTitle) : null,
          errorActionLabel
            ? h(
                'Pressable',
                { testID: 'async-error-action', onPress: onErrorAction },
                h('Text', null, errorActionLabel),
              )
            : null,
        );
      if (isEmpty) return h('Text', { testID: 'async-empty' }, emptyTitle);
      if (data != null) return renderContent(data);
      return null;
    },
    // Renders the header + an item per row, keyed defensively across entity shapes.
    ResponsiveGrid: ({ data, renderItem, ListHeaderComponent }: AnyProps) =>
      h(
        'View',
        null,
        ListHeaderComponent ?? null,
        ...(data ?? []).map((item: AnyProps, index: number) =>
          h(
            React.Fragment,
            { key: item?.id ?? item?.clubId ?? index },
            renderItem({ item, index }),
          ),
        ),
      ),
    ...overrides,
  };
}
