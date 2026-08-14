import { View } from 'react-native';
import { AnchoredFooter } from './anchored-footer';
import { Button } from './button';

export interface WizardFooterProps {
  backLabel?: string;
  backTestId?: string;
  showBack: boolean;
  onBack: () => void;
  primaryLabel: string;
  primaryTestId?: string;
  isSubmitting: boolean;
  /** Disables the primary button, e.g. while a required field for the active step is unset. */
  primaryDisabled?: boolean;
  onSubmit: () => void;
  paddingBottom: number;
}

/**
 * A wizard step's Back/Continue pair, in the shared `AnchoredFooter` panel — rendered outside
 * the step's scrollable content so it stays pinned to the bottom of the screen however long the
 * active step's form is. `auth` size is the design system's tall pill control geometry, shared
 * with the fields above rather than a one-off height here.
 *
 * Originally the onboarding wizard's own component; promoted here once the Assign Homework
 * screen's two-step flow needed the identical shape — same conditional Back button,
 * same primary button, just with `primaryDisabled` added for a step whose required field isn't
 * filled in yet, which onboarding's own steps never needed.
 */
export function WizardFooter({
  backLabel,
  backTestId,
  showBack,
  onBack,
  primaryLabel,
  primaryTestId,
  isSubmitting,
  primaryDisabled,
  onSubmit,
  paddingBottom,
}: WizardFooterProps) {
  return (
    <AnchoredFooter paddingBottom={paddingBottom}>
      {/* Both buttons sit in flex-1 wrappers rather than taking `flex-1`
          themselves — Button's outer animated wrapper is what the row lays
          out, and it only ever sizes to its content. With one child the
          wrapper still fills the row, so a single-button step is unchanged. */}
      {showBack && backLabel && (
        <View className="flex-1">
          <Button variant="brandDark" size="auth" onPress={onBack} fullWidth testID={backTestId}>
            {backLabel}
          </Button>
        </View>
      )}

      <View className="flex-1">
        <Button
          size="auth"
          onPress={onSubmit}
          loading={isSubmitting}
          disabled={primaryDisabled}
          fullWidth
          testID={primaryTestId}
        >
          {primaryLabel}
        </Button>
      </View>
    </AnchoredFooter>
  );
}
