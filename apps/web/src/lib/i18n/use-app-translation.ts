'use client';

import type { Namespace, TOptions } from 'i18next';
import { useCallback } from 'react';
import { useTranslation as useI18NextTranslation } from 'react-i18next';

export function useTranslation(ns?: Namespace) {
  const translation = useI18NextTranslation(ns);

  // Memoize so consumers can safely include `t` in useEffect dependency arrays
  // without triggering infinite render loops.
  const t = useCallback(
    (key: string, options?: TOptions) => {
      return translation.t(key as never, options as never) as unknown as string;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [translation.t],
  );

  return {
    ...translation,
    t,
  };
}
