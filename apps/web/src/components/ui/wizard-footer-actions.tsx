'use client';

import { cn } from '@starterkit/shared';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from './button';
import { Tooltip } from './donut-tooltip';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface WizardFooterAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  isLoading?: boolean;
  disabled?: boolean;
  /** Tooltip shown when the button is disabled. Requires a wrapper span for hover detection. */
  tooltip?: string;
  icon?: ReactNode;
  className?: string;
  testId?: string;
}

export interface WizardFooterActionsProps {
  actions: WizardFooterAction[];
  className?: string;
  wrap?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function WizardFooterActions({
  actions,
  className,
  wrap = false,
}: WizardFooterActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-sm',
        wrap && 'flex-wrap',
        !wrap && 'shrink-0',
        className,
      )}
    >
      {actions.map((action) => {
        const button = (
          <Button
            key={action.testId ?? action.label}
            type="button"
            variant={action.variant}
            size={action.size}
            onClick={action.onClick}
            isLoading={action.isLoading}
            disabled={action.disabled}
            className={action.className}
            data-testid={action.testId}
          >
            {action.icon}
            {action.label}
          </Button>
        );

        if (action.disabled && action.tooltip) {
          return (
            <span
              key={action.testId ?? action.label}
              className="group/tooltip relative inline-flex"
            >
              {button}
              <Tooltip>{action.tooltip}</Tooltip>
            </span>
          );
        }

        return button;
      })}
    </div>
  );
}
