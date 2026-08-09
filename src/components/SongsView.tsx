import React, { useState } from 'react';
import { Song, Schedule, SongCategory } from '../types';
import { SongService } from '../services/songService';
import { getManilaTodayString } from '../utils/dateUtils';
import { useMultiSelect } from '../hooks/useMultiSelect';
import { SongFormModal } from './SongFormModal';
import { PlaylistImportModal } from './PlaylistImportModal';
import { Modal } from './Modal';
import {
  Music,
  Plus,
  Search,
  Filter,
  Youtube,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  Flame,
  CalendarCheck,
  ExternalLink,
  Layers,
  Clock,
  Mic2,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

interface SongsViewProps {
  songs: Song[];
  schedules: Schedule[];
  onRefreshSongs: () => void;
  onUpdateSchedules: (updatedSchedules: Schedule[]) => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const SongsView: React.FC<SongsViewProps> = ({
  songs,
  schedules,
  onRefreshSongs,
  onUpdateSchedules,
  showToast
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  // Bulk Delete Modal state
  const [bulkDeleteConfig, setBulkDeleteConfig] = useState<{
    isOpen: boolean;
    targets: Song[];
    affectedSchedulesCount: number;
    songsInUseCount: number;
  }>({
    isOpen: false,
    targets: [],
    affectedSchedulesCount: 0,
    songsInUseCount: 0
  });

  // Bulk Category Change Modal state
  const [bulkCategoryConfig, setBulkCategoryConfig] = useState<{
    isOpen: boolean;
    targets: Song[];
    targetCategory: SongCategory | null;
  }>({
    isOpen: false,
    targets: [],
    targetCategory: null
  });

  // Filter songs
  const filteredSongs = songs.filter((s) => {
    // Category
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'praise' && s.category !== 'praise' && s.category !== 'both') return false;
      if (categoryFilter === 'worship' && s.category !== 'worship' && s.category !== 'both') return false;
    }

    // Language
    if (languageFilter !== 'all' && s.language !== languageFilter) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.key && s.key.toLowerCase().includes(q)) ||
        (s.ccliNumber && s.ccliNumber.toLowerCase().includes(q)) ||
        (s.notes && s.notes.toLowerCase().includes(q)) ||
        (s.themes && s.themes.some((t) => t.toLowerCase().includes(q))) ||
        (s.labels && s.labels.some((l) => l.toLowerCase().includes(q)))
      );
    }

    return true;
  });

  // Multi-select hook
  const {
    selectedIds,
    selectedCount,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected
  } = useMultiSelect(filteredSongs);

  const handleRequestDelete = (targets: Song[]) => {
    if (targets.length === 0) return;

    const targetTitles = new Set(targets.map((s) => s.title.trim().toLowerCase()));

    const affectedSchedules = schedules.filter((sch) => {
      const schSongs = [...(sch.praiseSongs || []), ...(sch.worshipSongs || [])].map((s) => s.trim().toLowerCase());
      return Array.from(targetTitles).some((t) => schSongs.includes(t));
    });

    const songsInUse = targets.filter((s) => {
      const titleLower = s.title.trim().toLowerCase();
      return schedules.some((sch) => {
        const schSongs = [...(sch.praiseSongs || []), ...(sch.worshipSongs || [])].map((item) => item.trim().toLowerCase());
        return schSongs.includes(titleLower);
      });
    });

    setBulkDeleteConfig({
      isOpen: true,
      targets,
      affectedSchedulesCount: affectedSchedules.length,
      songsInUseCount: songsInUse.length
    });
  };

  const executeDelete = async () => {
    const { targets } = bulkDeleteConfig;
    if (targets.length === 0) return;

    try {
      const targetIds = targets.map((s) => s.id);
      await SongService.deleteSongsBulk(targetIds);

      showToast(
        targets.length === 1
          ? `Deleted "${targets[0].title}" from Song Database. Saved line-ups remain unchanged.`
          : `Deleted ${targets.length} selected songs from Song Database. Saved line-ups remain unchanged.`,
        'success'
      );

      clearSelection();
      setBulkDeleteConfig({ isOpen: false, targets: [], affectedSchedulesCount: 0, songsInUseCount: 0 });
      onRefreshSongs();
    } catch (err) {
      console.error('Failed to delete songs:', err);
      showToast('Failed to delete selected songs', 'danger');
    }
  };

  const handleRequestBulkCategoryChange = (targetCategory: SongCategory) => {
    const selectedSongs = songs.filter((s) => selectedIds.has(s.id));
    if (selectedSongs.length === 0) return;

    setBulkCategoryConfig({
      isOpen: true,
      targets: selectedSongs,
      targetCategory
    });
  };

  const executeBulkCategoryChange = async () => {
    const { targets, targetCategory } = bulkCategoryConfig;
    if (targets.length === 0 || !targetCategory) return;

    try {
      const targetIds = targets.map((s) => s.id);
      await SongService.bulkUpdateCategory(targetIds, targetCategory);

      showToast(
        `${targets.length} song${targets.length > 1 ? 's' : ''} were updated successfully.`,
        'success'
      );

      clearSelection();
      setBulkCategoryConfig({ isOpen: false, targets: [], targetCategory: null });
      onRefreshSongs();
    } catch (err) {
      console.error('Failed to update song categories:', err);
      showToast('Failed to update song categories', 'danger');
    }
  };

  const currentYM = getManilaTodayString().substring(0, 7);

  // Stats
  const praiseCount = songs.filter((s) => s.category === 'praise' || s.category === 'both').length;
  const worshipCount = songs.filter((s) => s.category === 'worship' || s.category === 'both').length;

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Music className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Song Database & Worship Library</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage songs, key specifications, YouTube links, and usage service history
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-colors cursor-pointer"
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>Import Playlist</span>
          </button>

          <button
            onClick={() => {
              setEditingSong(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Song</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total Songs
          </p>
          <p className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
            {songs.length}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Praise Songs
          </p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {praiseCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Worship Songs
          </p>
          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            {worshipCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Used This Month
          </p>
          <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {songs.filter((s) => SongService.getMonthlyUsageCount(s.title, schedules) > 0).length}
          </p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        
        {/* Search Bar */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by song title, artist, key, CCLI..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 w-full md:w-auto">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategoryFilter('praise')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              categoryFilter === 'praise'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Praise
          </button>
          <button
            onClick={() => setCategoryFilter('worship')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
              categoryFilter === 'worship'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Worship
          </button>
        </div>

        {/* Language Filter */}
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none w-full md:w-auto"
        >
          <option value="all">All Languages</option>
          <option value="English">English</option>
          <option value="Tagalog">Tagalog</option>
          <option value="Cebuano">Cebuano</option>
        </select>
      </div>

      {/* Bulk Actions & Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isSomeSelected;
              }}
              onChange={() => toggleSelectAll(filteredSongs)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Select All ({filteredSongs.length})</span>
          </label>

          {selectedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {selectedCount} selected
            </span>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleRequestBulkCategoryChange('praise')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Set Selected to Praise</span>
            </button>

            <button
              onClick={() => handleRequestBulkCategoryChange('worship')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Set Selected to Worship</span>
            </button>

            <button
              onClick={() => {
                const selectedSongs = songs.filter((s) => selectedIds.has(s.id));
                handleRequestDelete(selectedSongs);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedCount})</span>
            </button>
          </div>
        )}
      </div>

      {/* Song Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {songs.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-2xl">
              🎵
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
                <span>🎵</span> No songs found.
              </h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Song Database is currently empty.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click &ldquo;Add Song&rdquo; or import a YouTube/YouTube Music playlist to get started.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setEditingSong(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Song</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl cursor-pointer transition-colors"
              >
                <Youtube className="w-4 h-4 text-red-500" />
                <span>Import Playlist</span>
              </button>
            </div>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <Music className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              No songs found matching your search.
            </p>
          </div>
        ) : (
          filteredSongs.map((song, idx) => {
            const timesUsedThisMonth = SongService.getMonthlyUsageCount(song.title, schedules);
            const isExpanded = expandedHistoryId === song.id;
            const selected = isSelected(song.id);

            return (
              <div
                key={song.id}
                className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border transition-all flex flex-col justify-between space-y-3 ${
                  selected
                    ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs'
                    : 'border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Top Row: Checkbox + Thumbnail + Details */}
                <div className="flex items-start gap-3">
                  {/* Select Checkbox */}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(e) => toggleSelect(song.id, idx, e)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0 mt-1"
                  />

                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {song.thumbnailUrl ? (
                      <div className="relative group shrink-0">
                        <img
                          src={song.thumbnailUrl}
                          alt={song.title}
                          className="w-20 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                        />
                        {song.youtubeUrl && (
                          <a
                            href={song.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 bg-slate-900/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Youtube className="w-6 h-6 text-white" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100 dark:border-indigo-900">
                        {song.key || 'SONG'}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {song.title}
                        </h3>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {song.youtubeUrl && (
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="Watch on YouTube"
                            >
                              <Youtube className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setEditingSong(song);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer"
                            title="Edit Song"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRequestDelete([song])}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Song"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                        {song.artist || 'Unknown Artist'}
                      </p>

                      {/* Metadata Pill Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          Category: {song.category.toUpperCase()}
                        </span>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                          Original Key: {song.originalKey || song.key || '—'}
                        </span>

                        {song.bpm && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                            {song.bpm} BPM
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                          {song.language}
                        </span>
                      </div>

                      {/* Theme Tags */}
                      {((song.themes && song.themes.length > 0) || (song.labels && song.labels.length > 0)) && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(song.themes || song.labels || []).map((themeTag) => (
                            <span
                              key={themeTag}
                              className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50"
                            >
                              🏷️ {themeTag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Stats & Service History Drawer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    {timesUsedThisMonth > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <CalendarCheck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Used {timesUsedThisMonth}x this month</span>
                      </span>
                    ) : song.timesUsed === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <Sparkles className="w-3 h-3" />
                        <span>New (Unused)</span>
                      </span>
                    ) : (
                      <span>Last used: <strong>{song.lastUsedDate}</strong></span>
                    )}
                  </div>

                  <button
                    onClick={() => setExpandedHistoryId(isExpanded ? null : song.id)}
                    className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <span>Used {song.timesUsed}x</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Service History Expandable Drawer */}
                {isExpanded && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1.5 animate-in fade-in duration-150">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      Service Usage History
                    </p>
                    {song.serviceHistory && song.serviceHistory.length > 0 ? (
                      <ul className="space-y-1 text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto pr-1">
                        {song.serviceHistory.map((h, idx) => (
                          <li key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                            <span>{h.serviceType}</span>
                            <span className="font-medium text-slate-500">{h.date}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-400 italic">No previous schedule history recorded.</p>
                    )}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* Song Form Modal */}
      <SongFormModal
        isOpen={isModalOpen}
        songToEdit={editingSong}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSong(null);
        }}
        onSave={() => {
          onRefreshSongs();
        }}
        onDeleteSong={(song) => {
          handleRequestDelete([song]);
        }}
        onViewExistingSong={(song) => {
          setEditingSong(song);
          setIsModalOpen(true);
        }}
        showToast={showToast}
      />

      {/* Bulk & Single Delete Confirmation Modal */}
      <Modal
        isOpen={bulkDeleteConfig.isOpen}
        title={
          bulkDeleteConfig.targets.length === 1
            ? 'Delete this song from the Song Database?'
            : `Delete ${bulkDeleteConfig.targets.length} Selected Songs?`
        }
        message="Historical saved line-ups using this song will remain unchanged."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger={true}
        onConfirm={executeDelete}
        onClose={() =>
          setBulkDeleteConfig({ isOpen: false, targets: [], affectedSchedulesCount: 0, songsInUseCount: 0 })
        }
      />

      {/* Bulk Category Change Confirmation Modal */}
      {bulkCategoryConfig.isOpen && bulkCategoryConfig.targetCategory && (
        <Modal
          isOpen={bulkCategoryConfig.isOpen}
          title={
            bulkCategoryConfig.targets.length === 1
              ? `Change category of 1 song to ${bulkCategoryConfig.targetCategory === 'praise' ? 'Praise' : 'Worship'}?`
              : `Change category of ${bulkCategoryConfig.targets.length} selected songs to ${
                  bulkCategoryConfig.targetCategory === 'praise' ? 'Praise' : 'Worship'
                }?`
          }
          message={`Change the category of ${bulkCategoryConfig.targets.length} selected song${
            bulkCategoryConfig.targets.length > 1 ? 's' : ''
          } to ${bulkCategoryConfig.targetCategory === 'praise' ? 'Praise' : 'Worship'}?`}
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          onConfirm={executeBulkCategoryChange}
          onClose={() => setBulkCategoryConfig({ isOpen: false, targets: [], targetCategory: null })}
        />
      )}

      {/* Playlist Import Modal */}
      <PlaylistImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={() => {
          onRefreshSongs();
        }}
        showToast={showToast}
      />

    </div>
  );
};

