import React, { useState } from 'react';
import { Song, Schedule } from '../types';
import { SongService } from '../services/songService';
import {
  Search,
  Music,
  Filter,
  Check,
  Plus,
  Sparkles,
  CalendarCheck,
  Flame,
  X,
  ExternalLink
} from 'lucide-react';

interface SongPickerModalProps {
  isOpen: boolean;
  category: 'praise' | 'worship';
  serviceDate: string;
  serviceType?: string;
  allSongs: Song[];
  schedules: Schedule[];
  excludeScheduleId?: string;
  onSelectSong: (songTitle: string) => void;
  onClose: () => void;
  onAddNewSong: () => void;
}

export const SongPickerModal: React.FC<SongPickerModalProps> = ({
  isOpen,
  category,
  serviceDate,
  serviceType,
  allSongs,
  schedules,
  excludeScheduleId,
  onSelectSong,
  onClose,
  onAddNewSong
}) => {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedKey, setSelectedKey] = useState<string>('all');
  const [selectedBadgeFilter, setSelectedBadgeFilter] = useState<string>('all');

  // Filter songs
  const filtered = allSongs.filter((s) => {
    // Category match
    if (s.category !== 'both' && s.category !== category) {
      return false;
    }

    // Language
    if (selectedLanguage !== 'all' && s.language !== selectedLanguage) {
      return false;
    }

    // Key
    if (selectedKey !== 'all' && s.key !== selectedKey) {
      return false;
    }

    // Badge filter
    const usageCheck = SongService.checkMonthlyUsage(s.title, serviceDate, schedules, excludeScheduleId, serviceType);
    if (selectedBadgeFilter === 'used_this_month' && usageCheck.timesUsedThisMonth === 0) {
      return false;
    }
    if (selectedBadgeFilter === 'not_used_this_month' && usageCheck.timesUsedThisMonth > 0) {
      return false;
    }
    if (selectedBadgeFilter === 'new' && s.timesUsed > 0) {
      return false;
    }
    if (selectedBadgeFilter === 'frequent' && s.timesUsed < 3) {
      return false;
    }

    // Text search with multi-term matching
    if (searchQuery.trim()) {
      const cleanQ = searchQuery.trim().toLowerCase().replace(/\s+/g, ' ');
      const terms = cleanQ.split(' ');
      const titleLower = s.title.toLowerCase();
      const artistLower = s.artist.toLowerCase();
      const keyLower = (s.key || '').toLowerCase();
      const langLower = (s.language || '').toLowerCase();

      return terms.every(
        (term) =>
          titleLower.includes(term) ||
          artistLower.includes(term) ||
          keyLower.includes(term) ||
          langLower.includes(term)
      );
    }

    return true;
  });

  // Extract keys and languages
  const availableLanguages = Array.from(new Set(allSongs.map((s) => s.language).filter(Boolean)));
  const availableKeys = Array.from(new Set(allSongs.map((s) => s.key).filter(Boolean)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Select {category === 'praise' ? 'Praise (Fast)' : 'Worship (Slow)'} Song
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Choose from your church song library or add a new song
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Bar */}
        <div className="space-y-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, artist, key..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>

            {/* Language filter */}
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            {/* Key filter */}
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
            >
              <option value="all">All Keys</option>
              {availableKeys.map((k) => (
                <option key={k} value={k}>
                  Key: {k}
                </option>
              ))}
            </select>
          </div>

          {/* Smart Badge Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
            <button
              onClick={() => setSelectedBadgeFilter('all')}
              className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                selectedBadgeFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All Songs ({filtered.length})
            </button>
            <button
              onClick={() => setSelectedBadgeFilter('not_used_this_month')}
              className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                selectedBadgeFilter === 'not_used_this_month'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Not Used This Month
            </button>
            <button
              onClick={() => setSelectedBadgeFilter('used_this_month')}
              className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                selectedBadgeFilter === 'used_this_month'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Used This Month
            </button>
            <button
              onClick={() => setSelectedBadgeFilter('new')}
              className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                selectedBadgeFilter === 'new'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              New Songs
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="overflow-y-auto space-y-2 flex-1 pr-1 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30">
          {filtered.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-400">No matching songs found</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAddNewSong();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 rounded-lg cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Song to Library</span>
              </button>
            </div>
          ) : (
            filtered.map((song) => {
              const usageCheck = SongService.checkMonthlyUsage(song.title, serviceDate, schedules, excludeScheduleId);
              return (
                <div
                  key={song.id}
                  onClick={() => {
                    onSelectSong(song.title);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {song.thumbnailUrl ? (
                      <img
                        src={song.thumbnailUrl}
                        alt={song.title}
                        className="w-12 h-9 object-cover rounded-md shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-9 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {song.originalKey || song.key || 'SONG'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {song.title}
                        </h4>
                        {(song.originalKey || song.key) && (
                          <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            Original Key: {song.originalKey || song.key}
                          </span>
                        )}
                        {song.bpm && (
                          <span className="text-[10px] font-medium text-slate-400">
                            {song.bpm} BPM
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {song.artist || 'Unknown Artist'} {song.language ? `• ${song.language}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Usage Badge */}
                  <div className="flex items-center gap-2 shrink-0">
                    {usageCheck.timesUsedThisMonth > 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                        <CalendarCheck className="w-3 h-3" />
                        <span>Used {usageCheck.timesUsedThisMonth}x this month</span>
                      </span>
                    ) : song.timesUsed === 0 ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>New</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        Used {song.timesUsed}x total
                      </span>
                    )}

                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Check className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-2 shrink-0 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onAddNewSong();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Song to Library</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
