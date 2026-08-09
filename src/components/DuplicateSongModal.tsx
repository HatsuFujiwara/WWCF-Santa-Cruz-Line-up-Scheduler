import React from 'react';
import { Song } from '../types';
import { AlertTriangle, ExternalLink, ArrowRight, X } from 'lucide-react';

interface DuplicateSongModalProps {
  isOpen: boolean;
  matchType?: 'title' | 'youtubeId' | 'youtubeUrl';
  existingSong: Song;
  onCancel: () => void;
  onContinueAnyway: () => void;
  onViewExisting: (song: Song) => void;
}

export const DuplicateSongModal: React.FC<DuplicateSongModalProps> = ({
  isOpen,
  matchType,
  existingSong,
  onCancel,
  onContinueAnyway,
  onViewExisting
}) => {
  if (!isOpen) return null;

  const matchLabel =
    matchType === 'youtubeId' || matchType === 'youtubeUrl'
      ? 'Matching YouTube Video Link/ID'
      : 'Matching Song Title';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header Icon & Title */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Duplicate Song Found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {matchLabel} in your song library
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Song Card Preview */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3.5">
          {existingSong.thumbnailUrl ? (
            <img
              src={existingSong.thumbnailUrl}
              alt={existingSong.title}
              className="w-16 h-12 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-16 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/50">
              {existingSong.category.toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1 space-y-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
              {existingSong.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {existingSong.artist || 'Unknown Artist'}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
              {existingSong.key && <span>Key: <strong>{existingSong.key}</strong></span>}
              {existingSong.bpm && <span>BPM: <strong>{existingSong.bpm}</strong></span>}
              <span>Used <strong>{existingSong.timesUsed}x</strong></span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This song already exists in your song library. Would you like to view the existing entry or save this as a separate entry?
        </p>

        {/* Action Options */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => onViewExisting(existingSong)}
            className="w-full py-2.5 px-4 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View / Edit Existing Song</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onContinueAnyway}
              className="py-2.5 px-4 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900/80 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Continue Anyway</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
