import React, { useState, useEffect } from 'react';
import { StorageService, GuideAutoShowMode } from '../services/storage';
import {
  X,
  Settings,
  Sparkles,
  Moon,
  Sun,
  Database,
  Church,
  Info,
  Check,
  RotateCcw,
  Play
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  onOpenOnboarding: () => void;
  onOpenBackupRestore: () => void;
  showToast?: (text: string, type?: 'success' | 'danger' | 'info') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  setIsDarkMode,
  onOpenOnboarding,
  onOpenBackupRestore,
  showToast
}) => {
  const [guideMode, setGuideMode] = useState<GuideAutoShowMode>('first_visit');

  useEffect(() => {
    if (isOpen) {
      setGuideMode(StorageService.getGuideMode());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectGuideMode = (mode: GuideAutoShowMode) => {
    setGuideMode(mode);
    StorageService.setGuideMode(mode);
    if (showToast) {
      if (mode === 'never') {
        showToast('Auto-guide disabled. You can change this anytime in Settings → Interactive Guide.', 'info');
      } else if (mode === 'every_time') {
        showToast('Guide will open automatically on every site session.', 'info');
      } else {
        showToast('Guide will show on first visit only.', 'info');
      }
    }
  };

  const handleResetGuidePreferences = () => {
    StorageService.resetGuidePreferences();
    setGuideMode('first_visit');
    if (showToast) {
      showToast('Interactive Guide preferences reset to default (Show on first visit only).', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                User Preferences & Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                WWCF Santa Cruz Worship Ministry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Section: Interactive Guide Settings */}
          <div data-tour="guide-settings-panel" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Interactive Guide Frequency</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Control when the Interactive Guide welcome dialog appears automatically when visiting the site:
            </p>

            {/* Mode Options */}
            <div className="space-y-2 pt-1">
              {[
                {
                  id: 'first_visit',
                  title: 'Show on first visit only',
                  desc: 'Automatically launches for new visitors until completed or dismissed.'
                },
                {
                  id: 'every_time',
                  title: 'Show every time I use the site',
                  desc: 'Opens automatically whenever starting a new site session.'
                },
                {
                  id: 'never',
                  title: 'Never show automatically',
                  desc: 'Never opens automatically. Accessible anytime via Help → Interactive Guide.'
                }
              ].map((opt) => (
                <label
                  key={opt.id}
                  onClick={() => handleSelectGuideMode(opt.id as GuideAutoShowMode)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    guideMode === opt.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="guideMode"
                    value={opt.id}
                    checked={guideMode === opt.id}
                    onChange={() => handleSelectGuideMode(opt.id as GuideAutoShowMode)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold">{opt.title}</div>
                    <div className="text-[11px] opacity-75 leading-tight mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Explanatory Info Notice */}
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                You can change this anytime. Go to <strong>Settings → Interactive Guide</strong> to show the guide again or change how often it appears.
              </p>
            </div>

            {/* Actions: Start Guide & Reset Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                data-tour="restart-guide-btn"
                onClick={() => {
                  onClose();
                  onOpenOnboarding();
                }}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Interactive Guide</span>
              </button>

              <button
                type="button"
                onClick={handleResetGuidePreferences}
                className="py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Reset Guide Preferences</span>
              </button>
            </div>
          </div>

          {/* Section: Appearance / Theme */}
          <div data-tour="theme-toggle" className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
                {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Theme & Display Mode</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Switch between Light Mode and AMOLED Dark Mode (#000000) for comfortable reading.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsDarkMode(false)}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isDarkMode
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
                {!isDarkMode && <Check className="w-3.5 h-3.5 text-indigo-600 ml-auto" />}
              </button>

              <button
                type="button"
                onClick={() => setIsDarkMode(true)}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>AMOLED Dark</span>
                {isDarkMode && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto" />}
              </button>
            </div>
          </div>

          {/* Section: Backup & Recovery */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-sm">
              <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Data Protection & Backups</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Export full JSON backups of your roster, song library, and saved line-ups, or restore from a backup file.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBackupRestore();
              }}
              className="w-full py-2 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Open Backup & Restore Tool</span>
            </button>
          </div>

          {/* Application Info */}
          <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Church className="w-4 h-4" />
              <span>WWCF Santa Cruz Worship Ministry</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Official Production Release • Version 1.0
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
