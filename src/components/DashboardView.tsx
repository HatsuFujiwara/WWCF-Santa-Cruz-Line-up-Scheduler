import React, { useMemo } from 'react';
import { Member, Schedule, ActiveTab, formatAssignmentMemberNames, ServiceType, Song } from '../types';
import { formatDateDisplayManila } from '../utils/dateUtils';
import { isScheduleEmpty } from '../utils/scheduleUtils';
import { calculateSongAnalytics } from '../utils/songAnalyticsUtils';
import { resolveScheduleSongTitles } from '../utils/songResolveUtils';
import { MemberFavoriteSongsSection } from './MemberFavoriteSongsSection';
import {
  Users,
  CalendarCheck,
  CalendarX,
  Music,
  Plus,
  ArrowRight,
  Flame,
  Clock,
  Sparkles,
  BookmarkCheck,
  Calendar
} from 'lucide-react';

interface DashboardViewProps {
  members: Member[];
  schedules: Schedule[];
  allSongs?: Song[];
  setActiveTab: (tab: ActiveTab) => void;
  onEditSchedule: (schedule: Schedule) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  schedules,
  allSongs = [],
  setActiveTab,
  onEditSchedule,
}) => {
  // Overall Saved vs Empty classification (Saved = >= 1 song, Empty = 0 songs)
  const totalSavedLineups = useMemo(() => {
    return schedules.filter((s) => !isScheduleEmpty(s)).length;
  }, [schedules]);

  const totalEmptyLineups = useMemo(() => {
    return schedules.filter((s) => isScheduleEmpty(s)).length;
  }, [schedules]);

  // Sunday Service lineups
  const sundaySaved = useMemo(() => {
    return schedules
      .filter((s) => s.serviceType === 'Sunday Service' && !isScheduleEmpty(s))
      .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));
  }, [schedules]);

  const sundayEmpty = useMemo(() => {
    return schedules
      .filter((s) => s.serviceType === 'Sunday Service' && isScheduleEmpty(s))
      .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));
  }, [schedules]);

  // Midweek Prayer Service lineups
  const midweekSaved = useMemo(() => {
    return schedules
      .filter((s) => s.serviceType === 'Midweek Prayer Service' && !isScheduleEmpty(s))
      .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));
  }, [schedules]);

  const midweekEmpty = useMemo(() => {
    return schedules
      .filter((s) => s.serviceType === 'Midweek Prayer Service' && isScheduleEmpty(s))
      .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));
  }, [schedules]);

  // Handle any other custom service types present in schedules
  const otherServiceTypes = useMemo(() => {
    const set = new Set<ServiceType>();
    schedules.forEach((s) => {
      if (s.serviceType !== 'Sunday Service' && s.serviceType !== 'Midweek Prayer Service') {
        set.add(s.serviceType);
      }
    });
    return Array.from(set);
  }, [schedules]);

  // Calculate comprehensive song and song leader analytics
  const songAnalytics = useMemo(() => {
    return calculateSongAnalytics(schedules, members);
  }, [schedules, members]);

  // Most Used Songs: Filter to songs played at least twice (playCount >= 2) before taking top results
  const topSongs = useMemo(() => {
    return songAnalytics.mostUsedSongs
      .filter((song) => song.totalCount >= 2)
      .sort((a, b) => {
        if (b.totalCount !== a.totalCount) {
          return b.totalCount - a.totalCount;
        }
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      })
      .slice(0, 6);
  }, [songAnalytics]);

  const totalUniqueSongs = songAnalytics.totalUniqueSongs;

  // Recent Saved Lineups (only lineups with songs)
  const recentSavedSchedules = useMemo(() => {
    return schedules
      .filter((s) => !isScheduleEmpty(s))
      .sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''))
      .slice(0, 4);
  }, [schedules]);

  const handleLineupClick = (schedule: Schedule) => {
    onEditSchedule(schedule);
    setActiveTab('scheduler');
  };

  return (
    <div data-tour="dashboard-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Card */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wide border border-indigo-100 dark:border-indigo-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Word for the World Christian Fellowship • Santa Cruz</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Worship Ministry Song Line-up Scheduler
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
            Organize Sunday and Midweek worship service lineups, assign band members and vocal leads, auto-filter member roles, and export clean service sheets.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={() => setActiveTab('scheduler')}
              data-tour="create-lineup-btn"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Service Lineup</span>
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Manage Member Roster</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Overall Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div data-tour="dashboard-saved-card" className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Saved Line-ups
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalSavedLineups}
              </h3>
            </div>
          </div>

          <div data-tour="dashboard-empty-card" className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Empty Line-ups
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalEmptyLineups}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Active Ministry Members
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {members.length}
              </h3>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recently Used Songs
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totalUniqueSongs}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Dedicated Service Line-up Cards (Sunday & Midweek) */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Service Line-up Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Sunday Service Card */}
          <div data-tour="dashboard-sunday-card" className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Sunday Service
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  Saved ({sundaySaved.length})
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  Empty ({sundayEmpty.length})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Saved Sunday Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    Saved ({sundaySaved.length})
                  </span>
                </h4>
                {sundaySaved.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                    No saved Sunday lineups
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sundaySaved.map((schedule) => {
                      const songCount = (schedule.praiseSongs?.filter((s) => Boolean(s.trim())).length || 0) +
                                        (schedule.worshipSongs?.filter((s) => Boolean(s.trim())).length || 0);
                      return (
                        <li key={schedule.id}>
                          <button
                            type="button"
                            onClick={() => handleLineupClick(schedule)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                              <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold shrink-0">
                              {songCount} {songCount === 1 ? 'song' : 'songs'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Empty Sunday Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <CalendarX className="w-3.5 h-3.5" />
                    Empty ({sundayEmpty.length})
                  </span>
                </h4>
                {sundayEmpty.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                    No empty Sunday lineups
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sundayEmpty.map((schedule) => {
                      return (
                        <li key={schedule.id}>
                          <button
                            type="button"
                            onClick={() => handleLineupClick(schedule)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50/80 dark:hover:bg-amber-950/40 text-xs text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                              <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold opacity-80 group-hover:opacity-100 shrink-0">
                              + Add songs
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Midweek Prayer Service Card */}
          <div data-tour="dashboard-midweek-card" className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Midweek Prayer Service
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                  Saved ({midweekSaved.length})
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  Empty ({midweekEmpty.length})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Saved Midweek Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    Saved ({midweekSaved.length})
                  </span>
                </h4>
                {midweekSaved.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                    No saved Midweek lineups
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {midweekSaved.map((schedule) => {
                      const songCount = (schedule.praiseSongs?.filter((s) => Boolean(s.trim())).length || 0) +
                                        (schedule.worshipSongs?.filter((s) => Boolean(s.trim())).length || 0);
                      return (
                        <li key={schedule.id}>
                          <button
                            type="button"
                            onClick={() => handleLineupClick(schedule)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                              <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold shrink-0">
                              {songCount} {songCount === 1 ? 'song' : 'songs'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Empty Midweek Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                    <CalendarX className="w-3.5 h-3.5" />
                    Empty ({midweekEmpty.length})
                  </span>
                </h4>
                {midweekEmpty.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                    No empty Midweek lineups
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {midweekEmpty.map((schedule) => {
                      return (
                        <li key={schedule.id}>
                          <button
                            type="button"
                            onClick={() => handleLineupClick(schedule)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50/80 dark:hover:bg-amber-950/40 text-xs text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
                          >
                            <span className="font-semibold flex items-center gap-1.5">
                              <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                              <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold opacity-80 group-hover:opacity-100 shrink-0">
                              + Add songs
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom / Other Services (if present in schedules) */}
        {otherServiceTypes.map((serviceType) => {
          const savedList = schedules
            .filter((s) => s.serviceType === serviceType && !isScheduleEmpty(s))
            .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));
          const emptyList = schedules
            .filter((s) => s.serviceType === serviceType && isScheduleEmpty(s))
            .sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || ''));

          return (
            <div key={serviceType} className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {serviceType}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    Saved ({savedList.length})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                    Empty ({emptyList.length})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>Saved ({savedList.length})</span>
                  </h4>
                  {savedList.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                      No saved lineups
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {savedList.map((schedule) => {
                        const songCount = (schedule.praiseSongs?.filter((s) => Boolean(s.trim())).length || 0) +
                                          (schedule.worshipSongs?.filter((s) => Boolean(s.trim())).length || 0);
                        return (
                          <li key={schedule.id}>
                            <button
                              type="button"
                              onClick={() => handleLineupClick(schedule)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <span className="font-semibold flex items-center gap-1.5">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                                <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 font-bold shrink-0">
                                {songCount} {songCount === 1 ? 'song' : 'songs'}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <CalendarX className="w-3.5 h-3.5" />
                    <span>Empty ({emptyList.length})</span>
                  </h4>
                  {emptyList.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-2 py-1">
                      No empty lineups
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {emptyList.map((schedule) => {
                        return (
                          <li key={schedule.id}>
                            <button
                              type="button"
                              onClick={() => handleLineupClick(schedule)}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-50/80 dark:hover:bg-amber-950/40 text-xs text-slate-600 dark:text-slate-300 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                              <span className="font-semibold flex items-center gap-1.5">
                                <span className="text-amber-500 dark:text-amber-400 font-bold">•</span>
                                <span>{formatDateDisplayManila(schedule.serviceDate, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold opacity-80 group-hover:opacity-100 shrink-0">
                                + Add songs
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Recent Saved Lineups & Most Used Songs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Lineups (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Recent Worship Lineups</span>
            </h3>
            <button
              onClick={() => setActiveTab('schedules')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All ({schedules.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentSavedSchedules.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-sm">
                No saved worship lineups with songs yet. Click "Create Service Lineup" to start!
              </div>
            ) : (
              recentSavedSchedules.map((schedule) => {
                const songLeaderAssignments = (schedule.ministryAssignments || []).filter(
                  (m) => (m.role || '').toLowerCase().includes('leader')
                );
                const songLeaderDisplay = songLeaderAssignments
                  .map((m) => formatAssignmentMemberNames(m))
                  .filter((n) => Boolean(n) && n !== 'Unassigned' && n !== '—')
                  .join(', ');
                return (
                  <div
                    key={schedule.id}
                    className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors group cursor-pointer"
                    onClick={() => handleLineupClick(schedule)}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {schedule.serviceType}
                        </span>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                          {formatDateDisplayManila(schedule.serviceDate)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                        <span>Edit Lineup</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                          ⚡ Praise Songs (Fast)
                        </span>
                        <p className="truncate text-slate-500 dark:text-slate-400">
                          {resolveScheduleSongTitles(schedule, allSongs).praiseSongs.filter(Boolean).join(', ') || 'None'}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">
                          ❤️ Worship Songs (Slow)
                        </span>
                        <p className="truncate text-slate-500 dark:text-slate-400">
                          {resolveScheduleSongTitles(schedule, allSongs).worshipSongs.filter(Boolean).join(', ') || 'None'}
                        </p>
                      </div>
                    </div>

                    {Boolean(songLeaderDisplay) && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between text-slate-400 dark:text-slate-500">
                        <span>
                          Song Leader: <strong className="text-slate-700 dark:text-slate-300">{songLeaderDisplay}</strong>
                        </span>
                        <span>{schedule.ministryAssignments.length} Assigned Roles</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Most Used Songs (1 col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Most Used Songs</span>
          </h3>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            {topSongs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No songs have been played more than once yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {topSongs.map((item, index) => (
                  <div key={item.title} className="py-3 first:pt-0 last:pb-0 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 pr-1">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 text-[11px] border border-indigo-200/60 dark:border-indigo-800/60">
                        {item.totalCount}x
                      </span>
                    </div>

                    {/* Last sung by & Most used by metadata */}
                    <div className="pl-7 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          Last sung by:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.lastSungBy}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 truncate">
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">
                          Most used by:
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {item.mostUsedBy}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Member's Favorite Songs Section */}
      <MemberFavoriteSongsSection
        members={members}
        schedules={schedules}
        setActiveTab={setActiveTab}
      />
    </div>
  );
};
