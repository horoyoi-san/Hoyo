import { Languages, Search, Settings, Zap } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { Kbd } from '../ui';
import { cn } from '../../lib/utils';

interface TitleBarProps {
  onOpenPalette: () => void;
}

export function TitleBar({ onOpenPalette }: TitleBarProps) {
  const backendConnected = useAppStore((state) => state.backendConnected);
  const language = useAppStore((state) => state.language);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const { t } = useT();

  return (
    <header className="h-11 w-full bg-hz-navy-800 border-b border-hz-navy-500/50 flex items-center justify-between px-4 select-none relative z-20">
      {/* Brand & status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-hz-brand-400 flex items-center justify-center shadow-md shadow-hz-brand-400/20">
            <Zap className="h-3 w-3 text-white fill-current" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white font-sans">
            Astral<span className="text-hz-brand-400">OS</span>
          </span>
        </div>

        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
            backendConnected
              ? 'bg-hz-green-400/10 border-hz-green-400/20 text-hz-green-400'
              : 'bg-hz-navy-700 border-hz-navy-500 text-hz-gray-400'
          )}
        >
          <span
            className={cn(
              'inline-block rounded-full h-1.5 w-1.5',
              backendConnected ? 'bg-hz-green-400 animate-pulse' : 'bg-zinc-500'
            )}
          />
          <span>{backendConnected ? t('titlebar.operational') : t('titlebar.status.offline')}</span>
        </div>
      </div>

      {/* Utilities & quick actions */}
      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={onOpenPalette}
          title={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
          className="px-2.5 py-1 rounded-xl text-[11px] font-medium text-hz-gray-400 hover:text-white hover:bg-hz-navy-700 transition-colors flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>

        <button
          onClick={() => setCurrentPage('settings')}
          title={t('titlebar.settingsHint')}
          className="px-2.5 py-1 rounded-xl text-[11px] font-medium text-hz-gray-400 hover:text-white hover:bg-hz-navy-700 transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:inline">{t('nav.settings')}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={() => updateSettings({ language: language === 'th' ? 'en' : 'th' })}
          title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          aria-label="Toggle language"
          className="px-2.5 py-1 rounded-xl bg-hz-navy-700 hover:bg-hz-navy-600 border border-hz-navy-500 text-white text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50 shadow-sm"
        >
          <Languages className="h-3.5 w-3.5 text-hz-brand-400" aria-hidden="true" />
          <span>{language === 'th' ? 'TH' : 'EN'}</span>
        </button>
      </div>
    </header>
  );
}
