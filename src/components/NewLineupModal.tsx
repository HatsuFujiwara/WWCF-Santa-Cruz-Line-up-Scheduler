import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, ServiceType } from '../types';
import { formatDateDisplayManila, getManilaTodayString } from '../utils/dateUtils';
import { getNextAvailableServiceDate } from '../utils/scheduleUtils';
import {
  X,
  Layers,
  PlusCircle,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  FolderOpen
} from 'lucide-react';

interface NewLineupModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Schedule[];
  onLoadExistingLineup: (schedule: Schedule) => void;
  onCreateNewLineup: (serviceType: ServiceType | string, serviceDate: string) => void;
}

type ModalView = 'choice' | 'load' | 'create' | 'conflict';

export const NewLineupModal: React.FC<NewLineupModalProps> = ({
  isOpen,
  onClose,
  schedules,
  onLoadExistingLineup,
  onCreateNewLineup
}) => {
  const [view, setView] = useState<ModalView>('choice');

  // Load Existing state
  const [loadServiceType, setLoadServiceType] = useState<string>('Sunday Service');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>('');

  // Create New state
  const [createServiceOption, setCreateServiceOption] = useState<string>('Sunday Service');
  const [customServiceName, setCustomServiceName] = useState<string>('');
  const [createServiceDate, setCreateServiceDate] = useState<string>(getManilaTodayString());

  // Conflict state
  const [conflictSchedule, setConflictSchedule] = useState<Schedule | null>(null);

  // Reset internal state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setView('choice');
      setLoadServiceType('Sunday Service');
      setCreateServiceOption('Sunday Service');
      setCustomServiceName('');
      setCreateServiceDate(getManilaTodayString());
      setConflictSchedule(null);
      window.dispatchEvent(new CustomEvent('new-lineup-modal-opened'));
    } else {
      window.dispatchEvent(new CustomEvent('new-lineup-modal-closed'));
    }
  }, [isOpen]);

  // Unique list of available service types in existing schedules
  const availableLoadServiceTypes = useMemo(() => {
    const defaultTypes = ['Sunday Service', 'Midweek Prayer Service'];
    const typesFromSchedules = Array.from(new Set(schedules.map((s) => s.serviceType).filter(Boolean)));
    const merged = Array.from(new Set([...defaultTypes, ...typesFromSchedules]));
    return merged;
  }, [schedules]);

  // Filtered schedules for selected service type under "Load Existing"
  const availableSchedulesForLoad = useMemo(() => {
    return schedules
      .filter((s) => s.serviceType === loadServiceType)
      .sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''));
  }, [schedules, loadServiceType]);

  // Update default selected schedule when service type changes in Load Existing
  useEffect(() => {
    if (availableSchedulesForLoad.length > 0) {
      setSelectedScheduleId(availableSchedulesForLoad[0].id);
    } else {
      setSelectedScheduleId('');
    }
  }, [availableSchedulesForLoad]);

  // Auto-update default date when service option changes in Create New
  useEffect(() => {
    const effectiveType = createServiceOption === 'Custom...' ? customServiceName : createServiceOption;
    if (effectiveType === 'Sunday Service' || effectiveType === 'Midweek Prayer Service') {
      const nextDate = getNextAvailableServiceDate(effectiveType as ServiceType, schedules);
      setCreateServiceDate(nextDate);
    } else {
      setCreateServiceDate(getManilaTodayString());
    }
  }, [createServiceOption, customServiceName, schedules]);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalServiceType = createServiceOption === 'Custom...'
      ? customServiceName.trim() || 'Custom Service'
      : createServiceOption;

    if (!createServiceDate) return;

    // Check if an existing schedule already exists for this service + date
    const existing = schedules.find(
      (s) => s.serviceType === finalServiceType && s.serviceDate === createServiceDate
    );

    if (existing) {
      setConflictSchedule(existing);
      setView('conflict');
    } else {
      onCreateNewLineup(finalServiceType, createServiceDate);
      onClose();
    }
  };

  const handleLoadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = schedules.find((s) => s.id === selectedScheduleId);
    if (target) {
      onLoadExistingLineup(target);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        data-tour="new-lineup-modal-container"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] my-auto flex flex-col transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            {view !== 'choice' && (
              <button
                type="button"
                onClick={() => setView(view === 'conflict' ? 'create' : 'choice')}
                className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                {view === 'choice' && 'New Lineup'}
                {view === 'load' && 'Load Existing Lineup'}
                {view === 'create' && 'Create New Lineup'}
                {view === 'conflict' && 'Lineup Already Exists'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {view === 'choice' && 'What would you like to do?'}
                {view === 'load' && 'Open an automatically created Sunday or Midweek lineup.'}
                {view === 'create' && 'Create a lineup for another service or event.'}
                {view === 'conflict' && 'A lineup already exists for this service date.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* SCREEN 1: CHOICE SCREEN */}
          {view === 'choice' && (
            <div className="space-y-4" data-tour="new-lineup-options-container">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Choose an action
              </p>

              <div className="grid grid-cols-1 gap-3.5">
                {/* OPTION A: LOAD EXISTING LINEUP */}
                <button
                  type="button"
                  data-tour="new-lineup-option-load"
                  onClick={() => setView('load')}
                  className="group flex items-start gap-4 p-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all duration-150 cursor-pointer shadow-2xs"
                >
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Load Existing Lineup
                      </h4>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Open an automatically created lineup for Sunday Service or Midweek Prayer Service.
                    </p>
                  </div>
                </button>

                {/* OPTION B: CREATE NEW LINEUP */}
                <button
                  type="button"
                  data-tour="new-lineup-option-create"
                  onClick={() => setView('create')}
                  className="group flex items-start gap-4 p-4 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 hover:border-purple-300 dark:hover:border-purple-700/60 transition-all duration-150 cursor-pointer shadow-2xs"
                >
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Create New Lineup
                      </h4>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Create a lineup for another service or event (e.g. Youth Fellowship, Worship Event, Custom Service).
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: LOAD EXISTING LINEUP */}
          {view === 'load' && (
            <form onSubmit={handleLoadSubmit} className="space-y-4">
              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Service
                </label>
                <select
                  value={loadServiceType}
                  data-tour="load-service-type-select"
                  onChange={(e) => setLoadServiceType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
                >
                  {availableLoadServiceTypes.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date / Lineup Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Existing Lineup Date
                </label>
                {availableSchedulesForLoad.length > 0 ? (
                  <select
                    value={selectedScheduleId}
                    data-tour="load-schedule-date-select"
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
                  >
                    {availableSchedulesForLoad.map((sch) => {
                      const songCount = (sch.praiseSongs || []).filter(Boolean).length + (sch.worshipSongs || []).filter(Boolean).length;
                      const formattedDate = formatDateDisplayManila(sch.serviceDate, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      });
                      return (
                        <option key={sch.id} value={sch.id}>
                          {formattedDate} — {sch.serviceDate} ({songCount} {songCount === 1 ? 'song' : 'songs'})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 italic">
                    No existing lineups found for {loadServiceType}.
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setView('choice')}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-tour="load-lineup-submit-btn"
                  disabled={!selectedScheduleId}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Load Lineup
                </button>
              </div>
            </form>
          )}

          {/* SCREEN 3: CREATE NEW LINEUP */}
          {view === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Choose Service <span className="text-rose-500">*</span>
                </label>
                <select
                  value={createServiceOption}
                  data-tour="create-service-type-select"
                  onChange={(e) => setCreateServiceOption(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer font-medium"
                >
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Midweek Prayer Service">Midweek Prayer Service</option>
                  <option value="Youth Fellowship">Youth Fellowship</option>
                  <option value="Special Worship Event">Special Worship Event</option>
                  <option value="Custom...">Custom Service...</option>
                </select>
              </div>

              {/* Custom Service Name Input (if Custom... selected) */}
              {createServiceOption === 'Custom...' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Custom Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    data-tour="create-custom-service-input"
                    placeholder="e.g. Couples Fellowship, Outreach Night"
                    value={customServiceName}
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                  />
                </div>
              )}

              {/* Service Date Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Service Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  data-tour="create-service-date-input"
                  value={createServiceDate}
                  onChange={(e) => setCreateServiceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setView('choice')}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  data-tour="create-lineup-submit-btn"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {/* SCREEN 4: CONFLICT PROTECTION */}
          {view === 'conflict' && conflictSchedule && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <p className="font-bold text-sm">
                    Lineup Already Exists
                  </p>
                  <p className="leading-relaxed">
                    An automatically generated or saved lineup already exists for{' '}
                    <strong>{conflictSchedule.serviceType}</strong> on{' '}
                    <strong>{formatDateDisplayManila(conflictSchedule.serviceDate)}</strong>.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                To prevent duplicate lineups, would you like to open the existing lineup instead?
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setView('create')}
                  className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  data-tour="conflict-load-existing-btn"
                  onClick={() => {
                    onLoadExistingLineup(conflictSchedule);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Load Existing Lineup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer for choice view */}
        {view === 'choice' && (
          <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
