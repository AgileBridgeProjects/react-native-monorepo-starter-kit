import { Fragment } from 'react';
import { View } from 'react-native';
import { iconSize, palette } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { Icon } from './icon';
import { Typography } from './typography';

/** Circle diameter — also positions the connectors on the circles' centre line. */
const CIRCLE_SIZE = 27;

export interface StepperProps {
  /** 1-indexed current step. */
  currentStep: number;
  /** Total number of steps in the flow. */
  totalSteps: number;
  /** Opt-in step title beneath each circle — off by default. */
  showStepLabels?: boolean;
  /** Formats the label under a circle when `showStepLabels` is set. Defaults to "Step N". */
  getStepLabel?: (step: number) => string;
  testID?: string;
}

/**
 * Multi-step progress header — a circle per step (holding the step number, or a
 * tick once complete) joined by connectors spanning the full width. The
 * current step outlines in blue with a blue number; a completed step fills
 * blue with a white tick and its trailing connector turns blue too; everything
 * still to come stays grey. Purely presentational; the caller owns the count.
 */
export function Stepper({
  currentStep,
  totalSteps,
  showStepLabels = false,
  getStepLabel = (step) => `Step ${step}`,
  testID,
}: StepperProps) {
  return (
    <View className="flex-row items-start justify-center px-lg" testID={testID}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const step = index + 1;
        const isComplete = step < currentStep;
        const isActive = step === currentStep;

        const circleContent = isComplete ? (
          <Icon name="checkmark" size={iconSize.xs} color={palette.white.DEFAULT} />
        ) : (
          <Typography
            variant="caption"
            className={cn(
              'font-body-semibold text-xs',
              isActive ? 'text-primary' : 'text-white/40',
            )}
          >
            {step}
          </Typography>
        );

        return (
          <Fragment key={step}>
            <View className="items-center gap-xs">
              <View
                style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
                className={cn(
                  'items-center justify-center rounded-full border',
                  isComplete && 'border-primary bg-primary',
                  isActive && 'border-primary bg-brand-blue-card-dark',
                  !isComplete && !isActive && 'border-white/20',
                )}
              >
                {circleContent}
              </View>
              {showStepLabels && (
                <Typography
                  variant="caption"
                  className={cn(
                    'font-heading text-sm uppercase tracking-wide text-white',
                    !isActive && !isComplete && 'text-white/40',
                  )}
                >
                  {getStepLabel(step)}
                </Typography>
              )}
            </View>

            {/* Offset by half a circle so the connector sits on the circles'
                centre line — without it the row centres on the taller
                circle+label column and the line drops down by the labels.
                `flex-1` spans the full row width, matching the reference —
                a fixed width bunched every step into the centre instead of
                spreading them out. */}
            {step < totalSteps && (
              <View
                style={{ marginTop: CIRCLE_SIZE / 2 }}
                className={cn('mx-xs flex-1', isComplete ? 'h-0.5 bg-primary' : 'h-px bg-white/20')}
              />
            )}
          </Fragment>
        );
      })}
    </View>
  );
}
