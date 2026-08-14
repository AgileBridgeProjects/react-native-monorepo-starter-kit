import type { User } from '@features/users/domain/entities/user';
import type { GridStore } from '@lib/http/create-grid-store';
import { useEffect, useRef, useState } from 'react';

interface UseUserGridRowsResult {
  rows: User[];
  isLoading: boolean;
}

export function useUserGridRows(store: GridStore<User>): UseUserGridRowsResult {
  const [rows, setRows] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Tracks whether we have any rows to show. When we do, we suppress the
  // loading state on subsequent store changes (tab switches) so the previous
  // rows stay visible instead of being replaced by a skeleton.
  const hasRowsRef = useRef(false);

  useEffect(() => {
    if (!store?.on) {
      setRows([]);
      setIsLoading(false);
      hasRowsRef.current = false;
      return;
    }

    let hasReceivedData = false;

    const handleLoading = (loading: boolean) => {
      if (!hasRowsRef.current) setIsLoading(loading);
      if (!loading && !hasReceivedData) {
        // Load finished but `changed` never fired — result is genuinely empty.
        hasReceivedData = true;
        hasRowsRef.current = false;
        setRows([]);
        setIsLoading(false);
      }
    };

    const handleChanged = () => {
      hasReceivedData = true;
      const items = (store.items?.() ?? []) as User[];
      hasRowsRef.current = items.length > 0;
      setRows(items);
      setIsLoading(false);
    };

    // Only show the skeleton on the initial load when there's nothing to display.
    if (!hasRowsRef.current) setIsLoading(true);

    store.on('loadingChanged', handleLoading);
    store.on('changed', handleChanged);
    void store.load();

    return () => {
      store.off?.('loadingChanged', handleLoading);
      store.off?.('changed', handleChanged);
    };
  }, [store]);

  return { rows, isLoading };
}
