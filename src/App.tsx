import React, { useState, useEffect } from 'react';
import { ActiveTab, Member, Schedule, ToastMessage, Song } from './types';
import { StorageService } from './services/storage';
import { SongService } from './services/songService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { SchedulerView } from './components/SchedulerView';
import { SongsView } from './components/SongsView';
import { SchedulesView } from './components/SchedulesView';
import { MemberEditorView } from './components/MemberEditorView';
import { ToastContainer } from './components/ToastContainer';
import { Modal } from './components/Modal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpMenuModal } from './components/HelpMenuModal';
import { InteractiveTourOverlay } from './components/InteractiveTourOverlay';
import { WelcomeGuideModal } from './components/WelcomeGuideModal';
import { NewLineupModal } from './components/NewLineupModal';
import { TransferDataModal } from './components/TransferDataModal';
import { DeleteAllDataModal } from './components/DeleteAllDataModal';
import { exportLineupAsPDF, exportLineupAsPNG } from './services/exportService';
import { sortTags } from './utils/tagUtils';
import { getManilaNowISO, getManilaTodayString } from './utils/dateUtils';
import { getNextAvailableServiceDate, getSmartInitialServiceDetails, ensureMonthlyPlaceholders, isScheduleEmpty } from './utils/scheduleUtils';
import { validateUniqueMemberRoles } from './utils/memberUtils';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => StorageService.getDarkMode());

  // Data State
  const [members, setMembers] = useState<Member[]>(() => StorageService.getMembers());
  const [labels, setLabels] = useState<string[]>(() => StorageService.getLabels());
  const [schedules, setSchedules] = useState<Schedule[]>(() => {
    const loaded = StorageService.getSchedules();
    const currentYM = getManilaTodayString().substring(0, 7);
    const withPlaceholders = ensureMonthlyPlaceholders(currentYM, loaded);
    if (withPlaceholders.length !== loaded.length) {
      StorageService.saveSchedules(withPlaceholders);
    }
    return withPlaceholders;
  });
  const [songs, setSongs] = useState<Song[]>([]);

  // Refresh songs from SongService
  const loadSongs = async () => {
    try {
      const fetched = await SongService.getSongs();
      setSongs(fetched);
    } catch (e) {
      console.error('Failed to load songs:', e);
    }
  };

  useEffect(() => {
    loadSongs();
  }, []);

  // Sync song usage statistics whenever schedules are updated
  useEffect(() => {
    SongService.syncSongUsageFromSchedules(schedules).then(() => {
      loadSongs();
    });
  }, [schedules]);

  // Editing state
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Auto-save draft status
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger?: boolean;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Backup & Restore Modal state
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Transfer Data Modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [initialTransferParams, setInitialTransferParams] = useState<{ sessionId: string; token: string } | null>(null);

  // Auto-detect transfer session from URL parameters (e.g., when scanned via phone camera)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sid = urlParams.get('transferSessionId');
      const tok = urlParams.get('token');
      if (sid && tok) {
        setInitialTransferParams({ sessionId: sid, token: tok });
        setIsTransferModalOpen(true);
        // Clean URL search string without reloading
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (e) {
      console.error('Error parsing transfer URL params:', e);
    }
  }, []);

  // New Lineup Flow Modal state
  const [isNewLineupModalOpen, setIsNewLineupModalOpen] = useState(false);

  // Settings, Welcome & Onboarding Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDeleteAllDataOpen, setIsDeleteAllDataOpen] = useState(false);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [guideInitialStep, setGuideInitialStep] = useState(1);

  useEffect(() => {
    const mode = StorageService.getGuideMode();
    const skippedSession = StorageService.getOnboardingSkippedSession();

    if (skippedSession || mode === 'never') {
      return;
    }

    if (mode === 'every_time') {
      setIsWelcomeModalOpen(true);
    } else if (mode === 'first_visit') {
      const hasVisited = StorageService.hasVisitedBefore();
      if (!hasVisited) {
        setIsWelcomeModalOpen(true);
      }
    }
  }, []);

  const handleReloadAllData = () => {
    setMembers(StorageService.getMembers());
    setLabels(StorageService.getLabels());
    setSchedules(StorageService.getSchedules());
    loadSongs();
  };

  const handleFreshStartReset = () => {
    setMembers([]);
    setLabels(StorageService.getLabelsSync());
    setSchedules([]);
    setSongs([]);
    setEditingSchedule(null);
    setIsDraftSaved(false);
    setActiveTab('dashboard');
  };

  // Dark Mode Sync
  useEffect(() => {
    StorageService.saveDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'danger' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, text, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Schedule Operations
  const handleSaveSchedule = (
    scheduleData: Omit<Schedule, 'id' | 'updatedAt'>,
    id?: string
  ) => {
    let updatedSchedules: Schedule[];

    // Match existing schedule strictly by ID
    const targetId = id && !id.startsWith('placeholder_') ? id : null;
    const existingIndex = targetId ? schedules.findIndex((s) => s.id === targetId) : -1;

    if (existingIndex >= 0 && targetId) {
      // Update existing schedule record
      updatedSchedules = schedules.map((s) =>
        s.id === targetId
          ? { ...scheduleData, id: targetId, updatedAt: getManilaNowISO() }
          : s
      );
      showToast('Worship schedule saved successfully!', 'success');
    } else {
      // Create brand new schedule with unique ID
      const newId = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSchedule: Schedule = {
        ...scheduleData,
        id: newId,
        updatedAt: getManilaNowISO()
      };

      // If replacing a placeholder, remove placeholder and insert new schedule
      if (id && id.startsWith('placeholder_')) {
        updatedSchedules = [newSchedule, ...schedules.filter((s) => s.id !== id)];
      } else {
        updatedSchedules = [newSchedule, ...schedules];
      }
      showToast('New worship schedule saved to history!', 'success');
    }

    setSchedules(updatedSchedules);
    StorageService.saveSchedules(updatedSchedules);
    StorageService.saveDraftSchedule(null);
    setEditingSchedule(null);
    setActiveTab('schedules');
  };

  const handleEditScheduleFromList = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setActiveTab('scheduler');
    showToast(`Loaded lineup for ${schedule.serviceDate} into editor.`, 'info');
  };

  const handleDuplicateSchedule = (schedule: Schedule) => {
    const nextDate = getNextAvailableServiceDate(schedule.serviceType, schedules);
    const duplicated: Schedule = {
      ...schedule,
      id: '',
      serviceDate: nextDate,
      updatedAt: getManilaNowISO()
    };
    setEditingSchedule(duplicated);
    setActiveTab('scheduler');
    showToast('Duplicated schedule ready to edit.', 'info');
  };

  const handleDeleteSchedule = (id: string) => {
    setModalConfig({
      isOpen: true,
      title: 'Delete this line-up?',
      message: 'This action cannot be undone.',
      isDanger: true,
      onConfirm: () => {
        const filtered = schedules.filter((s) => s.id !== id);
        setSchedules(filtered);
        StorageService.saveSchedules(filtered);
        showToast('Line-up deleted.', 'success');
      }
    });
  };

  const handleBulkDeleteSchedules = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    setModalConfig({
      isOpen: true,
      title: `Delete ${ids.length} line-up${ids.length > 1 ? 's' : ''}?`,
      message: 'This action cannot be undone.',
      isDanger: true,
      onConfirm: () => {
        const idSet = new Set(ids);
        const filtered = schedules.filter((s) => !idSet.has(s.id));
        setSchedules(filtered);
        StorageService.saveSchedules(filtered);
        showToast(`Successfully deleted ${ids.length} line-up${ids.length > 1 ? 's' : ''}.`, 'success');
      }
    });
  };

  const handleResetSchedulerForm = () => {
    setModalConfig({
      isOpen: true,
      title: 'Reset Scheduler Form',
      message: 'Are you sure you want to clear all current song inputs and assignments?',
      isDanger: true,
      onConfirm: () => {
        setEditingSchedule(null);
        StorageService.saveDraftSchedule(null);
        showToast('Scheduler form reset.', 'info');
      }
    });
  };

  const handleTriggerDraft = (draft: Partial<Schedule>) => {
    StorageService.saveDraftSchedule(draft);
    setIsDraftSaved(true);
    setTimeout(() => setIsDraftSaved(false), 2000);
  };

  // Member Operations
  const handleAddMember = (memberData: Omit<Member, 'id'>, id?: string) => {
    const uniqueCheck = validateUniqueMemberRoles(memberData.labels, members, id);
    if (!uniqueCheck.isValid) {
      showToast(uniqueCheck.errorMessage || 'Role conflict with existing roster member.', 'danger');
      return;
    }

    let updatedMembers: Member[];
    if (id) {
      updatedMembers = members.map((m) => (m.id === id ? { ...memberData, id } : m));
    } else {
      const newMember: Member = {
        ...memberData,
        id: `m_${Date.now()}`
      };
      updatedMembers = [...members, newMember];
    }

    setMembers(updatedMembers);
    StorageService.saveMembers(updatedMembers);
  };

  const handleDeleteMember = (id: string) => {
    const memberObj = members.find((m) => m.id === id);
    setModalConfig({
      isOpen: true,
      title: 'Delete Member',
      message: `Are you sure you want to remove ${memberObj?.name || 'this member'} from the roster?`,
      isDanger: true,
      onConfirm: () => {
        const filtered = members.filter((m) => m.id !== id);
        setMembers(filtered);
        StorageService.saveMembers(filtered);
        showToast('Member removed from roster.', 'success');
      }
    });
  };

  const handleAddCustomLabel = (newLabel: string) => {
    if (!labels.includes(newLabel)) {
      const updated = sortTags([...labels, newLabel]);
      setLabels(updated);
      StorageService.saveLabels(updated);
    }
  };

  // Export PDF schedule
  const handleExportPDF = async (schedule: Schedule) => {
    if (isScheduleEmpty(schedule)) {
      showToast('This lineup does not contain any songs. Please add at least one song before using or exporting this lineup.', 'danger');
      return;
    }
    try {
      await exportLineupAsPDF(schedule);
      showToast('Worship schedule exported as PDF!', 'success');
    } catch (err) {
      console.error('Failed to export PDF:', err);
      showToast('Failed to export PDF. Please try again.', 'danger');
    }
  };

  // Export PNG schedule
  const handleExportPNG = async (schedule: Schedule) => {
    if (isScheduleEmpty(schedule)) {
      showToast('This lineup does not contain any songs. Please add at least one song before using or exporting this lineup.', 'danger');
      return;
    }
    try {
      await exportLineupAsPNG(schedule);
      showToast('Worship schedule exported as PNG image!', 'success');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      showToast('Failed to export PNG. Please try again.', 'danger');
    }
  };

  const handleUpdateSchedules = (updatedSchedules: Schedule[]) => {
    setSchedules(updatedSchedules);
    StorageService.saveSchedules(updatedSchedules);
  };

  const handleSaveMembers = (updatedMembers: Member[]) => {
    setMembers(updatedMembers);
    StorageService.saveMembers(updatedMembers);
  };

  const handleNewScheduleClick = () => {
    setIsNewLineupModalOpen(true);
  };

  const handleLoadExistingLineup = (schedule: Schedule) => {
    handleEditScheduleFromList(schedule);
  };

  const handleCreateNewLineup = (serviceType: string, serviceDate: string) => {
    const existing = schedules.find(
      (s) => s.serviceType === serviceType && s.serviceDate === serviceDate
    );
    if (existing) {
      handleEditScheduleFromList(existing);
      return;
    }

    const newSchedule: Schedule = {
      id: `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      serviceType: serviceType as any,
      serviceDate: serviceDate,
      praiseSongs: [''],
      worshipSongs: [''],
      praiseSongKeys: [''],
      worshipSongKeys: [''],
      ministryAssignments: [],
      notes: '',
      updatedAt: getManilaNowISO()
    };

    setEditingSchedule(newSchedule);
    StorageService.saveDraftSchedule(null);
    setActiveTab('scheduler');
    showToast(`Created new lineup for ${serviceType} on ${serviceDate}.`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        onOpenBackupRestore={() => setIsBackupModalOpen(true)}
        onOpenTransferData={() => setIsTransferModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpMenuOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          isDraftSaved={isDraftSaved}
          onNewSchedule={handleNewScheduleClick}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              members={members}
              schedules={schedules}
              allSongs={songs}
              setActiveTab={setActiveTab}
              onEditSchedule={handleEditScheduleFromList}
            />
          )}

          {activeTab === 'scheduler' && (
            <SchedulerView
              members={members}
              allSongs={songs}
              schedules={schedules}
              editingSchedule={editingSchedule}
              onSaveSchedule={handleSaveSchedule}
              onExportPDF={handleExportPDF}
              onExportPNG={handleExportPNG}
              onResetForm={handleResetSchedulerForm}
              onTriggerDraft={handleTriggerDraft}
              onRefreshSongs={loadSongs}
              showToast={showToast}
              onSelectSchedule={handleEditScheduleFromList}
              onViewSchedules={() => setActiveTab('schedules')}
            />
          )}

          {activeTab === 'songs' && (
            <SongsView
              songs={songs}
              schedules={schedules}
              onRefreshSongs={loadSongs}
              onUpdateSchedules={handleUpdateSchedules}
              showToast={showToast}
            />
          )}

          {activeTab === 'schedules' && (
            <SchedulesView
              schedules={schedules}
              allSongs={songs}
              onEditSchedule={handleEditScheduleFromList}
              onDuplicateSchedule={handleDuplicateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onBulkDeleteSchedules={handleBulkDeleteSchedules}
              onExportPDF={handleExportPDF}
              onExportPNG={handleExportPNG}
              onUpdateSchedules={handleUpdateSchedules}
            />
          )}

          {activeTab === 'members' && (
            <MemberEditorView
              members={members}
              labels={labels}
              schedules={schedules}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
              onSaveMembers={handleSaveMembers}
              onUpdateSchedules={handleUpdateSchedules}
              onAddCustomLabel={handleAddCustomLabel}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Backup & Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        members={members}
        songs={songs}
        schedules={schedules}
        labels={labels}
        onDataRestored={handleReloadAllData}
        showToast={showToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onOpenOnboarding={() => {
          setGuideInitialStep(1);
          setIsOnboardingOpen(true);
        }}
        onOpenBackupRestore={() => setIsBackupModalOpen(true)}
        onOpenTransferData={() => setIsTransferModalOpen(true)}
        onOpenDeleteAllData={() => setIsDeleteAllDataOpen(true)}
        showToast={showToast}
      />

      {/* Delete All Data / Fresh Start Modal */}
      <DeleteAllDataModal
        isOpen={isDeleteAllDataOpen}
        onClose={() => setIsDeleteAllDataOpen(false)}
        onDataDeleted={handleFreshStartReset}
        showToast={showToast}
      />

      {/* Transfer Data Modal (PC to Phone Data Transfer) */}
      <TransferDataModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setInitialTransferParams(null);
        }}
        members={members}
        songs={songs}
        schedules={schedules}
        labels={labels}
        draftSchedule={StorageService.getDraftSchedule()}
        onDataTransferred={() => {
          setMembers(StorageService.getMembersSync());
          setLabels(StorageService.getLabelsSync());
          setSchedules(StorageService.getSchedulesSync());
          loadSongs();
        }}
        showToast={showToast}
        initialSessionParams={initialTransferParams}
      />

      {/* Welcome Guide Greeting Modal */}
      <WelcomeGuideModal
        isOpen={isWelcomeModalOpen}
        onClose={() => setIsWelcomeModalOpen(false)}
        onStartGuide={() => {
          setGuideInitialStep(1);
          setIsOnboardingOpen(true);
        }}
        showToast={showToast}
      />

      {/* Help Menu Modal */}
      <HelpMenuModal
        isOpen={isHelpMenuOpen}
        onClose={() => setIsHelpMenuOpen(false)}
        onSelectSection={(stepId) => {
          setGuideInitialStep(stepId);
          setIsOnboardingOpen(true);
        }}
      />

      {/* Interactive Guided Tour Overlay */}
      <InteractiveTourOverlay
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        initialStep={guideInitialStep}
      />

      {/* Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
        isDanger={modalConfig.isDanger}
        onConfirm={modalConfig.onConfirm}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* New Lineup Selection Modal */}
      <NewLineupModal
        isOpen={isNewLineupModalOpen}
        onClose={() => setIsNewLineupModalOpen(false)}
        schedules={schedules}
        onLoadExistingLineup={handleLoadExistingLineup}
        onCreateNewLineup={handleCreateNewLineup}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
