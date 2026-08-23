import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { useAppStore, NavigationPage } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { NAV_ITEMS } from './nav';
import { Kbd, Modal } from '../ui';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Ctrl+K quick navigator: fuzzy-ish substring search over all pages,
 * arrow keys + Enter to navigate, Esc to close.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useT();
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ITEMS;
    return NAV_ITEMS.filter((item) => {
      const label = t(item.translationKey).toLowerCase();
      const subtitle = t(`${item.translationKey}.sub`).toLowerCase();
      return label.includes(q) || subtitle.includes(q) || item.id.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the modal mounts.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const pick = (page: NavigationPage) => {
    setCurrentPage(page);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[activeIndex];
      if (item) pick(item.id);
    }
  };

  return (
    <Modal open={open} onClose={onClose} hideClose className="!max-w-md !pt-0">
      <div onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-hairline">
          <Search className="h-4 w-4 text-ink-3 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('palette.placeholder')}
            aria-label={t('palette.placeholder')}
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-4 focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5" role="listbox">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-ink-3">{t('palette.noResults')}</div>
          )}
          {results.map((item, i) => {
            const Icon = item.icon;
            const selected = i === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => pick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer',
                  selected ? 'bg-accent/20 text-ink' : 'text-ink-2 hover:bg-white/[0.04]'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', selected ? 'text-accent-soft' : 'text-ink-3')} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate">{t(item.translationKey)}</div>
                  <div className="text-[10px] text-ink-4 truncate">{t(`${item.translationKey}.sub`)}</div>
                </div>
                {selected && <CornerDownLeft className="h-3.5 w-3.5 text-accent-soft" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-hairline text-[10px] text-ink-4">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        </div>
      </div>
    </Modal>
  );
}
