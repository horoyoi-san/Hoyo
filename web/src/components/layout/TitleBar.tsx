import { Languages, PanelLeftClose, PanelLeftOpen, Search, Settings } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { Kbd } from '../ui';
import { cn } from '../../lib/utils';

interface TitleBarProps {
  onOpenPalette: () => void;
}

export function TitleBar({ onOpenPalette }: TitleBarProps) {
  const desktopReady = useAppStore((state) => state.desktopReady);
  const serverRunning = useAppStore((state) => state.serverRunning);
  const language = useAppStore((state) => state.language);
  const compactSidebar = useAppStore((state) => state.compactSidebar);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const { t, isTh } = useT();

  return (
    <header className="h-11 w-full bg-hz-navy-800 border-b border-hz-navy-500/50 flex items-center justify-between px-4 select-none relative z-20">
      {/* Engine Status Badge & Sidebar Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => updateSettings({ compactSidebar: !compactSidebar })}
          title={compactSidebar ? 'Expand Sidebar' : 'Collapse Sidebar'}
          className="p-1.5 rounded-xl text-hz-gray-400 hover:text-white hover:bg-hz-navy-700 transition-colors cursor-pointer"
          aria-label="Toggle Sidebar"
        >
          {compactSidebar ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {/* Host Status */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border',
            desktopReady
              ? 'bg-hz-green-400/10 border-hz-green-400/20 text-hz-green-400'
              : 'bg-hz-navy-700 border-hz-navy-500 text-hz-gray-400'
          )}
          title={desktopReady ? 'AstralOS Desktop Core Ready' : 'Backend Standby'}
        >
          <span
            className={cn(
              'inline-block rounded-full h-1.5 w-1.5',
              desktopReady ? 'bg-hz-green-400 animate-pulse' : 'bg-hz-gray-600'
            )}
          />
          <span>{desktopReady ? t('titlebar.operational') : t('titlebar.status.offline')}</span>
        </div>

        {/* RobinSR Server Quick Status */}
        <button
          onClick={() => setCurrentPage('robinsr')}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer transition-all hover:scale-102',
            serverRunning
              ? 'bg-hz-green-400/15 border-hz-green-400/30 text-hz-green-400 shadow-sm shadow-hz-green-400/10'
              : 'bg-hz-navy-700/50 border-hz-navy-500/50 text-hz-gray-400 hover:text-white'
          )}
          title={serverRunning ? 'RobinSR Server is Online (Port :21000)' : 'RobinSR Server is Standby — Click to open'}
        >
          <span
            className={cn(
              'inline-block rounded-full h-1.5 w-1.5',
              serverRunning ? 'bg-hz-green-400 animate-pulse' : 'bg-hz-gray-600'
            )}
          />
          <span>{serverRunning ? (isTh ? 'RobinSR รันอยู่ (:21000)' : 'RobinSR Active (:21000)') : (isTh ? 'RobinSR สแตนด์บาย' : 'RobinSR Standby')}</span>
        </button>
      </div>

      {/* Utilities & quick actions */}
      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={onOpenPalette}
          title={t('palette.placeholder')}
          aria-label={t('palette.placeholder')}
          className="px-2.5 py-1 rounded-xl text-[11px] font-medium text-hz-gray-400 hover:text-white hover:bg-hz-navy-700 transition-colors flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50"
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
          className="px-2.5 py-1 rounded-xl text-[11px] font-medium text-hz-gray-400 hover:text-white hover:bg-hz-navy-700 transition-colors flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50"
        >
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden md:inline">{t('nav.settings')}</span>
        </button>

        {/* Language toggle */}
        <button
          onClick={() => updateSettings({ language: language === 'th' ? 'en' : 'th' })}
          title={language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          aria-label="Toggle language"
          className="px-2.5 py-1 rounded-xl bg-hz-navy-700 hover:bg-hz-navy-600 border border-hz-navy-500 text-white text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 shadow-sm"
        >
          <Languages className="h-3.5 w-3.5 text-zinc-300" aria-hidden="true" />
          <span>{language === 'th' ? 'TH' : 'EN'}</span>
        </button>
      </div>
    </header>
  );
}
