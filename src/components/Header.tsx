import React from 'react';
import { ActiveTab } from '../types';
import { Menu, Plus, Check } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onOpenMobileMenu: () => void;
  isDraftSaved: boolean;
  onNewSchedule: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  isDraftSaved,
  onNewSchedule,
}) => {
  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Worship Ministry Dashboard',
      subtitle: 'Word for the World Christian Fellowship - Santa Cruz'
    },
    scheduler: {
      title: 'Song Line-up Scheduler',
      subtitle: 'Create & assign worship service lineups'
    },
    schedules: {
      title: 'Saved Worship Lineups',
      subtitle: 'View, search, edit, or print previous service lineups'
    },
    songs: {
      title: 'Song Database & Worship Library',
      subtitle: 'Search songs, metadata, keys, and service history'
    },
    members: {
      title: 'Member Editor & Roster',
      subtitle: 'Manage worship members, instruments, and vocal roles'
    }
  };

  const current = titles[activeTab];

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 py-4 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg lg:hidden cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
              {current.title}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">
              {current.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'scheduler' && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full transition-opacity duration-300 ${
                isDraftSaved
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Draft Auto-Saved</span>
            </div>
          )}

          <button
            onClick={onNewSchedule}
            data-tour="header-new-lineup-btn"
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lineup</span>
          </button>
        </div>
      </div>
    </header>
  );
};
