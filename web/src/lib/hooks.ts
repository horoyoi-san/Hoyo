import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { getTranslation, Language } from './i18n';

/**
 * Debounce fast-changing values (e.g. search inputs) so expensive
 * filtering/rendering work runs at most once per `delay` ms.
 */
export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/**
 * Translation hook: `t(key)` resolves the active language with English
 * fallback, `lang`/`isTh` for the rare conditional branch.
 */
export function useT() {
  const language = useAppStore((state) => state.language);
  const t = (key: string): string => getTranslation(language as Language, key);
  return { t, lang: language as Language, isTh: language === 'th' };
}
