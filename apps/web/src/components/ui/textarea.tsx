'use client';

import { cn } from '@starterkit/shared';
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { inputContainerVariants, inputVariants } from './input';

// ─── Props ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Class name applied to the wrapping container. */
  containerClassName?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

/** Multi-line counterpart to `Input` — same container/focus styling, sized by `rows`. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, disabled, ...props }, ref) => {
    return (
      <div
        className={cn(inputContainerVariants({ disabled }), 'items-stretch', containerClassName)}
      >
        <textarea
          ref={ref}
          disabled={disabled}
          className={cn(inputVariants(), 'resize-none', className)}
          {...props}
        />
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
