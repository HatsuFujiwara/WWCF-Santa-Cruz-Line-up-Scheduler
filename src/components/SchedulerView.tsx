import React, { useState, useEffect, useRef } from 'react';
import { Member, Schedule, ServiceType, MinistryAssignment, AssignedMember, Song, getAssignmentMembers, isMemberUnderDisciplinary } from '../types';
import { SongService, MonthlyUsageCheckResult } from '../services/songService';
import { StorageService } from '../services/storage';
import { getNextAvailableServiceDate, getSmartInitialServiceDetails, isScheduleEmpty } from '../utils/scheduleUtils';
import { getManilaNowISO, getManilaTodayString, formatDateDisplayManila, getManilaDateParts } from '../utils/dateUtils';
import { sortTags } from '../utils/tagUtils';
import { ImportSummary } from '../services/youtubePlaylistService';
import { SongAutocomplete } from './SongAutocomplete';
import { MonthlyUsageModal } from './MonthlyUsageModal';
import { SongPickerModal } from './SongPickerModal';
import { SongFormModal } from './SongFormModal';
import { SongRecommendationsPanel } from './SongRecommendationsPanel';
import { PlaylistImportModal } from './PlaylistImportModal';
import { Modal } from './Modal';
import {
  Church,
  Music,
  Users,
  Plus,
  Trash2,
  Save,
  FileDown,
  Image,
  RotateCcw,
  Sparkles,
  Zap,
  Heart,
  Filter,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Youtube,
  ListMusic,
  FileText,
  Layers,
  X,
  AlertTriangle
} from 'lucide-react';

interface LineupConflictModalProps {
  isOpen: boolean;
  serviceType: string;
  serviceDate: string;
  onReplace: () => void;
  onMerge: () => void;
  onCancel: () => void;
}

const LineupConflictModal: React.FC<LineupConflictModalProps> = ({
  isOpen,
  serviceType,
  serviceDate,
  onReplace,
  onMerge,
  onCancel
}) => {
  if (!isOpen) return null;

  const formattedDate = formatDateDisplayManila(serviceDate, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Lineup Already Exists
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {serviceType} — {formattedDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
            A lineup already exists for <strong className="text-indigo-600 dark:text-indigo-400">{serviceType} — {formattedDate}</strong>. Choose how you'd like to continue:
          </p>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <strong className="block text-slate-900 dark:text-slate-100 font-semibold">Replace Songs</strong>
              <p>Replace all existing songs in the lineup with the newly imported songs. Keep service type, scheduled date, assigned members, and notes unchanged.</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <strong className="block text-slate-900 dark:text-slate-100 font-semibold">Merge Songs</strong>
              <p>Merge the imported songs into the existing lineup without duplicate titles, preserving current song order and appending new ones.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer order-3 sm:order-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onMerge}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 hover:bg-purple-100 dark:hover:bg-purple-900/80 border border-purple-200 dark:border-purple-800 rounded-xl transition-colors cursor-pointer order-2"
          >
            Merge Songs
          </button>
          <button
            type="button"
            onClick={onReplace}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-2xs transition-colors cursor-pointer order-1 sm:order-3"
          >
            Replace Songs
          </button>
        </div>
      </div>
    </div>
  );
};

interface SchedulerViewProps {
  members: Member[];
  allSongs: Song[];
  schedules: Schedule[];
  editingSchedule: Schedule | null;
  onSaveSchedule: (scheduleData: Omit<Schedule, 'id' | 'updatedAt'>, id?: string) => void;
  onExportPDF: (schedule: Schedule) => void;
  onExportPNG: (schedule: Schedule) => void;
  onResetForm: () => void;
  onTriggerDraft: (draft: Partial<Schedule>) => void;
  onRefreshSongs: () => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
  onSelectSchedule?: (schedule: Schedule) => void;
  onViewSchedules?: () => void;
}

export const isBackupRole = (rName: string): boolean => {
  const lower = (rName || '').toLowerCase().trim();
  return (
    (lower.includes('backup') || lower.includes('vocal') || lower.includes('singer')) &&
    !lower.includes('song leader') &&
    !lower.includes('worship leader') &&
    !lower.includes('song lead')
  );
};

export const isMusicianRole = (rName: string): boolean => {
  const r = (rName || '').toLowerCase().trim();
  return (
    r.includes('guitar') ||
    r.includes('keyboard') ||
    (r.includes('bass') && !r.includes('brass')) ||
    r.includes('drum')
  );
};

const DEFAULT_ROLES: { role: string; targetLabel: string }[] = [
  { role: 'Song Leader (Praise/Worship)', targetLabel: 'Song Leader, Worship Leader' },
  { role: 'Backup Singer/s', targetLabel: 'Vocalist' },
  { role: 'Guitarist', targetLabel: 'Guitarist' },
  { role: 'Keyboardist', targetLabel: 'Keyboardist' },
  { role: 'Bassist', targetLabel: 'Bassist' },
  { role: 'Drummer', targetLabel: 'Drummer' },
  { role: 'Audio/Live Technician', targetLabel: 'Audio/Live Technician' },
  { role: 'Lyricist', targetLabel: 'Lyricist' }
];

const createDefaultMinistryRows = (): MinistryAssignment[] => {
  return DEFAULT_ROLES.map((r, idx) => ({
    id: `m-row-${idx}-${Date.now()}`,
    role: r.role,
    assignedMembers: [{ memberId: '', memberName: '' }],
    notes: ''
  }));
};

