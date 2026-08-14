import type { ReactNode } from 'react';

interface SocialSignInButtonProps {
  children: ReactNode;
  /** Visible label text next to the icon. */
  label?: string;
  'aria-label': string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

/**
 * Pill-shaped social sign-in button matching the mobile app style.
 * Renders as flex-1 inside a flex-row parent so all buttons share equal width.
 */
export function SocialSignInButton({
  children,
  label,
  'aria-label': ariaLabel,
  onClick,
  loading = false,
  disabled = false,
  'data-testid': testId,
}: SocialSignInButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={loading}
      data-testid={testId}
      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-input text-sm font-medium text-input-text transition-colors hover:bg-input-hover active:opacity-70 disabled:opacity-50"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">{children}</span>
      {label && <span>{label}</span>}
    </button>
  );
}
