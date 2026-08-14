import type DataSource from 'devextreme/data/data_source';
import { useCallback, useEffect, useRef, useState } from 'react';

function deriveTotalPages(store: DataSource): number {
  const total = Number(store.totalCount() ?? 0);
  const size = store.pageSize();
  return size > 0 ? Math.max(Math.ceil(total / size), 1) : 1;
}

/**
 * Shared pagination state and handlers for a DevExtreme DataSource.
 *
 * Manages `currentPage` / `totalPages` state derived from the store's
 * `changed` event, plus guarded prev/next handlers that prevent rapid
 * double-clicks from dispatching multiple page loads.
 * @knipignore build-ahead: not yet consumed — wire up or remove.
 */
export function useDxPagination(store: DataSource) {
  const isLoadingRef = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sync pagination state whenever the store emits 'changed'.
  useEffect(() => {
    const syncPagination = () => {
      setCurrentPage(store.pageIndex() + 1);
      setTotalPages(deriveTotalPages(store));
    };
    store.on('changed', syncPagination);
    return () => {
      store.off('changed', syncPagination);
    };
  }, [store]);

  /** Reset pagination to page 1 (call when filters change before reloading). */
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setTotalPages(1);
    store.pageIndex(0);
  }, [store]);

  const handlePreviousPage = useCallback(() => {
    if (isLoadingRef.current) return;
    const newIndex = store.pageIndex() - 1;
    if (newIndex < 0) return;
    isLoadingRef.current = true;
    store.pageIndex(newIndex);
    void Promise.resolve(store.load()).finally(() => {
      isLoadingRef.current = false;
    });
  }, [store]);

  const handleNextPage = useCallback(() => {
    if (isLoadingRef.current) return;
    const total = Number(store.totalCount() ?? 0);
    const size = store.pageSize();
    const maxIndex = size > 0 ? Math.ceil(total / size) - 1 : 0;
    const newIndex = store.pageIndex() + 1;
    if (newIndex > maxIndex) return;
    isLoadingRef.current = true;
    store.pageIndex(newIndex);
    void Promise.resolve(store.load()).finally(() => {
      isLoadingRef.current = false;
    });
  }, [store]);

  return { currentPage, totalPages, resetPagination, handlePreviousPage, handleNextPage };
}
