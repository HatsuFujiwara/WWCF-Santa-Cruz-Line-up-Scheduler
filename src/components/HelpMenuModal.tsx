import React from 'react';
import {
  HelpCircle,
  X,
  ChevronRight,
  Sparkles,
  Church,
  Users,
  Music,
  Sliders,
  Calendar,
  Settings,
  Shield,
  Download,
  Database
} from 'lucide-react';

interface HelpMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (stepId: number) => void;
}

export const HelpMenuModal: React.FC<HelpMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectSection
}) => {
  if (!isOpen) return null;

  // List of 11 separate Help & Guide Topics
  const sections = [
    { title: '1. Create a Line-up', stepId: 1, icon: Sliders, desc: 'Basic Guide: Complete 7-step lineup creation & save walkthrough' },
    { title: '2. Song Database', stepId: 11, icon: Music, desc: 'Master song catalog, add songs, keys, play counts & Praise/Worship categories' },
    { title: '3. Import YouTube / YouTube Music Playlist', stepId: 42, icon: Sparkles, desc: 'Import YouTube or YouTube Music playlist URLs directly' },
    { title: '4. Saved Lineups', stepId: 10, icon: Calendar, desc: 'Historical line-up archive, search, filters & past schedule editing' },
    { title: '5. Member Editor', stepId: 12, icon: Users, desc: 'Volunteer roster, ministry tags, DA status & member management' },
    { title: '6. Member Assignment', stepId: 6, icon: Users, desc: 'Assign Song Leaders, Backup Singers & musicians to worship roles' },
    { title: '7. Exporting Lineups', stepId: 8, icon: Download, desc: 'Export clean PDF documents or PNG images for printing & sharing' },
    { title: '8. Scheduling', stepId: 2, icon: Church, desc: 'Sunday vs Midweek services with automatic date calculations' },
    { title: '9. Song Repetition', stepId: 13, icon: Shield, desc: 'First-come, first-serve monthly song repetition warnings' },
    { title: '10. Settings', stepId: 14, icon: Settings, desc: 'Theme options (Light, Dark, AMOLED) & guide settings' },
    { title: '11. Backup & Restore', stepId: 15, icon: Database, desc: 'Export or restore full JSON database backups' }
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <HelpCircle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Help & Guide Topics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a topic to view its interactive guide
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

        {/* List of Help Topics */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.title}
                type="button"
                onClick={() => {
                  onClose();
                  onSelectSection(sec.stepId);
                }}
                className="w-full p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer flex items-center justify-between text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {sec.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      {sec.desc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectSection(1);
            }}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Basic Guide (Creating a Line-up)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
