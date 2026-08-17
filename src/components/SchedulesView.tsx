import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, formatAssignmentMemberNames, Song } from '../types';
import { getScheduleRepeatedSongs, ensureMonthlyPlaceholders, isScheduleEmpty } from '../utils/scheduleUtils';
import { formatDateDisplayManila, getManilaTodayString } from '../utils/dateUtils';
import { resolveScheduleSongTitles } from '../utils/songResolveUtils';
import { useMultiSelect } from '../hooks/useMultiSelect';
import {
  CalendarDays,
  Search,
  Edit3,
  Copy,
  Trash2,
  FileDown,
  Image,
  UserCheck,
  AlertTriangle,
  X,
  Filter,
  ArrowUpDown,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface SchedulesViewProps {
  schedules: Schedule[];
  allSongs?: Song[];
  onEditSchedule: (schedule: Schedule) => void;
  onDuplicateSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onBulkDeleteSchedules?: (ids: string[]) => void;
  onExportPDF: (schedule: Schedule) => void;
  onExportPNG: (schedule: Schedule) => void;
  onUpdateSchedules?: (schedules: Schedule[]) => void;
}

export type ScheduleSortOption =
  | 'date-desc'
  | 'date-asc';

/**
 * Renders a clean preview of songs contained in a lineup with bullet points,
 * one song per line, and an expandable "Show More" option for long lists.
 */
const LineupSongsPreview: React.FC<{ schedule: Schedule; songsList?: Song[] }> = ({ schedule, songsList = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const resolved = resolveScheduleSongTitles(schedule, songsList);

  const praiseList = resolved.praiseSongs
    .map((title, i) => ({
      title: title.trim(),
      key: schedule.praiseSongKeys?.[i]?.trim(),
      type: 'Praise'
    }))
    .filter((item) => Boolean(item.title));

  const worshipList = resolved.worshipSongs
    .map((title, i) => ({
      title: title.trim(),
      key: schedule.worshipSongKeys?.[i]?.trim(),
      type: 'Worship'
    }))
    .filter((item) => Boolean(item.title));

  const previewSongs = [...praiseList, ...worshipList];

  if (previewSongs.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 italic text-xs py-1">
        No songs added yet
      </div>
    );
  }

  const limit = 3;
  const visibleSongs = isExpanded ? previewSongs : previewSongs.slice(0, limit);
  const hiddenCount = previewSongs.length - limit;

  return (
    <div className="space-y-1 py-1">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
        <span>Songs ({previewSongs.length})</span>
      </div>
      <ul className="space-y-0.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
        {visibleSongs.map((song, idx) => (
          <li key={idx} className="flex items-center gap-1.5 truncate">
            <span className="text-indigo-500 dark:text-indigo-400 font-bold">•</span>
            <span className="truncate font-medium">{song.title}</span>
            {song.key && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 font-bold shrink-0">
                Key: {song.key}
              </span>
            )}
          </li>
        ))}
      </ul>
      {previewSongs.length > limit && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer pt-0.5 inline-flex items-center gap-0.5"
        >
          <span>{isExpanded ? 'Show Less' : `+ ${hiddenCount} More Songs (Show More)`}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  schedules,
  allSongs = [],
  onEditSchedule,
  onDuplicateSchedule,
  onDeleteSchedule,
  onBulkDeleteSchedules,
  onExportPDF,
  onExportPNG,
  onUpdateSchedules
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<ScheduleSortOption>(() => {
    const saved = localStorage.getItem('schedules_sort_option');
    return (saved as ScheduleSortOption) || 'date-desc';
  });
  const [openRepeatedPopoverId, setOpenRepeatedPopoverId] = useState<string | null>(null);

  // Ensure monthly placeholders when a specific month filter is selected
  useEffect(() => {
    if (monthFilter !== 'all' && onUpdateSchedules) {
      const updated = ensureMonthlyPlaceholders(monthFilter, schedules);
      if (updated.length !== schedules.length) {
        onUpdateSchedules(updated);
      }
    }
  }, [monthFilter, schedules, onUpdateSchedules]);

  // Persist sortOption in localStorage
  const handleSortChange = (opt: ScheduleSortOption) => {
    setSortOption(opt);
    localStorage.setItem('schedules_sort_option', opt);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenRepeatedPopoverId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Compute available service types
  const availableServices = useMemo(() => {
    const defaultTypes = [
      'Sunday Service',
      'Midweek Prayer Service',
      'Youth Service',
      'Special Worship Event'
    ];
    const set = new Set<string>(defaultTypes);
    schedules.forEach((s) => {
      if (s.serviceType) set.add(s.serviceType);
    });
    return Array.from(set);
  }, [schedules]);

  // Compute available months (YYYY-MM) in schedules + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentYM = getManilaTodayString().substring(0, 7);
    monthsSet.add(currentYM);

    schedules.forEach((s) => {
      if (s.serviceDate) {
        monthsSet.add(s.serviceDate.substring(0, 7));
      }
    });

    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted;
  }, [schedules]);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  // Filter & Sort Schedules
  const filteredSchedules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const filtered = schedules.filter((s) => {
      // Service filter
      if (serviceFilter !== 'all' && s.serviceType !== serviceFilter) {
        return false;
      }

      // Month filter
      if (monthFilter !== 'all' && (!s.serviceDate || !s.serviceDate.startsWith(monthFilter))) {
        return false;
      }

      // Search query
      if (query) {
        const cleanQ = query.replace(/\s+/g, ' ');
        const terms = cleanQ.split(' ');
        const serviceLower = s.serviceType.toLowerCase();
        const dateLower = (s.serviceDate || '').toLowerCase();
        const resolved = resolveScheduleSongTitles(s, allSongs);
        const praiseLower = (resolved.praiseSongs || []).map((p) => p.toLowerCase());
        const worshipLower = (resolved.worshipSongs || []).map((w) => w.toLowerCase());
        const membersLower = (s.ministryAssignments || []).map(
          (m) => (formatAssignmentMemberNames(m) + ' ' + m.role).toLowerCase()
        );

        return terms.every(
          (term) =>
            serviceLower.includes(term) ||
            dateLower.includes(term) ||
            praiseLower.some((p) => p.includes(term)) ||
            worshipLower.some((w) => w.includes(term)) ||
            membersLower.some((m) => m.includes(term))
        );
      }

      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      if (sortOption === 'date-asc') {
        const comp = (a.serviceDate || '').localeCompare(b.serviceDate || '');
        if (comp !== 0) return comp;
        return (a.id || '').localeCompare(b.id || '');
      }
      // Default: date-desc (Newest Date -> Oldest Date)
      const comp = (b.serviceDate || '').localeCompare(a.serviceDate || '');
      if (comp !== 0) return comp;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [schedules, searchQuery, serviceFilter, monthFilter, sortOption]);

  // Multi-select hook (Matching Member Editor pattern)
  const {
    selectedIds,
    selectedCount,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected
  } = useMultiSelect(filteredSchedules);

  // Top Toolbar Action Handlers
  const handleEditSelected = () => {
    if (selectedCount !== 1) return;
    const selectedSchedule = filteredSchedules.find((s) => selectedIds.has(s.id));
    if (selectedSchedule) {
      onEditSchedule(selectedSchedule);
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedCount !== 1) return;
    const selectedSchedule = filteredSchedules.find((s) => selectedIds.has(s.id));
    if (selectedSchedule) {
      onDuplicateSchedule(selectedSchedule);
    }
  };

  const handleExportPDFSelected = () => {
    if (selectedCount === 0) return;
    const selectedList = schedules.filter((s) => selectedIds.has(s.id));
    selectedList.forEach((sch) => onExportPDF(sch));
  };

  const handleExportPNGSelected = () => {
    if (selectedCount === 0) return;
    const selectedList = schedules.filter((s) => selectedIds.has(s.id));
    selectedList.forEach((sch) => onExportPNG(sch));
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      onDeleteSchedule(ids[0]);
    } else if (onBulkDeleteSchedules) {
      onBulkDeleteSchedules(ids);
    } else {
      ids.forEach((id) => onDeleteSchedule(id));
    }
    clearSelection();
  };

  return (
    <div data-tour="schedules-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Main Container Card: Header, Filters, Search & Top Action Toolbar */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        {/* Header & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Saved Worship Schedules ({filteredSchedules.length})</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Manage saved worship line-ups, filter by month and service type, or export/edit selected schedules.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search date, song, or member..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Month Filter
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
              >
                <option value="all">All Months</option>
                {availableMonths.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatMonthLabel(ym)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Service Type Selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Service Type Filter
              </label>
              <select
                value={serviceFilter}
                data-tour="schedules-filter-select"
                onChange={(e) => setServiceFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
              >
                <option value="all">All Services</option>
                {availableServices.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Sort By
              </label>
              <select
                value={sortOption}
                data-tour="schedules-sort-select"
                onChange={(e) => handleSortChange(e.target.value as ScheduleSortOption)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
              >
                <option value="date-desc">Newest Date → Oldest Date (Default)</option>
                <option value="date-asc">Oldest Date → Newest Date</option>
              </select>
            </div>
          </div>
        </div>

        {/* 🌟 Universal Action Buttons Toolbar (Matching Member Editor Pattern) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Line-up Button */}
            <button
              type="button"
              disabled={selectedCount !== 1}
              onClick={handleEditSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                selectedCount === 1
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select 1 line-up to edit'
                  : selectedCount > 1
                  ? 'Select only 1 line-up to edit'
                  : 'Edit selected line-up'
              }
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Line-up</span>
            </button>

            {/* Duplicate Line-up Button */}
            <button
              type="button"
              disabled={selectedCount !== 1}
              onClick={handleDuplicateSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                selectedCount === 1
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select 1 line-up to duplicate'
                  : selectedCount > 1
                  ? 'Select only 1 line-up to duplicate'
                  : 'Duplicate selected line-up'
              }
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Line-up</span>
            </button>

            {/* Export PDF Button */}
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleExportPDFSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                selectedCount >= 1
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select line-up(s) to export PDF'
                  : selectedCount === 1
                  ? 'Export selected line-up as PDF'
                  : `Export ${selectedCount} selected line-ups as PDF`
              }
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export PDF{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
            </button>

            {/* Export PNG Button */}
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleExportPNGSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                selectedCount >= 1
                  ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select line-up(s) to export PNG'
                  : selectedCount === 1
                  ? 'Export selected line-up as PNG image'
                  : `Export ${selectedCount} selected line-ups as PNG`
              }
            >
              <Image className="w-3.5 h-3.5" />
              <span>Export PNG{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
            </button>

            {/* Delete Line-up Button */}
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleDeleteSelected}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer select-none ${
                selectedCount >= 1
                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-60'
              }`}
              title={
                selectedCount === 0
                  ? 'Select line-up(s) to delete'
                  : selectedCount === 1
                  ? 'Delete selected line-up'
                  : `Delete ${selectedCount} selected line-ups`
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Line-up{selectedCount > 1 ? `s (${selectedCount})` : ''}</span>
            </button>
          </div>

          {/* Selection Counter & Clear Action */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-200/80 dark:border-indigo-800/80">
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Schedules List / Table */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredSchedules.length === 0 ? (
          schedules.filter((s) => !isScheduleEmpty(s)).length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No saved line-ups yet.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly Sunday Service and Midweek Prayer Service placeholders will appear automatically.
              </p>
            </div>
          ) : (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <CalendarDays className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-500 font-medium">
                No matching line-ups found for the selected filters.
              </p>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={() => toggleSelectAll(filteredSchedules)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select / Unselect All Visible"
                    />
                  </th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4 min-w-[240px]">Songs</th>
                  <th className="py-3 px-4">Key Roles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSchedules.map((schedule, idx) => {
                  const selected = isSelected(schedule.id);
                  const leaderAssignments = (schedule.ministryAssignments || []).filter(
                    (m) => (m.role || '').toLowerCase().includes('leader')
                  );
                  const leaderDisplay = leaderAssignments
                    .map((m) => formatAssignmentMemberNames(m))
                    .filter((n) => Boolean(n) && n !== 'Unassigned' && n !== '—')
                    .join(', ');
                  const repeatedSongs = getScheduleRepeatedSongs(schedule, schedules);
                  const isEmpty = isScheduleEmpty(schedule);

                  return (
                    <tr
                      key={schedule.id}
                      className={`transition-colors ${
                        selected
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-4 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(e) => toggleSelect(schedule.id, idx, e)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {formatDateDisplayManila(schedule.serviceDate)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium">
                          {schedule.serviceDate}
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            {schedule.serviceType}
                          </span>

                          {isEmpty && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>Empty • Needs Planning</span>
                            </span>
                          )}

                          {repeatedSongs.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenRepeatedPopoverId(
                                    openRepeatedPopoverId === schedule.id ? null : schedule.id
                                  );
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors shadow-2xs"
                                title="Click to view repeated songs details"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                <span>
                                  {repeatedSongs.length === 1
                                    ? '⚠ 1 Repeated Song'
                                    : `⚠ ${repeatedSongs.length} Repeated Songs`}
                                </span>
                              </button>

                              {openRepeatedPopoverId === schedule.id && (
                                <div
                                  className="absolute left-0 top-full mt-1.5 w-80 p-3.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl shadow-xl z-40 text-left text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-xs">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                      <span>Repeated Songs Detection</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setOpenRepeatedPopoverId(null)}
                                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-md"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                    {repeatedSongs.map((detail, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="space-y-1.5 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50"
                                      >
                                        <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                          • {detail.songTitle}
                                        </div>
                                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                                          Used {detail.usageCount} {detail.usageCount === 1 ? 'time' : 'times'} in regular services
                                        </div>
                                        <div className="space-y-1 pt-0.5">
                                          {detail.otherOccurrences.map((occ, oIdx) => {
                                            const affectedSch = schedules.find((s) => s.id === occ.scheduleId);
                                            return (
                                              <div
                                                key={oIdx}
                                                className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200/80 dark:border-slate-700/80"
                                              >
                                                <div>
                                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {occ.serviceDate}
                                                  </span>
                                                  <span className="text-slate-400 mx-1">-</span>
                                                  <span>{occ.serviceType}</span>
                                                </div>
                                                {affectedSch && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setOpenRepeatedPopoverId(null);
                                                      onEditSchedule(affectedSch);
                                                    }}
                                                    className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded transition-colors cursor-pointer"
                                                  >
                                                    Open Line-up
                                                  </button>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-top">
                        <LineupSongsPreview schedule={schedule} songsList={allSongs} />
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                        {leaderDisplay ? (
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-semibold">{leaderDisplay}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

