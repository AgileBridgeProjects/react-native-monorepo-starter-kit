'use client';

import { createContext, useContext } from 'react';

/**
 * Provided by DrawerPanel to its descendants.
 * EntityFormShell calls lock/unlock based on its isSubmitting state so the
 * drawer's close controls are blocked while a mutation is in flight.
 */
export interface ProcessLockContextValue {
  lock: () => void;
  unlock: () => void;
}

export const ProcessLockContext = createContext<ProcessLockContextValue | null>(null);

export function useProcessLock(): ProcessLockContextValue | null {
  return useContext(ProcessLockContext);
}