export const SchedulerView: React.FC<SchedulerViewProps> = ({
  members,
  allSongs,
  schedules,
  editingSchedule,
  onSaveSchedule,
  onExportPDF,
  onExportPNG,
  onResetForm,
  onTriggerDraft,
  onRefreshSongs,
  showToast,
  onSelectSchedule,
  onViewSchedules
}) => {
  // Manual Date Override Flag
  const [isDateManuallyEdited, setIsDateManuallyEdited] = useState<boolean>(false);

  // Service Details State with Smart Auto-Selection
  const [serviceType, setServiceType] = useState<ServiceType>(() => {
    if (editingSchedule) return editingSchedule.serviceType;
    return getSmartInitialServiceDetails(schedules).serviceType;
  });
  const [serviceDate, setServiceDate] = useState<string>(() => {
    if (editingSchedule) return editingSchedule.serviceDate;
    return getSmartInitialServiceDetails(schedules).serviceDate;
  });

  // Song States
  const [praiseSongs, setPraiseSongs] = useState<string[]>(['']);
  const [worshipSongs, setWorshipSongs] = useState<string[]>(['']);
  const [praiseSongKeys, setPraiseSongKeys] = useState<string[]>(['']);
  const [worshipSongKeys, setWorshipSongKeys] = useState<string[]>(['']);

  // Modals state
  const [monthlyWarnings, setMonthlyWarnings] = useState<MonthlyUsageCheckResult[]>([]);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<{
    data: Omit<Schedule, 'id' | 'updatedAt'>;
    id?: string;
  } | null>(null);

  // YouTube Playlist Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Drag and Drop State for Songs
  const [draggedItem, setDraggedItem] = useState<{ category: 'praise' | 'worship'; index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ category: 'praise' | 'worship'; index: number } | null>(null);

  // Picker Modal State
  const [pickerConfig, setPickerConfig] = useState<{
    isOpen: boolean;
    category: 'praise' | 'worship';
    songIndex: number;
  }>({ isOpen: false, category: 'praise', songIndex: 0 });

  // Song Form Modal State (Add New Song)
  const [isSongFormOpen, setIsSongFormOpen] = useState(false);

  // Ministry Rows State
  const [ministryRows, setMinistryRows] = useState<MinistryAssignment[]>(() => {
    return createDefaultMinistryRows();
  });

  // Track loaded schedule ID to avoid overwriting form state when allSongs/schedules change
  const loadedScheduleIdRef = useRef<string | null | undefined>(undefined);

  // Replace lineup confirmation modal state
  const [isConfirmReplaceOpen, setIsConfirmReplaceOpen] = useState<boolean>(false);
  const [pendingImportData, setPendingImportData] = useState<{
    importedSongs: Song[];
    summary: ImportSummary;
  } | null>(null);

  // Duplicate schedule conflict modal state
  const [duplicateConflictSchedule, setDuplicateConflictSchedule] = useState<Schedule | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState<boolean>(false);

  // Smart Role Filter Toggle
  const [isSmartFilter, setIsSmartFilter] = useState<boolean>(true);

  // Load editing schedule or initialize from versioned draft / smart default
  useEffect(() => {
    const currentContextKey = editingSchedule ? `edit_${editingSchedule.id}` : 'new_schedule';
    if (loadedScheduleIdRef.current !== currentContextKey) {
      loadedScheduleIdRef.current = currentContextKey;

      const draft = StorageService.getDraftScheduleSync();

      if (editingSchedule) {
        // User clicked Edit on an existing schedule
        if (draft && draft.editingScheduleId === editingSchedule.id) {
          // Restore draft for this existing schedule
          setServiceType(draft.serviceType || editingSchedule.serviceType);
          setServiceDate(draft.serviceDate || editingSchedule.serviceDate);
          setIsDateManuallyEdited(true);
          setPraiseSongs(draft.praiseSongs?.length ? draft.praiseSongs : ['']);
          setWorshipSongs(draft.worshipSongs?.length ? draft.worshipSongs : ['']);
          setPraiseSongKeys(draft.praiseSongKeys?.length ? draft.praiseSongKeys : ['']);
          setWorshipSongKeys(draft.worshipSongKeys?.length ? draft.worshipSongKeys : ['']);
          setMinistryRows(
            syncMinistryRowsForSongLeaders(
              draft.ministryAssignments?.length
                ? draft.ministryAssignments.map((a: any) => ({
                    ...a,
                    assignedMembers: getAssignmentMembers(a),
                    notes: a.notes || ''
                  }))
                : createDefaultMinistryRows()
            )
          );
        } else {
          // Fresh load of editingSchedule
          setServiceType(editingSchedule.serviceType);
          setServiceDate(editingSchedule.serviceDate);
          setIsDateManuallyEdited(true);
          setPraiseSongs(editingSchedule.praiseSongs.length ? editingSchedule.praiseSongs : ['']);
          setWorshipSongs(editingSchedule.worshipSongs.length ? editingSchedule.worshipSongs : ['']);

          const pKeys = (editingSchedule.praiseSongs.length ? editingSchedule.praiseSongs : ['']).map((s, idx) => {
            if (editingSchedule.praiseSongKeys?.[idx] !== undefined) return editingSchedule.praiseSongKeys[idx];
            const found = allSongs.find(x => x.title.toLowerCase() === s.trim().toLowerCase());
            return found?.originalKey || found?.key || '';
          });
          setPraiseSongKeys(pKeys);

          const wKeys = (editingSchedule.worshipSongs.length ? editingSchedule.worshipSongs : ['']).map((s, idx) => {
            if (editingSchedule.worshipSongKeys?.[idx] !== undefined) return editingSchedule.worshipSongKeys[idx];
            const found = allSongs.find(x => x.title.toLowerCase() === s.trim().toLowerCase());
            return found?.originalKey || found?.key || '';
          });
          setWorshipSongKeys(wKeys);

          setMinistryRows(
            syncMinistryRowsForSongLeaders(
              editingSchedule.ministryAssignments.length
                ? editingSchedule.ministryAssignments.map(a => ({
                    ...a,
                    assignedMembers: getAssignmentMembers(a),
                    notes: a.notes || ''
                  }))
                : createDefaultMinistryRows()
            )
          );
        }
      } else {
        // New Schedule mode
        if (draft && draft.editingScheduleId === null) {
          // Restore draft for new schedule
          setServiceType(draft.serviceType || 'Sunday Service');
          setServiceDate(draft.serviceDate || getManilaTodayString());
          setIsDateManuallyEdited(true);
          setPraiseSongs(draft.praiseSongs?.length ? draft.praiseSongs : ['']);
          setWorshipSongs(draft.worshipSongs?.length ? draft.worshipSongs : ['']);
          setPraiseSongKeys(draft.praiseSongKeys?.length ? draft.praiseSongKeys : ['']);
          setWorshipSongKeys(draft.worshipSongKeys?.length ? draft.worshipSongKeys : ['']);
          setMinistryRows(
            syncMinistryRowsForSongLeaders(
              draft.ministryAssignments?.length
                ? draft.ministryAssignments.map((a: any) => ({
                    ...a,
                    assignedMembers: getAssignmentMembers(a),
                    notes: a.notes || ''
                  }))
                : createDefaultMinistryRows()
            )
          );
        } else {
          // Initialize smart defaults
          const smartInit = getSmartInitialServiceDetails(schedules);
          setServiceType(smartInit.serviceType);
          setServiceDate(smartInit.serviceDate);
          setIsDateManuallyEdited(false);
          setPraiseSongs(['']);
          setWorshipSongs(['']);
          setPraiseSongKeys(['']);
          setWorshipSongKeys(['']);
          setMinistryRows(createDefaultMinistryRows());
        }
      }
    }
  }, [editingSchedule]);

  // Helper to load a schedule object into editor state
  const loadScheduleDataIntoEditor = (sched: Schedule) => {
    setServiceType(sched.serviceType);
    setServiceDate(sched.serviceDate);
    setPraiseSongs(sched.praiseSongs.length ? sched.praiseSongs : ['']);
    setWorshipSongs(sched.worshipSongs.length ? sched.worshipSongs : ['']);

    const pKeys = (sched.praiseSongs.length ? sched.praiseSongs : ['']).map((s, idx) => {
      if (sched.praiseSongKeys?.[idx] !== undefined) return sched.praiseSongKeys[idx];
      const found = allSongs.find(x => x.title.toLowerCase() === s.trim().toLowerCase());
      return found?.originalKey || found?.key || '';
    });
    setPraiseSongKeys(pKeys);

    const wKeys = (sched.worshipSongs.length ? sched.worshipSongs : ['']).map((s, idx) => {
      if (sched.worshipSongKeys?.[idx] !== undefined) return sched.worshipSongKeys[idx];
      const found = allSongs.find(x => x.title.toLowerCase() === s.trim().toLowerCase());
      return found?.originalKey || found?.key || '';
    });
    setWorshipSongKeys(wKeys);

    setMinistryRows(
      syncMinistryRowsForSongLeaders(
        sched.ministryAssignments.length
          ? sched.ministryAssignments.map(a => ({
              ...a,
              assignedMembers: getAssignmentMembers(a),
              notes: a.notes || ''
            }))
          : createDefaultMinistryRows()
      )
    );
  };

  // Handlers for Service Type & Date with smart auto-calculation (NO SILENT OVERWRITES!)
  const handleServiceTypeChange = (newType: ServiceType) => {
    const prevType = serviceType;
    setServiceType(newType);

    let targetDate = serviceDate;

    if (newType === 'Sunday Service') {
      const { dayOfWeek } = getManilaDateParts(serviceDate);
      if (dayOfWeek !== 0 || !isDateManuallyEdited) {
        targetDate = getNextAvailableServiceDate('Sunday Service', schedules);
        setIsDateManuallyEdited(false);
      }
    } else if (newType === 'Midweek Prayer Service') {
      targetDate = getNextAvailableServiceDate('Midweek Prayer Service', schedules);
      setIsDateManuallyEdited(false);
    } else {
      if (!isDateManuallyEdited) {
        targetDate = getNextAvailableServiceDate(newType, schedules);
      }
    }

    setServiceDate(targetDate);

    // Notify Interactive Guide that user selected a Service Type
    window.dispatchEvent(
      new CustomEvent('service-type-user-selected', {
        detail: {
          previousType: prevType,
          serviceType: newType,
          serviceDate: targetDate
        }
      })
    );
  };

  const handleServiceDateChange = (newDate: string) => {
    if (!newDate) return;
    const prevDate = serviceDate;

    if (serviceType === 'Sunday Service') {
      const { dayOfWeek } = getManilaDateParts(newDate);
      if (dayOfWeek !== 0) {
        showToast('Sunday Service lineups must be scheduled on a Sunday.', 'danger');
        return;
      }
    }

    setServiceDate(newDate);
    setIsDateManuallyEdited(true);

    // Notify Interactive Guide that user selected/changed a Service Date
    window.dispatchEvent(
      new CustomEvent('service-date-user-selected', {
        detail: {
          previousDate: prevDate,
          serviceDate: newDate,
          serviceType: serviceType
        }
      })
    );
  };

  // Auto-save draft trigger on any changes to scheduler state
  useEffect(() => {
    const draft: Partial<Schedule> & { version?: number; editingScheduleId?: string | null } = {
      version: 2,
      editingScheduleId: editingSchedule?.id || null,
      serviceType,
      serviceDate,
      praiseSongs,
      worshipSongs,
      praiseSongKeys,
      worshipSongKeys,
      ministryAssignments: ministryRows
    };
    onTriggerDraft(draft);

    // Dispatch custom event so Interactive Guide can detect song additions/playlist imports
    window.dispatchEvent(
      new CustomEvent('lineup-songs-changed', {
        detail: { praiseSongs, worshipSongs }
      })
    );
  }, [serviceType, serviceDate, praiseSongs, worshipSongs, praiseSongKeys, worshipSongKeys, ministryRows, editingSchedule]);

  // Listen for request-lineup-songs and request-service-details from Interactive Guide
  useEffect(() => {
    const handleRequestSongs = () => {
      window.dispatchEvent(
        new CustomEvent('lineup-songs-changed', {
          detail: { praiseSongs, worshipSongs }
        })
      );
    };

    const handleRequestDetails = () => {
      window.dispatchEvent(
        new CustomEvent('service-details-response', {
          detail: { serviceType, serviceDate }
        })
      );
    };

    window.addEventListener('request-lineup-songs', handleRequestSongs);
    window.addEventListener('request-service-details', handleRequestDetails);
    return () => {
      window.removeEventListener('request-lineup-songs', handleRequestSongs);
      window.removeEventListener('request-service-details', handleRequestDetails);
    };
  }, [praiseSongs, worshipSongs, serviceType, serviceDate]);

  // Song input handlers
  const handlePraiseChange = (index: number, value: string) => {
    const updated = [...praiseSongs];
    updated[index] = value;
    setPraiseSongs(updated);

    const matchedSong = allSongs.find(s => s.title.toLowerCase() === value.trim().toLowerCase());
    const updatedKeys = [...praiseSongKeys];
    if (matchedSong) {
      updatedKeys[index] = matchedSong.originalKey || matchedSong.key || '';
    }
    setPraiseSongKeys(updatedKeys);
  };

  const handlePraiseKeyChange = (index: number, keyVal: string) => {
    const updatedKeys = [...praiseSongKeys];
    updatedKeys[index] = keyVal;
    setPraiseSongKeys(updatedKeys);
  };

  const addPraiseSong = () => {
    setPraiseSongs([...praiseSongs, '']);
    setPraiseSongKeys([...praiseSongKeys, '']);
  };

  const removePraiseSong = (index: number) => {
    if (praiseSongs.length <= 1) {
      showToast('At least one praise song box is required.', 'info');
      return;
    }
    setPraiseSongs(praiseSongs.filter((_, i) => i !== index));
    setPraiseSongKeys(praiseSongKeys.filter((_, i) => i !== index));
  };

  const handleWorshipChange = (index: number, value: string) => {
    const updated = [...worshipSongs];
    updated[index] = value;
    setWorshipSongs(updated);

    const matchedSong = allSongs.find(s => s.title.toLowerCase() === value.trim().toLowerCase());
    const updatedKeys = [...worshipSongKeys];
    if (matchedSong) {
      updatedKeys[index] = matchedSong.originalKey || matchedSong.key || '';
    }
    setWorshipSongKeys(updatedKeys);
  };

  const handleWorshipKeyChange = (index: number, keyVal: string) => {
    const updatedKeys = [...worshipSongKeys];
    updatedKeys[index] = keyVal;
    setWorshipSongKeys(updatedKeys);
  };

  const addWorshipSong = () => {
    setWorshipSongs([...worshipSongs, '']);
    setWorshipSongKeys([...worshipSongKeys, '']);
  };

  const removeWorshipSong = (index: number) => {
    if (worshipSongs.length <= 1) {
      showToast('At least one worship song box is required.', 'info');
      return;
    }
    setWorshipSongs(worshipSongs.filter((_, i) => i !== index));
    setWorshipSongKeys(worshipSongKeys.filter((_, i) => i !== index));
  };

  // Handler for adding recommended songs directly into current lineup
  const handleAddRecommendedSong = (category: 'praise' | 'worship', songTitle: string, defaultKey?: string) => {
    if (category === 'praise') {
      if (praiseSongs.length === 1 && praiseSongs[0].trim() === '') {
        setPraiseSongs([songTitle]);
        setPraiseSongKeys([defaultKey || '']);
      } else {
        setPraiseSongs([...praiseSongs, songTitle]);
        setPraiseSongKeys([...praiseSongKeys, defaultKey || '']);
      }
      showToast(`Added "${songTitle}" to Praise songs`, 'success');
    } else {
      if (worshipSongs.length === 1 && worshipSongs[0].trim() === '') {
        setWorshipSongs([songTitle]);
        setWorshipSongKeys([defaultKey || '']);
      } else {
        setWorshipSongs([...worshipSongs, songTitle]);
        setWorshipSongKeys([...worshipSongKeys, defaultKey || '']);
      }
      showToast(`Added "${songTitle}" to Worship songs`, 'success');
    }
  };

  // Helper to sync category changes to database based on lineup position
  const syncCategoriesForLineup = async (praiseList: string[], worshipList: string[]) => {
    const praiseTitles = praiseList.map((s) => s.trim().toLowerCase()).filter(Boolean);
    const worshipTitles = worshipList.map((s) => s.trim().toLowerCase()).filter(Boolean);

    if (praiseTitles.length === 0 && worshipTitles.length === 0) return;

    try {
      const songs = await SongService.getSongs();
      const praiseIds: string[] = [];
      const worshipIds: string[] = [];

      songs.forEach((song) => {
        const titleLower = song.title.trim().toLowerCase();
        if (praiseTitles.includes(titleLower)) {
          praiseIds.push(song.id);
        } else if (worshipTitles.includes(titleLower)) {
          worshipIds.push(song.id);
        }
      });

      if (praiseIds.length > 0) {
        await SongService.bulkUpdateCategory(praiseIds, 'praise');
      }
      if (worshipIds.length > 0) {
        await SongService.bulkUpdateCategory(worshipIds, 'worship');
      }
    } catch (e) {
      console.warn('Failed to sync song categories:', e);
    }
  };

  // Reordering & Category Swap handlers
  const moveSongUp = (category: 'praise' | 'worship', index: number) => {
    if (category === 'praise') {
      if (index > 0) {
        const updated = [...praiseSongs];
        const [moved] = updated.splice(index, 1);
        updated.splice(index - 1, 0, moved);
        setPraiseSongs(updated);

        const updatedKeys = [...praiseSongKeys];
        const [movedKey] = updatedKeys.splice(index, 1);
        updatedKeys.splice(index - 1, 0, movedKey);
        setPraiseSongKeys(updatedKeys);

        syncCategoriesForLineup(updated, worshipSongs);
      }
    } else {
      if (index > 0) {
        const updated = [...worshipSongs];
        const [moved] = updated.splice(index, 1);
        updated.splice(index - 1, 0, moved);
        setWorshipSongs(updated);

        const updatedKeys = [...worshipSongKeys];
        const [movedKey] = updatedKeys.splice(index, 1);
        updatedKeys.splice(index - 1, 0, movedKey);
        setWorshipSongKeys(updatedKeys);

        syncCategoriesForLineup(praiseSongs, updated);
      } else if (index === 0) {
        // Move first worship song to end of praise list
        const songToMove = worshipSongs[0];
        const keyToMove = worshipSongKeys[0] || '';
        if (!songToMove) return;

        const newWorship = worshipSongs.slice(1);
        const newWorshipKeys = worshipSongKeys.slice(1);

        const newPraise = [...praiseSongs, songToMove];
        const newPraiseKeys = [...praiseSongKeys, keyToMove];

        setWorshipSongs(newWorship.length > 0 ? newWorship : ['']);
        setWorshipSongKeys(newWorshipKeys.length > 0 ? newWorshipKeys : ['']);

        setPraiseSongs(newPraise);
        setPraiseSongKeys(newPraiseKeys);

        syncCategoriesForLineup(newPraise, newWorship.length > 0 ? newWorship : ['']);
      }
    }
  };

  const moveSongDown = (category: 'praise' | 'worship', index: number) => {
    if (category === 'praise') {
      if (index < praiseSongs.length - 1) {
        const updated = [...praiseSongs];
        const [moved] = updated.splice(index, 1);
        updated.splice(index + 1, 0, moved);
        setPraiseSongs(updated);

        const updatedKeys = [...praiseSongKeys];
        const [movedKey] = updatedKeys.splice(index, 1);
        updatedKeys.splice(index + 1, 0, movedKey);
        setPraiseSongKeys(updatedKeys);

        syncCategoriesForLineup(updated, worshipSongs);
      } else if (index === praiseSongs.length - 1) {
        // Move last praise song to start of worship list
        const songToMove = praiseSongs[index];
        const keyToMove = praiseSongKeys[index] || '';
        if (!songToMove) return;

        const newPraise = praiseSongs.slice(0, index);
        const newPraiseKeys = praiseSongKeys.slice(0, index);

        const newWorship = [songToMove, ...worshipSongs];
        const newWorshipKeys = [keyToMove, ...worshipSongKeys];

        setPraiseSongs(newPraise.length > 0 ? newPraise : ['']);
        setPraiseSongKeys(newPraiseKeys.length > 0 ? newPraiseKeys : ['']);

        setWorshipSongs(newWorship);
        setWorshipSongKeys(newWorshipKeys);

        syncCategoriesForLineup(newPraise.length > 0 ? newPraise : [''], newWorship);
      }
    } else {
      if (index < worshipSongs.length - 1) {
        const updated = [...worshipSongs];
        const [moved] = updated.splice(index, 1);
        updated.splice(index + 1, 0, moved);
        setWorshipSongs(updated);

        const updatedKeys = [...worshipSongKeys];
        const [movedKey] = updatedKeys.splice(index, 1);
        updatedKeys.splice(index + 1, 0, movedKey);
        setWorshipSongKeys(updatedKeys);

        syncCategoriesForLineup(praiseSongs, updated);
      }
    }
  };

  const changeSongCategory = (fromCategory: 'praise' | 'worship', index: number, toCategory: 'praise' | 'worship') => {
    if (fromCategory === toCategory) return;

    if (fromCategory === 'praise') {
      const songToMove = praiseSongs[index];
      const keyToMove = praiseSongKeys[index] || '';

      const newPraise = praiseSongs.filter((_, i) => i !== index);
      const newPraiseKeys = praiseSongKeys.filter((_, i) => i !== index);

      const newWorship = [...worshipSongs, songToMove];
      const newWorshipKeys = [...worshipSongKeys, keyToMove];

      setPraiseSongs(newPraise.length > 0 ? newPraise : ['']);
      setPraiseSongKeys(newPraiseKeys.length > 0 ? newPraiseKeys : ['']);

      setWorshipSongs(newWorship);
      setWorshipSongKeys(newWorshipKeys);

      syncCategoriesForLineup(newPraise.length > 0 ? newPraise : [''], newWorship);
    } else {
      const songToMove = worshipSongs[index];
      const keyToMove = worshipSongKeys[index] || '';

      const newWorship = worshipSongs.filter((_, i) => i !== index);
      const newWorshipKeys = worshipSongKeys.filter((_, i) => i !== index);

      const newPraise = [...praiseSongs, songToMove];
      const newPraiseKeys = [...praiseSongKeys, keyToMove];

      setWorshipSongs(newWorship.length > 0 ? newWorship : ['']);
      setWorshipSongKeys(newWorshipKeys.length > 0 ? newWorshipKeys : ['']);

      setPraiseSongs(newPraise);
      setPraiseSongKeys(newPraiseKeys);

      syncCategoriesForLineup(newPraise, newWorship.length > 0 ? newWorship : ['']);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, category: 'praise' | 'worship', index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ category, index }));
    setDraggedItem({ category, index });
  };

  const handleDragOver = (e: React.DragEvent, category: 'praise' | 'worship', index: number) => {
    e.preventDefault();
    setDragOverItem({ category, index });
  };

  const handleDrop = (e: React.DragEvent, targetCategory: 'praise' | 'worship', targetIndex: number) => {
    e.preventDefault();
    setDragOverItem(null);
    setDraggedItem(null);

    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const source = JSON.parse(raw) as { category: 'praise' | 'worship'; index: number };

      if (!source || source.category === undefined) return;
      const { category: srcCategory, index: srcIndex } = source;

      let nextPraise = [...praiseSongs];
      let nextPraiseKeys = [...praiseSongKeys];
      let nextWorship = [...worshipSongs];
      let nextWorshipKeys = [...worshipSongKeys];

      if (srcCategory === targetCategory) {
        if (srcCategory === 'praise') {
          const [moved] = nextPraise.splice(srcIndex, 1);
          nextPraise.splice(targetIndex, 0, moved);

          const [movedKey] = nextPraiseKeys.splice(srcIndex, 1);
          nextPraiseKeys.splice(targetIndex, 0, movedKey);
        } else {
          const [moved] = nextWorship.splice(srcIndex, 1);
          nextWorship.splice(targetIndex, 0, moved);

          const [movedKey] = nextWorshipKeys.splice(srcIndex, 1);
          nextWorshipKeys.splice(targetIndex, 0, movedKey);
        }
      } else {
        if (srcCategory === 'praise') {
          const songToMove = nextPraise[srcIndex];
          const keyToMove = nextPraiseKeys[srcIndex] || '';

          nextPraise = nextPraise.filter((_, i) => i !== srcIndex);
          nextPraiseKeys = nextPraiseKeys.filter((_, i) => i !== srcIndex);
          if (nextPraise.length === 0) {
            nextPraise = [''];
            nextPraiseKeys = [''];
          }

          nextWorship.splice(targetIndex, 0, songToMove);
          nextWorshipKeys.splice(targetIndex, 0, keyToMove);
        } else {
          const songToMove = nextWorship[srcIndex];
          const keyToMove = nextWorshipKeys[srcIndex] || '';

          nextWorship = nextWorship.filter((_, i) => i !== srcIndex);
          nextWorshipKeys = nextWorshipKeys.filter((_, i) => i !== srcIndex);
          if (nextWorship.length === 0) {
            nextWorship = [''];
            nextWorshipKeys = [''];
          }

          nextPraise.splice(targetIndex, 0, songToMove);
          nextPraiseKeys.splice(targetIndex, 0, keyToMove);
        }
      }

      setPraiseSongs(nextPraise);
      setPraiseSongKeys(nextPraiseKeys);
      setWorshipSongs(nextWorship);
      setWorshipSongKeys(nextWorshipKeys);

      syncCategoriesForLineup(nextPraise, nextWorship);
    } catch (err) {
      console.error('Drag and drop error:', err);
    }
  };

  // Lineup creation & playlist import handlers
  const executePlaylistReplace = async (importedSongs: Song[], summary: ImportSummary) => {
    if (!importedSongs || importedSongs.length === 0) return;

    const praiseImported = importedSongs.slice(0, 2);
    const worshipImported = importedSongs.slice(2);

    const praiseTitles = praiseImported.map((s) => s.title);
    const worshipTitles = worshipImported.map((s) => s.title);

    const praiseKeys = praiseImported.map((s) => s.originalKey || s.key || '');
    const worshipKeys = worshipImported.map((s) => s.originalKey || s.key || '');

    const newPraise = praiseTitles.length > 0 ? praiseTitles : [''];
    const newWorship = worshipTitles.length > 0 ? worshipTitles : [''];

    setPraiseSongs(newPraise);
    setWorshipSongs(newWorship);

    setPraiseSongKeys(praiseKeys.length > 0 ? praiseKeys : ['']);
    setWorshipSongKeys(worshipKeys.length > 0 ? worshipKeys : ['']);

    await syncCategoriesForLineup(newPraise, newWorship);
    onRefreshSongs();

    showToast(
      `Replaced songs in lineup with imported playlist. (${summary.newlyAdded} new song${summary.newlyAdded === 1 ? '' : 's'} added to database)`,
      'success'
    );

    window.dispatchEvent(
      new CustomEvent('playlist-import-success', {
        detail: { praiseSongs: newPraise, worshipSongs: newWorship, summary }
      })
    );
  };

  const executePlaylistMerge = async (importedSongs: Song[], summary: ImportSummary) => {
    if (!importedSongs || importedSongs.length === 0) return;

    const existingTitlesSet = new Set<string>();
    praiseSongs.forEach((title) => {
      if (title.trim()) existingTitlesSet.add(title.trim().toLowerCase());
    });
    worshipSongs.forEach((title) => {
      if (title.trim()) existingTitlesSet.add(title.trim().toLowerCase());
    });

    const nonDuplicates = importedSongs.filter(
      (s) => !existingTitlesSet.has(s.title.trim().toLowerCase())
    );

    if (nonDuplicates.length === 0) {
      showToast('All imported songs are already present in this lineup.', 'info');
      return;
    }

    const newPraiseImported = nonDuplicates.slice(0, Math.min(2, Math.ceil(nonDuplicates.length / 2)));
    const newWorshipImported = nonDuplicates.slice(newPraiseImported.length);

    const cleanPraise = praiseSongs.filter((s) => Boolean(s.trim()));
    const cleanPraiseKeys = praiseSongKeys.filter((_, idx) => Boolean(praiseSongs[idx]?.trim()));

    const cleanWorship = worshipSongs.filter((s) => Boolean(s.trim()));
    const cleanWorshipKeys = worshipSongKeys.filter((_, idx) => Boolean(worshipSongs[idx]?.trim()));

    const mergedPraiseTitles = [
      ...cleanPraise,
      ...newPraiseImported.map((s) => s.title)
    ];
    const mergedPraiseKeys = [
      ...cleanPraiseKeys,
      ...newPraiseImported.map((s) => s.originalKey || s.key || '')
    ];

    const mergedWorshipTitles = [
      ...cleanWorship,
      ...newWorshipImported.map((s) => s.title)
    ];
    const mergedWorshipKeys = [
      ...cleanWorshipKeys,
      ...newWorshipImported.map((s) => s.originalKey || s.key || '')
    ];

    const finalPraise = mergedPraiseTitles.length > 0 ? mergedPraiseTitles : [''];
    const finalWorship = mergedWorshipTitles.length > 0 ? mergedWorshipTitles : [''];

    setPraiseSongs(finalPraise);
    setPraiseSongKeys(mergedPraiseKeys.length > 0 ? mergedPraiseKeys : ['']);

    setWorshipSongs(finalWorship);
    setWorshipSongKeys(mergedWorshipKeys.length > 0 ? mergedWorshipKeys : ['']);

    await syncCategoriesForLineup(finalPraise, finalWorship);
    onRefreshSongs();

    showToast(
      `Merged ${nonDuplicates.length} new song${nonDuplicates.length === 1 ? '' : 's'} into lineup!`,
      'success'
    );

    window.dispatchEvent(
      new CustomEvent('playlist-import-success', {
        detail: { praiseSongs: finalPraise, worshipSongs: finalWorship, summary }
      })
    );
  };

  const executePlaylistImport = async (importedSongs: Song[], summary: ImportSummary) => {
    executePlaylistReplace(importedSongs, summary);
  };

  const handlePlaylistImportComplete = (importedSongs: Song[], summary: ImportSummary) => {
    if (importedSongs.length === 0) return;

    const hasCurrentSongs =
      praiseSongs.some((s) => Boolean(s.trim())) ||
      worshipSongs.some((s) => Boolean(s.trim()));

    if (hasCurrentSongs) {
      setPendingImportData({ importedSongs, summary });
      setIsConfirmReplaceOpen(true);
    } else {
      executePlaylistImport(importedSongs, summary);
    }
  };

  const handleCreateBlankLineup = () => {
    setPraiseSongs(['']);
    setWorshipSongs(['']);
    setIsImportModalOpen(false);
    showToast('Started blank service line-up.', 'info');
    window.dispatchEvent(
      new CustomEvent('blank-lineup-created', {
        detail: { praiseSongs: [''], worshipSongs: [''] }
      })
    );
  };

  // Ministry handlers & dynamic 1 vs 2 Song Leaders sync
  const syncMinistryRowsForSongLeaders = (rows: MinistryAssignment[]): MinistryAssignment[] => {
    const isLeader = (rName: string) => {
      const r = (rName || '').toLowerCase();
      return r.includes('song leader') || r.includes('worship leader') || r.includes('praise leader') || r.includes('song lead');
    };

    const isBackup = (rName: string) => {
      const r = (rName || '').toLowerCase();
      return r.includes('backup') || r.includes('vocalist');
    };

    const leaderRows = rows.filter((r) => isLeader(r.role));
    const backupRows = rows.filter((r) => isBackup(r.role));
    const otherRows = rows.filter((r) => !isLeader(r.role) && !isBackup(r.role));

    // Extract assigned song leaders
    let leaderMembers: AssignedMember[] = [];
    leaderRows.forEach((r) => {
      const members = getAssignmentMembers(r);
      members.forEach((m) => {
        leaderMembers.push(m);
      });
    });

    const filledLeaderMembers = leaderMembers.filter(
      (m) => Boolean(m.memberId) || (m.memberName && m.memberName !== 'Unassigned' && m.memberName !== '—' && m.memberName !== '')
    );

    const filledPraiseLeaders = leaderRows
      .filter((r) => {
        const rLower = (r.role || '').toLowerCase();
        return rLower.includes('praise') && !rLower.includes('worship');
      })
      .flatMap((r) => getAssignmentMembers(r))
      .filter((m) => Boolean(m.memberId) || (m.memberName && m.memberName !== 'Unassigned' && m.memberName !== '—' && m.memberName !== ''));

    const filledWorshipLeaders = leaderRows
      .filter((r) => {
        const rLower = (r.role || '').toLowerCase();
        return rLower.includes('worship') && !rLower.includes('praise');
      })
      .flatMap((r) => getAssignmentMembers(r))
      .filter((m) => Boolean(m.memberId) || (m.memberName && m.memberName !== 'Unassigned' && m.memberName !== '—' && m.memberName !== ''));

    const hasTwoSeparateFilledLeaders = filledPraiseLeaders.length > 0 && filledWorshipLeaders.length > 0;

    const isTwoLeaders =
      leaderMembers.length >= 2 ||
      filledLeaderMembers.length >= 2 ||
      hasTwoSeparateFilledLeaders;

    if (!isTwoLeaders) {
      // ONE SONG LEADER MODE
      const singleLeader = leaderMembers[0] || { memberId: '', memberName: '' };

      const existingPWLeaderRow = leaderRows.find((r) =>
        r.role.toLowerCase().includes('praise/worship') || r.role.toLowerCase().includes('praise & worship')
      );

      const newLeaderRow: MinistryAssignment = {
        id: existingPWLeaderRow?.id || leaderRows[0]?.id || `m-row-sl-pw-${Date.now()}`,
        role: 'Song Leader (Praise/Worship)',
        assignedMembers: [singleLeader],
        notes: existingPWLeaderRow?.notes || leaderRows[0]?.notes || ''
      };

      // Combine all backup members from any backup rows
      let combinedBackupsRaw: AssignedMember[] = [];
      backupRows.forEach((r) => {
        combinedBackupsRaw.push(...getAssignmentMembers(r));
      });

      // Exclude single leader if assigned
      if (singleLeader.memberId) {
        combinedBackupsRaw = combinedBackupsRaw.filter((m) => m.memberId !== singleLeader.memberId);
      }

      // Deduplicate filled members, but keep empty/unassigned slots so + Add Member works!
      const combinedBackups: AssignedMember[] = [];
      const seenIds = new Set<string>();
      combinedBackupsRaw.forEach((m) => {
        if (m.memberId) {
          if (!seenIds.has(m.memberId)) {
            seenIds.add(m.memberId);
            combinedBackups.push(m);
          }
        } else {
          combinedBackups.push(m);
        }
      });

      const finalBackups = combinedBackups.length > 0 ? combinedBackups : [{ memberId: '', memberName: '' }];

      const existingGenBackupRow = backupRows.find((r) =>
        !r.role.toLowerCase().includes('praise') && !r.role.toLowerCase().includes('worship')
      );

      const newBackupRow: MinistryAssignment = {
        id: existingGenBackupRow?.id || backupRows[0]?.id || `m-row-bu-gen-${Date.now()}`,
        role: 'Backup Singer/s',
        assignedMembers: finalBackups,
        notes: existingGenBackupRow?.notes || backupRows[0]?.notes || ''
      };

      return [newLeaderRow, newBackupRow, ...otherRows];
    } else {
      // TWO SONG LEADERS MODE
      const praiseLeader = leaderMembers[0] || { memberId: '', memberName: '' };
      const worshipLeader = leaderMembers[1] || { memberId: '', memberName: '' };

      const existingPraiseLeaderRow = leaderRows.find((r) =>
        r.role.toLowerCase().includes('praise') && !r.role.toLowerCase().includes('worship')
      );
      const existingWorshipLeaderRow = leaderRows.find((r) =>
        r.role.toLowerCase().includes('worship') && !r.role.toLowerCase().includes('praise')
      );

      const existingPraiseBackupRow = backupRows.find((r) =>
        r.role.toLowerCase().includes('praise') && !r.role.toLowerCase().includes('worship')
      );
      const existingWorshipBackupRow = backupRows.find((r) =>
        r.role.toLowerCase().includes('worship') && !r.role.toLowerCase().includes('praise')
      );
      const existingGenBackupRow = backupRows.find((r) =>
        !r.role.toLowerCase().includes('praise') && !r.role.toLowerCase().includes('worship')
      );

      // Praise Backups
      let pBackupList: AssignedMember[] = [];
      if (existingPraiseBackupRow) {
        pBackupList = getAssignmentMembers(existingPraiseBackupRow);
      } else if (existingGenBackupRow) {
        pBackupList = getAssignmentMembers(existingGenBackupRow);
      }
      if (praiseLeader.memberId) {
        pBackupList = pBackupList.filter((m) => m.memberId !== praiseLeader.memberId);
      }
      if (pBackupList.length === 0) {
        pBackupList = [{ memberId: '', memberName: '' }];
      }

      // Worship Backups
      let wBackupList: AssignedMember[] = [];
      if (existingWorshipBackupRow) {
        wBackupList = getAssignmentMembers(existingWorshipBackupRow);
      } else {
        wBackupList = [{ memberId: '', memberName: '' }];
      }
      if (worshipLeader.memberId) {
        wBackupList = wBackupList.filter((m) => m.memberId !== worshipLeader.memberId);
      }
      if (wBackupList.length === 0) {
        wBackupList = [{ memberId: '', memberName: '' }];
      }

      const praiseLeaderRow: MinistryAssignment = {
        id: existingPraiseLeaderRow?.id || leaderRows[0]?.id || `m-row-sl-praise-${Date.now()}`,
        role: 'Song Leader (Praise)',
        assignedMembers: [praiseLeader],
        notes: existingPraiseLeaderRow?.notes || leaderRows[0]?.notes || ''
      };

      const worshipLeaderRow: MinistryAssignment = {
        id: existingWorshipLeaderRow?.id || leaderRows[1]?.id || `m-row-sl-worship-${Date.now() + 1}`,
        role: 'Song Leader (Worship)',
        assignedMembers: [worshipLeader],
        notes: existingWorshipLeaderRow?.notes || leaderRows[1]?.notes || ''
      };

      const praiseBackupRow: MinistryAssignment = {
        id: existingPraiseBackupRow?.id || backupRows[0]?.id || `m-row-bu-praise-${Date.now() + 2}`,
        role: 'Backup Singer/s (Praise)',
        assignedMembers: pBackupList,
        notes: existingPraiseBackupRow?.notes || backupRows[0]?.notes || ''
      };

      const worshipBackupRow: MinistryAssignment = {
        id: existingWorshipBackupRow?.id || backupRows[1]?.id || `m-row-bu-worship-${Date.now() + 3}`,
        role: 'Backup Singer/s (Worship)',
        assignedMembers: wBackupList,
        notes: existingWorshipBackupRow?.notes || backupRows[1]?.notes || ''
      };

      // REQUIRED ORDER:
      // 1. Song Leader (Praise)
      // 2. Song Leader (Worship)
      // 3. Backup Singer/s (Praise)
      // 4. Backup Singer/s (Worship)
      return [praiseLeaderRow, worshipLeaderRow, praiseBackupRow, worshipBackupRow, ...otherRows];
    }
  };

  const handleMinistryRoleChange = (id: string, newRole: string) => {
    setMinistryRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, role: newRole } : row))
    );
  };

  const handleMinistryNotesChange = (id: string, notes: string) => {
    setMinistryRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, notes } : row))
    );
  };

  const handleAddMemberToMinistry = (rowId: string) => {
    setMinistryRows((rows) => {
      const updated = rows.map((row) => {
        if (row.id !== rowId) return row;
        const current = getAssignmentMembers(row);
        return {
          ...row,
          assignedMembers: [...current, { memberId: '', memberName: '' }]
        };
      });
      return syncMinistryRowsForSongLeaders(updated);
    });
  };

  const handleUpdateMinistryMember = (rowId: string, memberIdx: number, memberId: string) => {
    const memberObj = members.find((m) => m.id === memberId);

    setMinistryRows((rows) => {
      const updated = rows.map((row) => {
        if (row.id === rowId) {
          const current = [...getAssignmentMembers(row)];
          current[memberIdx] = {
            memberId,
            memberName: memberObj ? memberObj.name : ''
          };
          return {
            ...row,
            assignedMembers: current
          };
        }
        return row;
      });
      return syncMinistryRowsForSongLeaders(updated);
    });

    if (memberId) {
      window.dispatchEvent(
        new CustomEvent('team-member-assigned', {
          detail: { rowId, memberId }
        })
      );
    }
  };

  const handleRemoveMemberFromMinistry = (rowId: string, memberIdx: number) => {
    setMinistryRows((rows) => {
      const updated = rows.map((row) => {
        if (row.id !== rowId) return row;
        const current = getAssignmentMembers(row).filter((_, idx) => idx !== memberIdx);
        return {
          ...row,
          assignedMembers: current
        };
      });
      return syncMinistryRowsForSongLeaders(updated);
    });
  };

  const addMinistryRow = () => {
    const newRow: MinistryAssignment = {
      id: `m-row-custom-${Date.now()}`,
      role: '',
      assignedMembers: [{ memberId: '', memberName: '' }],
      notes: ''
    };
    setMinistryRows([...ministryRows, newRow]);
  };

  const removeMinistryRow = (id: string) => {
    setMinistryRows((rows) => syncMinistryRowsForSongLeaders(rows.filter((r) => r.id !== id)));
  };

  // Filter members dropdown helper based on smart role matching & date-aware DA check
  const getFilteredMembers = (roleName: string) => {
    // A member is unavailable for new selection ONLY if isMemberUnderDisciplinary(m, serviceDate) === true.
    const eligibleMembers = members.filter((m) => !isMemberUnderDisciplinary(m, serviceDate));

    // NEW RULE 1: HARD ELIGIBILITY RULE FOR BACKUP SINGER
    // Only members with the "Vocalist" tag may appear in any Backup Singer selection.
    if (isBackupRole(roleName)) {
      return eligibleMembers.filter((m) =>
        m.labels && m.labels.some((lbl) => lbl.trim().toLowerCase() === 'vocalist')
      );
    }

    if (!isSmartFilter || !roleName) return eligibleMembers;

    const lowerRole = roleName.toLowerCase();
    let targetKeywords: string[] = [];

    if (lowerRole.includes('song') || lowerRole.includes('lead') || lowerRole.includes('worship')) {
      targetKeywords = ['song leader', 'worship leader', 'song lead'];
    } else if (lowerRole.includes('guitar')) {
      targetKeywords = ['guitarist'];
    } else if (lowerRole.includes('keyboard') || lowerRole.includes('key')) {
      targetKeywords = ['keyboardist'];
    } else if (lowerRole.includes('bass')) {
      targetKeywords = ['bassist'];
    } else if (lowerRole.includes('drum')) {
      targetKeywords = ['drummer'];
    } else if (lowerRole.includes('audio') || lowerRole.includes('tech') || lowerRole.includes('live') || lowerRole.includes('sound')) {
      targetKeywords = ['audio/live technician', 'technician', 'tech'];
    } else if (lowerRole.includes('lyric') || lowerRole.includes('slides') || lowerRole.includes('av')) {
      targetKeywords = ['lyricist'];
    }

    if (targetKeywords.length === 0) return eligibleMembers;

    return eligibleMembers.filter((m) =>
      m.labels && m.labels.some((lbl) => {
        const lowerLbl = lbl.trim().toLowerCase();
        return targetKeywords.some((kw) => lowerLbl.includes(kw));
      })
    );
  };

  const handleSave = () => {
    const filteredPraise = praiseSongs.map((s) => s.trim()).filter(Boolean);
    const filteredWorship = worshipSongs.map((s) => s.trim()).filter(Boolean);

    if (filteredPraise.length === 0 && filteredWorship.length === 0) {
      showToast('This lineup does not contain any songs. Please add at least one song before using or exporting this lineup.', 'danger');
      return;
    }

    const validAssignments = ministryRows
      .filter((r) => r.role.trim() !== '')
      .map((r) => {
        const rawMembers = getAssignmentMembers(r);
        const validMembers = rawMembers.filter((m) => m.memberId || m.memberName);
        const joinedNames = validMembers.map(m => m.memberName).filter(Boolean).join(', ');

        return {
          id: r.id,
          role: r.role.trim(),
          assignedMembers: validMembers,
          memberId: validMembers[0]?.memberId || '',
          memberName: joinedNames,
          notes: r.notes || ''
        };
      });

    const scheduleData: Omit<Schedule, 'id' | 'updatedAt'> = {
      serviceType,
      serviceDate,
      praiseSongs: filteredPraise,
      worshipSongs: filteredWorship,
      praiseSongKeys: praiseSongs.map((s, i) => praiseSongKeys[i] || '').filter((_, i) => Boolean(praiseSongs[i]?.trim())),
      worshipSongKeys: worshipSongs.map((s, i) => worshipSongKeys[i] || '').filter((_, i) => Boolean(worshipSongs[i]?.trim())),
      ministryAssignments: validAssignments
    };

    // Check if a saved schedule already exists for this exact serviceType + serviceDate
    const conflictingSchedule = schedules.find((s) => {
      if (editingSchedule?.id && s.id === editingSchedule.id) return false;
      if (isScheduleEmpty(s)) return false;
      return s.serviceType === serviceType && s.serviceDate === serviceDate;
    });

    if (conflictingSchedule) {
      setDuplicateConflictSchedule(conflictingSchedule);
      setIsDuplicateModalOpen(true);
      return;
    }

    // Check monthly usage for selected songs
    const allSelectedSongs = Array.from(new Set([...filteredPraise, ...filteredWorship]));
    let songsToCheck = allSelectedSongs;
    const excludeScheduleId = editingSchedule?.id;

    if (editingSchedule && editingSchedule.id) {
      // When editing an existing line-up:
      // Exclude songs that were already part of the original line-up and remain unchanged.
      // Only perform duplicate checks on newly added or replaced songs.
      const originalSongsSet = new Set(
        [
          ...(editingSchedule.praiseSongs || []),
          ...(editingSchedule.worshipSongs || [])
        ]
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      );

      songsToCheck = allSelectedSongs.filter(
        (songTitle) => !originalSongsSet.has(songTitle.trim().toLowerCase())
      );
    }

    const warnings: MonthlyUsageCheckResult[] = [];

    songsToCheck.forEach((songTitle) => {
      const check = SongService.checkMonthlyUsage(
        songTitle,
        serviceDate,
        schedules,
        excludeScheduleId
      );
      if (check.timesUsedThisMonth > 0) {
        warnings.push(check);
      }
    });

    if (warnings.length > 0) {
      setMonthlyWarnings(warnings);
      setPendingSaveData({ data: scheduleData, id: editingSchedule?.id });
      setIsMonthlyModalOpen(true);
      return;
    }

    executeFinalSave(scheduleData, editingSchedule?.id);
  };

  const executeFinalSave = (
    data: Omit<Schedule, 'id' | 'updatedAt'>,
    id?: string
  ) => {
    onSaveSchedule(data, id);
    setIsMonthlyModalOpen(false);
    setMonthlyWarnings([]);
    setPendingSaveData(null);
    window.dispatchEvent(
      new CustomEvent('lineup-saved-success', {
        detail: { data, id }
      })
    );
  };

  const getTempSchedule = (): Schedule => ({
    id: editingSchedule?.id || 'temp',
    serviceType,
    serviceDate,
    praiseSongs: praiseSongs.filter(Boolean),
    worshipSongs: worshipSongs.filter(Boolean),
    praiseSongKeys: praiseSongKeys.filter((_, i) => Boolean(praiseSongs[i]?.trim())),
    worshipSongKeys: worshipSongKeys.filter((_, i) => Boolean(worshipSongs[i]?.trim())),
    ministryAssignments: ministryRows
      .filter((r) => r.role.trim() !== '')
      .map((r) => {
        const rawMembers = getAssignmentMembers(r);
        const validMembers = rawMembers.filter((m) => m.memberId || m.memberName);
        const joinedNames = validMembers.map(m => m.memberName).filter(Boolean).join(', ');

        return {
          id: r.id,
          role: r.role.trim(),
          assignedMembers: validMembers,
          memberId: validMembers[0]?.memberId || '',
          memberName: joinedNames,
          notes: r.notes || ''
        };
      }),
    updatedAt: getManilaNowISO()
  });

  const handleExportPDF = () => {
    const temp = getTempSchedule();
    if (isScheduleEmpty(temp)) {
      showToast('This lineup does not contain any songs. Please add at least one song before using or exporting this lineup.', 'danger');
      return;
    }
    onExportPDF(temp);
    window.dispatchEvent(
      new CustomEvent('lineup-exported-success', {
        detail: { type: 'pdf' }
      })
    );
  };

  const handleExportPNG = () => {
    const temp = getTempSchedule();
    if (isScheduleEmpty(temp)) {
      showToast('This lineup does not contain any songs. Please add at least one song before using or exporting this lineup.', 'danger');
      return;
    }
    onExportPNG(temp);
    window.dispatchEvent(
      new CustomEvent('lineup-exported-success', {
        detail: { type: 'png' }
      })
    );
  };

  return (
    <div data-tour="scheduler-view" className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Church className="w-4 h-4" />
            <span>Word for the World Christian Fellowship • Santa Cruz</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {editingSchedule ? 'Edit Worship Lineup' : 'Song Line-up Scheduler'}
          </h2>
        </div>
        {editingSchedule && (
          <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold uppercase tracking-wide">
            Editing Schedule ({editingSchedule.serviceDate})
          </span>
        )}
      </div>

      {/* Existing Schedule Notice Banner */}
      {(() => {
        const existingMatchingSched = schedules.find(
          (s) => s.serviceType === serviceType && s.serviceDate === serviceDate && s.id !== editingSchedule?.id
        );
        if (!existingMatchingSched) return null;
        return (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                A saved lineup already exists for <strong>{existingMatchingSched.serviceType}</strong> on <strong>{existingMatchingSched.serviceDate}</strong>. Your active draft remains intact.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                loadScheduleDataIntoEditor(existingMatchingSched);
                showToast(`Loaded existing lineup for ${existingMatchingSched.serviceDate}`, 'info');
              }}
              className="px-3 py-1 font-semibold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Load Existing Lineup
            </button>
          </div>
        );
      })()}

      {/* 1. Service Details Section */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Church className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Service Details</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Service Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={serviceType}
              data-tour="service-type-select"
              onChange={(e) => handleServiceTypeChange(e.target.value as ServiceType)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="Sunday Service">Sunday Service</option>
              <option value="Midweek Prayer Service">Midweek Prayer Service</option>
              <option value="Youth Service">Youth Service</option>
              <option value="Special Worship Event">Special Worship Event</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Service Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              data-tour="service-date-picker"
              value={serviceDate}
              onChange={(e) => handleServiceDateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Smart Song Recommendations Panel */}
      <SongRecommendationsPanel
        allSongs={allSongs}
        schedules={schedules}
        currentPraiseSongs={praiseSongs}
        currentWorshipSongs={worshipSongs}
        onAddSong={handleAddRecommendedSong}
        onOpenNewSongModal={() => setIsSongFormOpen(true)}
      />

      {/* 2. Song List Section */}
      <div data-tour="add-songs-section" className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Worship & Praise Songs</span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCreateBlankLineup}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Blank Line-up</span>
            </button>

            <button
              type="button"
              data-tour="import-playlist-btn"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Youtube className="w-4 h-4 text-white" />
              <span>Import YouTube / YT Music Playlist</span>
            </button>
          </div>
        </div>

        <div data-tour="rearrangeable-song-list" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Praise Songs (Fast) */}
          <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                <span>Praise Songs (Fast)</span>
              </h4>
              <button
                type="button"
                onClick={addPraiseSong}
                className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Song</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {praiseSongs.map((song, idx) => {
                const isOver = dragOverItem?.category === 'praise' && dragOverItem.index === idx;
                return (
                  <div
                    key={`praise-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'praise', idx)}
                    onDragOver={(e) => handleDragOver(e, 'praise', idx)}
                    onDrop={(e) => handleDrop(e, 'praise', idx)}
                    className={`group flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-2 bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                      isOver
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                        : 'border-slate-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Top Row on Mobile: Drag, Index, Autocomplete */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-300 p-1 shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-4 text-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex-1 min-w-[180px] sm:min-w-[240px]">
                        <SongAutocomplete
                          value={song}
                          onChange={(val) => handlePraiseChange(idx, val)}
                          category="praise"
                          serviceDate={serviceDate}
                          serviceType={serviceType}
                          allSongs={allSongs}
                          schedules={schedules}
                          excludeScheduleId={editingSchedule?.id}
                          placeholder="Search or enter praise song..."
                          onOpenLibrary={() =>
                            setPickerConfig({ isOpen: true, category: 'praise', songIndex: idx })
                          }
                        />
                      </div>
                    </div>

                    {/* Bottom Row on Mobile / Inline on Desktop: Key, Category, Move, Remove */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto shrink-0 pl-6 sm:pl-0">
                      {/* Performed Key Field */}
                      <div className="w-20 shrink-0" title="Performed Key (defaults to Original Key)">
                        <input
                          type="text"
                          value={praiseSongKeys[idx] || ''}
                          onChange={(e) => handlePraiseKeyChange(idx, e.target.value)}
                          placeholder="Key"
                          className="w-full px-2 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                        />
                      </div>

                      {/* Category Switcher */}
                      <select
                        value="praise"
                        onChange={(e) =>
                          changeSongCategory('praise', idx, e.target.value as 'praise' | 'worship')
                        }
                        className="text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-amber-200 dark:border-amber-900/80 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 outline-none cursor-pointer shrink-0"
                        title="Change Category"
                      >
                        <option value="praise">Praise</option>
                        <option value="worship">Worship</option>
                      </select>

                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSongUp('praise', idx)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent rounded transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSongDown('praise', idx)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent rounded transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removePraiseSong(idx)}
                        className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                        aria-label="Remove song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Worship Songs (Slow) */}
          <div className="p-5 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-indigo-500 fill-indigo-500/20" />
                <span>Worship Songs (Slow)</span>
              </h4>
              <button
                type="button"
                onClick={addWorshipSong}
                className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Song</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {worshipSongs.map((song, idx) => {
                const isOver = dragOverItem?.category === 'worship' && dragOverItem.index === idx;
                return (
                  <div
                    key={`worship-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, 'worship', idx)}
                    onDragOver={(e) => handleDragOver(e, 'worship', idx)}
                    onDrop={(e) => handleDrop(e, 'worship', idx)}
                    className={`group flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-2 bg-white dark:bg-slate-900 rounded-xl border transition-all ${
                      isOver
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                        : 'border-slate-200 dark:border-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Top Row on Mobile: Drag, Index, Autocomplete */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Drag Handle */}
                      <div
                        className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-300 p-1 shrink-0"
                        title="Drag to reorder"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <span className="text-xs font-bold text-slate-300 dark:text-slate-600 w-4 text-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex-1 min-w-[180px] sm:min-w-[240px]">
                        <SongAutocomplete
                          value={song}
                          onChange={(val) => handleWorshipChange(idx, val)}
                          category="worship"
                          serviceDate={serviceDate}
                          serviceType={serviceType}
                          allSongs={allSongs}
                          schedules={schedules}
                          excludeScheduleId={editingSchedule?.id}
                          placeholder="Search or enter worship song..."
                          onOpenLibrary={() =>
                            setPickerConfig({ isOpen: true, category: 'worship', songIndex: idx })
                          }
                        />
                      </div>
                    </div>

                    {/* Bottom Row on Mobile / Inline on Desktop: Key, Category, Move, Remove */}
                    <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto shrink-0 pl-6 sm:pl-0">
                      {/* Performed Key Field */}
                      <div className="w-20 shrink-0" title="Performed Key (defaults to Original Key)">
                        <input
                          type="text"
                          value={worshipSongKeys[idx] || ''}
                          onChange={(e) => handleWorshipKeyChange(idx, e.target.value)}
                          placeholder="Key"
                          className="w-full px-2 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                        />
                      </div>

                      {/* Category Switcher */}
                      <select
                        value="worship"
                        onChange={(e) =>
                          changeSongCategory('worship', idx, e.target.value as 'praise' | 'worship')
                        }
                        className="text-[11px] font-semibold py-1.5 px-2 rounded-lg border border-indigo-200 dark:border-indigo-900/80 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 outline-none cursor-pointer shrink-0"
                        title="Change Category"
                      >
                        <option value="praise">Praise</option>
                        <option value="worship">Worship</option>
                      </select>

                      {/* Move Up/Down Controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSongUp('worship', idx)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent rounded transition-colors cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSongDown('worship', idx)}
                          className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800/50 sm:bg-transparent rounded transition-colors cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeWorshipSong(idx)}
                        className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 rounded transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                        aria-label="Remove song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Ministry Assignment Section */}
      <div data-tour="team-assignments-panel" className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Ministry Assignments</span>
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
              Assign members to worship team roles. System automatically manages Praise & Worship sections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSmartFilter}
                onChange={(e) => setIsSmartFilter(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              <span>Smart filter members</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          {ministryRows.map((row) => {
            const availableMembersForRole = getFilteredMembers(row.role);
            const currentAssigned = getAssignmentMembers(row);

            const isLeaderRow = (row.role || '').toLowerCase().includes('leader');
            const isTwoLeadersActive =
              ministryRows.some((r) => (r.role || '').toLowerCase().includes('praise') && !(r.role || '').toLowerCase().includes('worship') && (r.role || '').toLowerCase().includes('leader')) &&
              ministryRows.some((r) => (r.role || '').toLowerCase().includes('worship') && !(r.role || '').toLowerCase().includes('praise') && (r.role || '').toLowerCase().includes('leader'));

            const hideAddMemberButton = isLeaderRow && (isTwoLeadersActive || currentAssigned.length >= 2);

            return (
              <div
                key={row.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-3 transition-all hover:border-slate-300 dark:hover:border-slate-600"
              >
                {/* Top Row: Role Name, Delete */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={row.role}
                      onChange={(e) => handleMinistryRoleChange(row.id, e.target.value)}
                      placeholder="Ministry Role (e.g. Song Leader (Praise), Backup Singer/s)"
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Delete Ministry Row */}
                  <button
                    type="button"
                    onClick={() => removeMinistryRow(row.id)}
                    className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Delete Ministry Role"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Members List Section */}
                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>Assigned Member(s) ({currentAssigned.length})</span>
                    {!hideAddMemberButton && (
                      <button
                        type="button"
                        onClick={() => handleAddMemberToMinistry(row.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Member</span>
                      </button>
                    )}
                  </div>

                  {currentAssigned.length === 0 ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-700/80">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">N/A</span>
                      {!hideAddMemberButton && (
                        <button
                          type="button"
                          onClick={() => handleAddMemberToMinistry(row.id)}
                          className="px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 rounded border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          + Add Member
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentAssigned.map((am, mIdx) => {
                        const targetRoleLower = (row.role || '').toLowerCase();
                        const isTargetPraiseLeader = targetRoleLower.includes('leader') && targetRoleLower.includes('praise') && !targetRoleLower.includes('worship');
                        const isTargetWorshipLeader = targetRoleLower.includes('leader') && targetRoleLower.includes('worship') && !targetRoleLower.includes('praise');
                        const isTargetGenericLeader = targetRoleLower.includes('leader') && !isTargetPraiseLeader && !isTargetWorshipLeader;

                        const isTargetBackup = isBackupRole(row.role);
                        const isTargetPraiseBackup = isTargetBackup && targetRoleLower.includes('praise') && !targetRoleLower.includes('worship');
                        const isTargetWorshipBackup = isTargetBackup && targetRoleLower.includes('worship') && !targetRoleLower.includes('praise');
                        const isTargetGenericBackup = isTargetBackup && !isTargetPraiseBackup && !isTargetWorshipBackup;

                        const isTargetMusician = isMusicianRole(row.role);

                        let praiseLeaderId = '';
                        let worshipLeaderId = '';
                        let genericLeaderId = '';

                        ministryRows.forEach((r) => {
                          const rLower = (r.role || '').toLowerCase();
                          const membersList = getAssignmentMembers(r);
                          const firstId = membersList[0]?.memberId;
                          if (!firstId) return;

                          if (rLower.includes('leader') && rLower.includes('praise') && !rLower.includes('worship')) {
                            praiseLeaderId = firstId;
                          } else if (rLower.includes('leader') && rLower.includes('worship') && !rLower.includes('praise')) {
                            worshipLeaderId = firstId;
                          } else if (rLower.includes('leader')) {
                            genericLeaderId = firstId;
                          }
                        });

                        const assignedElsewhereIds = new Set<string>();
                        const allAssignedElsewhereIds = new Set<string>();

                        ministryRows.forEach((r) => {
                          const rLower = (r.role || '').toLowerCase();
                          const rIsMusician = isMusicianRole(r.role);

                          const isRPraiseLeader = rLower.includes('leader') && rLower.includes('praise') && !rLower.includes('worship');
                          const isRWorshipLeader = rLower.includes('leader') && rLower.includes('worship') && !rLower.includes('praise');
                          const isRGenericLeader = rLower.includes('leader') && !isRPraiseLeader && !isRWorshipLeader;

                          const isRBackup = isBackupRole(r.role);
                          const isRPraiseBackup = isRBackup && rLower.includes('praise') && !rLower.includes('worship');
                          const isRWorshipBackup = isRBackup && rLower.includes('worship') && !rLower.includes('praise');
                          const isRGenericBackup = isRBackup && !isRPraiseBackup && !isRWorshipBackup;

                          const rMembers = getAssignmentMembers(r);
                          rMembers.forEach((m, idx) => {
                            if (!m.memberId) return;

                            // Skip exact same slot currently being edited
                            if (r.id === row.id && idx === mIdx) return;

                            // Same row, different slot -> cannot assign same member twice in same row
                            if (r.id === row.id && idx !== mIdx) {
                              assignedElsewhereIds.add(m.memberId);
                              return;
                            }

                            // Track members assigned in other rows
                            allAssignedElsewhereIds.add(m.memberId);

                            // 1. MUSICIAN ASSIGNMENT EXCLUSIVITY (NEW RULE 2):
                            // Member assigned to a musician role CANNOT be assigned to any other ministry.
                            if (rIsMusician) {
                              assignedElsewhereIds.add(m.memberId);
                              return;
                            }

                            // 2. SONG LEADER / BACKUP RESTRICTIONS:
                            if (isTargetPraiseLeader) {
                              if (m.memberId === worshipLeaderId || isRWorshipLeader || isRPraiseBackup) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }

                            if (isTargetWorshipLeader) {
                              if (m.memberId === praiseLeaderId || isRPraiseLeader || isRWorshipBackup) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }

                            if (isTargetGenericLeader) {
                              if (isRGenericBackup || isRPraiseBackup || isRWorshipBackup) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }

                            if (isTargetPraiseBackup) {
                              if (m.memberId === praiseLeaderId || isRPraiseLeader) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }

                            if (isTargetWorshipBackup) {
                              if (m.memberId === worshipLeaderId || isRWorshipLeader) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }

                            if (isTargetGenericBackup) {
                              if (m.memberId === genericLeaderId || m.memberId === praiseLeaderId || m.memberId === worshipLeaderId || isRGenericLeader || isRPraiseLeader || isRWorshipLeader) {
                                assignedElsewhereIds.add(m.memberId);
                              }
                              return;
                            }
                          });
                        });

                        // 3. TARGET IS MUSICIAN ROLE:
                        // If target row is a musician role, ANY member assigned anywhere else in the lineup cannot be assigned to this musician role.
                        if (isTargetMusician) {
                          allAssignedElsewhereIds.forEach((id) => assignedElsewhereIds.add(id));
                        }

                        let selectableMembers = availableMembersForRole.filter(
                          (m) => !assignedElsewhereIds.has(m.id)
                        );

                        if (am.memberId) {
                          const currentMemberObj = members.find((m) => m.id === am.memberId);
                          if (currentMemberObj && !assignedElsewhereIds.has(am.memberId) && !selectableMembers.some((m) => m.id === am.memberId)) {
                            selectableMembers = [currentMemberObj, ...selectableMembers];
                          }
                        }

                        return (
                          <div key={mIdx} className="flex items-center gap-2">
                            <select
                              value={am.memberId}
                              onChange={(e) => handleUpdateMinistryMember(row.id, mIdx, e.target.value)}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            >
                              <option value="">-- Select Member --</option>
                              {selectableMembers.map((m) => {
                                const isDA = isMemberUnderDisciplinary(m, serviceDate);
                                return (
                                  <option key={m.id} value={m.id}>
                                    {m.name}{isDA ? ' (DA Active)' : ''} ({sortTags(m.labels).join(', ')})
                                  </option>
                                );
                              })}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRemoveMemberFromMinistry(row.id, mIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer shrink-0"
                              title="Remove Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Row: Assignment Note Input */}
                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-800/50">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={row.notes || ''}
                    onChange={(e) => handleMinistryNotesChange(row.id, e.target.value)}
                    placeholder="Assignment note (e.g., Key of G, Capo 2, Mic 3, IEM Mix 1)"
                    className="w-full px-2 py-0.5 text-[11px] bg-transparent border-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={addMinistryRow}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Ministry Role</span>
          </button>
        </div>
      </div>

      {/* Form Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-tour="save-lineup-btn"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Schedule</span>
          </button>

          <button
            type="button"
            data-tour="export-pdf-btn"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-lg transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Export as PDF</span>
          </button>

          <button
            type="button"
            data-tour="export-png-btn"
            onClick={handleExportPNG}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Image className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Export as PNG</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onResetForm}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Form</span>
        </button>
      </div>

      {/* Monthly Usage Warning Modal */}
      <MonthlyUsageModal
        isOpen={isMonthlyModalOpen}
        warnings={monthlyWarnings}
        monthYearName={
          serviceDate
            ? formatDateDisplayManila(serviceDate, { month: 'long', year: 'numeric' })
            : 'current month'
        }
        onChooseAnother={() => {
          setIsMonthlyModalOpen(false);
          setMonthlyWarnings([]);
          setPendingSaveData(null);
        }}
        onUseAnyway={() => {
          if (pendingSaveData) {
            executeFinalSave(pendingSaveData.data, pendingSaveData.id);
          }
        }}
        onViewExistingLineup={(targetScheduleId) => {
          setIsMonthlyModalOpen(false);
          if (targetScheduleId) {
            const target = schedules.find((s) => s.id === targetScheduleId);
            if (target && onSelectSchedule) {
              onSelectSchedule(target);
              return;
            }
          }
          if (onViewSchedules) {
            onViewSchedules();
          }
        }}
      />

      {/* Song Picker Modal */}
      <SongPickerModal
        isOpen={pickerConfig.isOpen}
        category={pickerConfig.category}
        serviceDate={serviceDate}
        allSongs={allSongs}
        schedules={schedules}
        excludeScheduleId={editingSchedule?.id}
        onClose={() => setPickerConfig({ ...pickerConfig, isOpen: false })}
        onSelectSong={(selectedTitle) => {
          if (pickerConfig.category === 'praise') {
            handlePraiseChange(pickerConfig.songIndex, selectedTitle);
          } else {
            handleWorshipChange(pickerConfig.songIndex, selectedTitle);
          }
        }}
        onAddNewSong={() => {
          setIsSongFormOpen(true);
        }}
      />

      {/* Song Form Modal for adding new song to DB */}
      <SongFormModal
        isOpen={isSongFormOpen}
        onClose={() => setIsSongFormOpen(false)}
        onSave={() => {
          onRefreshSongs();
          setIsSongFormOpen(false);
        }}
        showToast={showToast}
      />

      {/* Lineup Conflict Modal for Replacing or Merging Playlist */}
      <LineupConflictModal
        isOpen={isConfirmReplaceOpen}
        serviceType={serviceType}
        serviceDate={serviceDate}
        onReplace={() => {
          if (pendingImportData) {
            executePlaylistReplace(pendingImportData.importedSongs, pendingImportData.summary);
            setPendingImportData(null);
          }
          setIsConfirmReplaceOpen(false);
        }}
        onMerge={() => {
          if (pendingImportData) {
            executePlaylistMerge(pendingImportData.importedSongs, pendingImportData.summary);
            setPendingImportData(null);
          }
          setIsConfirmReplaceOpen(false);
        }}
        onCancel={() => {
          setPendingImportData(null);
          setIsConfirmReplaceOpen(false);
        }}
      />

      {/* Duplicate Schedule Conflict Modal */}
      {isDuplicateModalOpen && duplicateConflictSchedule && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    Lineup Already Exists
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {serviceType} — {formatDateDisplayManila(serviceDate, { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                A lineup already exists for <strong className="text-indigo-600 dark:text-indigo-400">{serviceType} on {formatDateDisplayManila(serviceDate, { month: 'long', day: 'numeric', year: 'numeric' })}</strong>.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Would you like to load the existing lineup into the editor to view or modify it, or cancel to pick another date?
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDuplicateModalOpen(false);
                    if (onSelectSchedule && duplicateConflictSchedule) {
                      onSelectSchedule(duplicateConflictSchedule);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  Load Existing Lineup
                </button>
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube / YouTube Music Playlist Import Modal */}
      <PlaylistImportModal
        isOpen={isImportModalOpen}
        isEditing={Boolean(editingSchedule)}
        onClose={() => setIsImportModalOpen(false)}
        onSelectBlank={handleCreateBlankLineup}
        onImportComplete={handlePlaylistImportComplete}
        showToast={showToast}
      />
    </div>
  );
};
