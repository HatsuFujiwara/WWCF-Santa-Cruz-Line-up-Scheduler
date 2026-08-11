import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, formatAssignmentMemberNames } from '../types';
import { getScheduleRepeatedSongs, ensureMonthlyPlaceholders, isScheduleEmpty } from '../utils/scheduleUtils';
import { formatDateDisplayManila, getManilaTodayString } from '../utils/dateUtils';
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
  CheckSquare,
  Square,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface SchedulesViewProps {
  schedules: Schedule[];
  onEditSchedule: (schedule: Schedule) => void;
  onDuplicateSchedule: (schedule: Schedule) => void;
  onDeleteSchedule: (id: string) => void;
  onBulkDeleteSchedules?: (ids: string[]) => void;
  onExportPDF: (schedule: Schedule) => void;
  onExportPNG: (schedule: Schedule) => void;
  onUpdateSchedules?: (schedules: Schedule[]) => void;
  onRefreshLineups?: () => void;
}

export type ScheduleSortOption =
  | 'date-desc'
  | 'date-asc';

/**
 * Renders a clean preview of songs contained in a lineup with bullet points,
 * one song per line, and an expandable "Show More" option for long lists.
 */
const LineupSongsPreview: React.FC<{ schedule: Schedule }> = ({ schedule }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const praiseList = (schedule.praiseSongs || [])
    .map((s, i) => ({
      title: s.trim(),
      key: schedule.praiseSongKeys?.[i]?.trim(),
      type: 'Praise'
    }))
    .filter((item) => Boolean(item.title));

  const worshipList = (schedule.worshipSongs || [])
    .map((s, i) => ({
      title: s.trim(),
      key: schedule.worshipSongKeys?.[i]?.trim(),
      type: 'Worship'
    }))
    .filter((item) => Boolean(item.title));

  const allSongs = [...praiseList, ...worshipList];

  if (allSongs.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 italic text-xs py-1">
        No songs added yet
      </div>
    );
  }

  const limit = 3;
  const visibleSongs = isExpanded ? allSongs : allSongs.slice(0, limit);
  const hiddenCount = allSongs.length - limit;

  return (
    <div className="space-y-1 py-1">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
        <span>Songs ({allSongs.length})</span>
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
      {allSongs.length > limit && (
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
  onEditSchedule,
  onDuplicateSchedule,
  onDeleteSchedule,
  onBulkDeleteSchedules,
  onExportPDF,
  onExportPNG,
  onUpdateSchedules,
  onRefreshLineups
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshModalOpen, setIsRefreshModalOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<ScheduleSortOption>(() => {
    const saved = localStorage.getItem('schedules_sort_option');
    return (saved as ScheduleSortOption) || 'date-desc';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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
        const praiseLower = (s.praiseSongs || []).map((p) => p.toLowerCase());
        const worshipLower = (s.worshipSongs || []).map((w) => w.toLowerCase());
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

  // Selection Logic
  const allVisibleSelected =
    filteredSchedules.length > 0 &&
    filteredSchedules.every((s) => selectedIds.has(s.id));

  const isSomeSelected =
    filteredSchedules.some((s) => selectedIds.has(s.id)) && !allVisibleSelected;

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Unselect all visible
      const newSet = new Set(selectedIds);
      filteredSchedules.forEach((s) => newSet.delete(s.id));
      setSelectedIds(newSet);
    } else {
      // Select all visible
      const newSet = new Set(selectedIds);
      filteredSchedules.forEach((s) => newSet.add(s.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (onBulkDeleteSchedules) {
      onBulkDeleteSchedules(ids);
    } else {
      ids.forEach((id) => onDeleteSchedule(id));
    }
    setSelectedIds(new Set());
  };

  const handleBulkExportPDF = () => {
    const selectedSchedules = schedules.filter((s) => selectedIds.has(s.id));
    selectedSchedules.forEach((sch) => onExportPDF(sch));
  };

  return (
    <div data-tour="schedules-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls Bar */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Saved Worship Schedules ({filteredSchedules.length})</span>
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Manage saved worship line-ups, filter by month and service type, or export/bulk delete.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsRefreshModalOpen(true)}
              className="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              title="Refresh all saved line-ups using current member and ministry data"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Refresh Line-ups</span>
            </button>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search date, song, or member..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
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
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">
              {selectedIds.size}
            </span>
            <span>{selectedIds.size} line-up{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkExportPDF}
              className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export Selected</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select / Unselect All Visible"
                    />
                  </th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4 min-w-[240px]">Songs</th>
                  <th className="py-3 px-4">Key Roles</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSchedules.map((schedule) => {
                  const isSelected = selectedIds.has(schedule.id);
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
                        isSelected
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/30'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-4 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(schedule.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
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
                        <LineupSongsPreview schedule={schedule} />
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
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onExportPDF(schedule)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Export PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onExportPNG(schedule)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Export PNG"
                          >
                            <Image className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEditSchedule(schedule)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Schedule"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDuplicateSchedule(schedule)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate Schedule"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteSchedule(schedule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refresh Line-ups Confirmation Modal */}
      {isRefreshModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                  <RefreshCw className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Refresh Saved Line-ups?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sync member tags & ministry hierarchy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRefreshModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                This operation will scan all saved line-ups and update member references, tag metadata, and ministry hierarchy using the current member database.
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">• Existing member assignments remain intact.</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">• Songs, keys, service dates, and notes are preserved.</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">• Current form and active drafts will NOT be reset.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRefreshModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRefreshModalOpen(false);
                    if (onRefreshLineups) {
                      onRefreshLineups();
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Line-ups</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
