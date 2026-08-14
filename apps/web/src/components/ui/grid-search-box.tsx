'use client';

import { useTranslation } from '@lib/i18n';
import { uiConfig } from '@lib/ui-config';
import { CloseIcon, SearchIcon } from '@starterkit/icons';
import { iconSize } from '@starterkit/shared';
import { useEffect, useRef } from 'react';
import { Button } from './button';
import { Input } from './input';

export interface GridSearchBoxProps {
  value: string;
  onValueChange: (value: string) => void;
  /** Called after the debounce elapses, on Enter key, or on explicit submit. */
  onSearch: (value: string) => void;
  /** Override the default placeholder. Falls back to the shared "Search…" string. */
  placeholder?: string;
}

/**
 * Shared search input for grid toolbars.
 * Handles debounce internally; callers only need to react to `onSearch`.
 */
export function GridSearchBox({ value, onValueChange, onSearch, placeholder }: GridSearchBoxProps) {
  const { t } = useTranslation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(next: string) {
    onValueChange(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(next), uiConfig.grid.searchDebounceMs);
  }

  function handleClear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    onValueChange('');
    onSearch('');
  }

  const clearButton = value && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClear}
      aria-label="Clear search"
    >
      <CloseIcon size={iconSize.sm} />
    </Button>
  );

  return (
    <Input
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          if (timerRef.current) clearTimeout(timerRef.current);
          onSearch(value);
        }
      }}
      placeholder={placeholder ?? t('common:grid.searchPlaceholder')}
      className="w-64"
      prefix={<SearchIcon size={iconSize.sm} />}
      suffix={clearButton}
    />
  );
}
