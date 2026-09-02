import { useState } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import appIcon from '../../assets/icon.png';
import { useAppStore, NavigationPage } from '../../stores/useAppStore';
import { useT } from '../../lib/hooks';
import { StatusDot } from './StatusDot';
import { CATEGORIES, NavItem } from './nav';
import { IconButton } from '../ui';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const { t } = useT();
  const currentPage = useAppStore((state) => state.currentPage);
  const setCurrentPage = useAppStore((state) => state.setCurrentPage);
  const compact = useAppStore((state) => state.compactSidebar);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = compact && !mobileOpen;

  const handleNavigate = (id: NavigationPage) => {
    setCurrentPage(id);
    setMobileOpen(false);
  };

  const renderNavButton = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentPage === item.id;
    const label = t(item.translationKey);

    return (
      <button
        key={item.id}
        onClick={() => handleNavigate(item.id)}
        aria-current={isActive ? 'page' : undefined}
        title={label}
        className={cn(
          'w-full flex items-center text-left transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-hz-brand-400/50 rounded-xl relative group',
          collapsed ? 'justify-center p-2.5 my-1' : 'px-3.5 py-2.5 gap-3 my-0.5',
          isActive
            ? 'bg-hz-brand-400 text-white font-semibold shadow-lg shadow-hz-brand-400/30'
            : 'text-hz-gray-400 hover:text-white hover:bg-hz-navy-700/60'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-white' : 'text-hz-gray-400 group-hover:text-white')} />
        {!collapsed && (
          <span className="text-xs truncate font-medium">
            {label}
          </span>
        )}
      </button>
    );
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between overflow-hidden bg-hz-navy-800">
      {/* Brand header */}
      <div>
        <div
          className={cn(
            'border-b border-hz-navy-500/40 flex items-center h-14',
            collapsed ? 'p-2 justify-center' : 'px-4 justify-between'
          )}
        >
          <button
            type="button"
            onClick={() => handleNavigate('robinsr')}
            className={cn(
              'flex items-center cursor-pointer focus:outline-none rounded-md',
              collapsed ? 'justify-center' : 'gap-3 min-w-0'
            )}
            aria-label="AstralOS — home"
            title="AstralOS"
          >
            <img src={appIcon} alt="AstralOS" className="h-7 w-7 shrink-0 rounded-xl shadow-md shadow-hz-brand-400/30 object-cover" />
            {!collapsed && (
              <div className="min-w-0 text-left">
                <span className="text-sm font-extrabold text-white tracking-wider font-sans">
                  Astral<span className="font-normal text-hz-brand-400">OS</span>
                </span>
              </div>
            )}
          </button>

          {!collapsed && (
            <IconButton
              label="Collapse sidebar"
              variant="ghost"
              className="hidden lg:inline-flex text-hz-gray-400 hover:text-white h-7 w-7"
              onClick={() => updateSettings({ compactSidebar: true })}
            >
              <PanelLeftClose className="h-4 w-4" />
            </IconButton>
          )}
          {mobileOpen && (
            <IconButton label="Close sidebar" variant="ghost" className="lg:hidden h-7 w-7 text-hz-gray-400" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        {collapsed && (
          <div className="p-2 border-b border-hz-navy-500/40 flex justify-center">
            <IconButton
              label="Expand sidebar"
              variant="ghost"
              className="text-hz-gray-400 hover:text-white h-7 w-7"
              onClick={() => updateSettings({ compactSidebar: false })}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </IconButton>
          </div>
        )}

        {/* Navigation Categories */}
        <nav
          className={cn(
            'p-3 space-y-3',
            collapsed
              ? 'overflow-hidden scrollbar-none'
              : 'overflow-y-auto max-h-[calc(100vh-120px)] scrollbar-thin'
          )}
          aria-label="Main navigation"
        >
          {CATEGORIES.map((cat) => (
            <div key={cat.categoryKey} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-hz-gray-500">
                  {t(cat.categoryKey)}
                </div>
              )}
              {collapsed && (
                <div className="mx-auto h-px w-6 bg-hz-navy-500/50 my-2" />
              )}
              <div className="space-y-0.5">{cat.items.map(renderNavButton)}</div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer status */}
      <div className={cn('border-t border-hz-navy-500/40 bg-hz-navy-900/60', collapsed ? 'p-3 flex justify-center' : 'px-4 py-3')}>
        <StatusDot compact={collapsed} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-2.5 left-2.5 z-50 p-2 rounded-xl bg-hz-navy-800 border border-hz-navy-500 text-white hover:bg-hz-navy-700 transition-colors shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'h-full flex-col bg-hz-navy-800 border-r border-hz-navy-500/40 relative select-none transition-all duration-200 ease-in-out shrink-0 overflow-hidden shadow-xl shadow-black/20',
          collapsed ? 'w-18 min-w-18 max-w-18' : 'w-64 min-w-64 max-w-64',
          'hidden lg:flex',
          mobileOpen && '!flex w-72 min-w-72 max-w-72 fixed inset-y-0 left-0 z-40 !transition-none shadow-2xl'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
