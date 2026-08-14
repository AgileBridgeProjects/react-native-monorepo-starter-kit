'use client';

import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "ZA". */
  code: string;
  className?: string;
}

type FlagMap = Record<string, ((props: { className?: string }) => React.JSX.Element) | undefined>;

export function CountryFlag({ code, className }: CountryFlagProps) {
  const Flag = (Flags as FlagMap)[code.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={className} />;
}
