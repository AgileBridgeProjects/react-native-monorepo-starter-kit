/**
 * CountryPickerSheet — web implementation.
 * Renders a searchable dropdown anchored beneath the country-code trigger
 * (via a React portal so it escapes any overflow/stacking context).
 */
import { getPhoneCountries } from '@starterkit/shared';
import { useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { iconSize } from '@/constants/tokens';
import { cn } from '@/src/lib/cn';
import { useTranslation } from '@/src/lib/i18n';
import { CountryFlag } from './country-flag';

export interface CountryPickerSheetProps {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  /** Anchors the dropdown to the trigger element. */
  anchorRef?: { current: unknown };
}

interface AnchorRect {
  top: number;
  left: number;
}

const DROPDOWN_WIDTH = 320;

export function CountryPickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
  anchorRef,
}: CountryPickerSheetProps) {
  const [search, setSearch] = useState('');
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const { t } = useTranslation('auth');

  useLayoutEffect(() => {
    if (!visible) {
      setAnchor(null);
      return;
    }
    const node = anchorRef?.current as { getBoundingClientRect?: () => DOMRect } | undefined;
    if (node && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      setAnchor({ top: rect.bottom + 4, left: rect.left });
    } else {
      setAnchor(null);
    }
  }, [visible, anchorRef]);

  const filtered = useMemo(() => {
    const all = getPhoneCountries();
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(search));
  }, [search]);

  if (!visible) return null;

  function handleSelect(code: string) {
    onSelect(code);
    setSearch('');
    onClose();
  }

  function handleClose() {
    setSearch('');
    onClose();
  }

  // Position is computed from the trigger at runtime, so it stays inline.
  const panelPosition: React.CSSProperties = anchor
    ? {
        position: 'absolute',
        top: anchor.top,
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - DROPDOWN_WIDTH - 8)),
      }
    : { position: 'absolute', top: 120, left: '50%', transform: 'translateX(-50%)' };

  const dropdown = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('phone.selectCountry')}
      className="fixed inset-0 z-[var(--z-modal)]"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation wrapper */}
      <div
        role="presentation"
        className="flex max-h-96 w-80 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
        style={panelPosition}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-sm">
          <input
            // biome-ignore lint/a11y/noAutofocus: search is the primary action when opened
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('phone.searchCountryPlaceholder')}
            className="box-border w-full rounded-md border border-border bg-input px-md py-sm text-sm text-text outline-none"
          />
        </div>

        <div
          role="listbox"
          aria-label={t('phone.selectCountry')}
          className="flex-1 overflow-y-auto"
        >
          {filtered.map((country) => (
            <button
              key={country.code}
              type="button"
              role="option"
              aria-selected={country.code === selected}
              onClick={() => handleSelect(country.code)}
              className={cn(
                'flex w-full items-center gap-sm border-b border-border px-md py-sm text-left text-sm text-text',
                country.code === selected ? 'bg-primary/10' : 'hover:bg-input',
              )}
            >
              <CountryFlag code={country.code} size={iconSize.xs} />
              <span className="w-12 text-text-secondary text-xs">{country.dialCode}</span>
              <span className="flex-1">{country.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-md py-lg text-center text-sm text-text-muted">
              {t('phone.noCountriesFound')}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dropdown, document.body);
}
