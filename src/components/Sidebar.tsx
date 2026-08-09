import React from 'react';
import { ActiveTab } from '../types';
import {
  Cross,
  LayoutDashboard,
  Sliders,
  CalendarDays,
  Users,
  Music,
  Moon,
  Sun,
  X,
  Database
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenBackupRestore: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  isOpen,
  setIsOpen,
  onOpenBackupRestore
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scheduler' as ActiveTab, label: 'Song Scheduler', icon: Sliders },
    { id: 'songs' as ActiveTab, label: 'Song Database', icon: Music },
    { id: 'schedules' as ActiveTab, label: 'Saved Lineups', icon: CalendarDays },
    { id: 'members' as ActiveTab, label: 'Member Editor', icon: Users },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-200 dark:border-slate-800 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Cross className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">WWCF</h1>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Santa Cruz</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => {
              onOpenBackupRestore();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Backup & Restore Data</span>
            </div>
          </button>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={isDarkMode}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isDarkMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-medium">
            Word for the World • Santa Cruz
          </div>
        </div>
      </aside>
    </>
  );
};
