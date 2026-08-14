'use client';

import { useTranslation } from '@lib/i18n';
import { CheckmarkIcon } from '@starterkit/icons';
import { cn, iconSize } from '@starterkit/shared';
import { cva } from 'class-variance-authority';
import { Fragment } from 'react';
import { Typography } from './typography';

// ─── Variants ───────────────────────────────────────────────────────────────

export const stepIndicatorCircleVariants = cva(
  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300',
  {
    variants: {
      state: {
        active: 'bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/20',
        /* Success is a bright on-dark green — white over it is ~2:1, onyx ~10:1. */
        completed: 'bg-success text-primary-foreground',
        pending: 'border-2 border-border bg-background text-text-muted',
      },
    },
    defaultVariants: { state: 'pending' },
  },
);

// ─── Props ─────────────────────────────────────────────────────────────────

export interface StepIndicatorStep {
  id?: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: StepIndicatorStep[];
  currentStep: number;
  className?: string;
  /** Unused — kept for API compatibility. */
  connectorClassName?: string;
  ariaLabel?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function StepIndicator({ steps, currentStep, className, ariaLabel }: StepIndicatorProps) {
  const { t } = useTranslation();
  const safeStep =
    steps.length === 0 ? 0 : Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));
  const resolvedAriaLabel = ariaLabel ?? t('common:stepIndicator.progressSteps');

  return (
    <nav
      aria-label={resolvedAriaLabel}
      className={cn('border-b border-border px-lg py-md', className)}
    >
      <ol className="flex items-start">
        {steps.map((step, index) => {
          const isActive = index === safeStep;
          const isCompleted = index < safeStep;
          let state: 'active' | 'completed' | 'pending' = 'pending';
          if (isActive) {
            state = 'active';
          }
          if (isCompleted) {
            state = 'completed';
          }
          const stepKey = step.id ?? `${index}-${step.label}`;
          let connectorClassName = 'bg-border';
          if (index <= safeStep) {
            connectorClassName = 'bg-success';
          }
          let labelClassName = 'text-text-muted';
          if (isCompleted || isActive) {
            labelClassName = 'text-text';
          }
          if (isActive) {
            labelClassName = 'font-semibold text-text';
          }

          return (
            <Fragment key={stepKey}>
              {/* Connector bar between steps, vertically centred with the circle */}
              {index > 0 && (
                <li aria-hidden="true" className="mt-4 flex flex-1 list-none items-center">
                  <div
                    className={cn(
                      'h-0.5 w-full rounded-full transition-colors duration-300',
                      connectorClassName,
                    )}
                  />
                </li>
              )}

              <li
                aria-current={isActive ? 'step' : undefined}
                className="flex w-14 shrink-0 flex-col items-center gap-1.5"
              >
                <div className={stepIndicatorCircleVariants({ state })}>
                  {isCompleted && <CheckmarkIcon size={iconSize.xs} aria-hidden="true" />}
                  {!isCompleted && <span aria-hidden="true">{index + 1}</span>}
                </div>
                <Typography
                  variant="caption"
                  as="span"
                  className={cn('text-center leading-tight', labelClassName)}
                >
                  {step.label}
                  {isActive && (
                    <span className="sr-only"> {t('common:stepIndicator.currentStep')}</span>
                  )}
                  {isCompleted && (
                    <span className="sr-only"> {t('common:stepIndicator.completed')}</span>
                  )}
                </Typography>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
