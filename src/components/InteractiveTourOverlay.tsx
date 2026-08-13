import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ActiveTab } from '../types';
import { StorageService } from '../services/storage';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  MousePointer,
  Compass,
  ArrowRight,
  CheckCircle2,
  Download
} from 'lucide-react';
import { TourStep, INTERACTIVE_GUIDE_STEPS } from './interactiveGuideSteps';

export type { TourStep };
export { INTERACTIVE_GUIDE_STEPS };

interface InteractiveTourOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  initialStep?: number;
  showToast?: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const InteractiveTourOverlay: React.FC<InteractiveTourOverlayProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  initialStep = 1
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const [isSaveCompletedState, setIsSaveCompletedState] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const currentStepIndexRef = useRef(0);
  const isAdvancingRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync initialStep when changed externally
  useEffect(() => {
    if (isOpen) {
      setIsSaveCompletedState(false);
      const targetIdx = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === initialStep);
      if (targetIdx !== -1) {
        setCurrentStepIndex(targetIdx);
        currentStepIndexRef.current = targetIdx;
      } else if (initialStep >= 1 && initialStep <= INTERACTIVE_GUIDE_STEPS.length) {
        setCurrentStepIndex(initialStep - 1);
        currentStepIndexRef.current = initialStep - 1;
      }
    }
  }, [initialStep, isOpen]);

  const step = INTERACTIVE_GUIDE_STEPS[currentStepIndex] || INTERACTIVE_GUIDE_STEPS[0];

  // Helper function to scroll target element into safe visible area FIRST
  const scrollToTargetElement = (targetSelector: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(false);
        return;
      }

      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (!el) {
        resolve(false);
        return;
      }

      const rect = el.getBoundingClientRect();
      const headerHeight = 70;
      const vh = window.innerHeight;

      // Check if element top and bottom are already comfortably in view
      const isInView = rect.top >= headerHeight + 10 && rect.bottom <= vh - 20;

      if (isInView) {
        resolve(true);
        return;
      }

      // Find appropriate scroll container (window or parent scroll container)
      let scrollContainer: Element | Window = window;
      let curr: Element | null = el.parentElement;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        const style = window.getComputedStyle(curr);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          scrollContainer = curr;
          break;
        }
        curr = curr.parentElement;
      }

      if (scrollContainer === window) {
        const elementAbsoluteTop = rect.top + window.scrollY;
        const targetScrollY = Math.max(0, elementAbsoluteTop - headerHeight - 20);
        window.scrollTo({ top: targetScrollY, behavior: 'smooth' });
      } else {
        const containerRect = (scrollContainer as Element).getBoundingClientRect();
        const relativeTop = rect.top - containerRect.top;
        (scrollContainer as Element).scrollBy({
          top: relativeTop - headerHeight - 20,
          behavior: 'smooth'
        });
      }

      setTimeout(() => {
        resolve(true);
      }, 250);
    });
  };

  // Recalculate spotlight target rect
  const updateTargetRect = () => {
    if (!isOpen || !step) {
      setTargetRect(null);
      return;
    }

    let targetSelector = step.targetSelector;
    if (step.id === 42) {
      const doneBtn = document.querySelector('[data-tour="import-done-btn"]');
      const submitBtn = document.querySelector('[data-tour="import-submit-btn"]');
      const urlInput = document.querySelector('[data-tour="playlist-url-input"]');
      const modalContainer = document.querySelector('[data-tour="import-modal-container"]');
      const importPlaylistBtn = document.querySelector('[data-tour="import-playlist-btn"]');

      if (doneBtn) {
        targetSelector = '[data-tour="import-done-btn"]';
      } else if (submitBtn) {
        targetSelector = '[data-tour="import-submit-btn"]';
      } else if (urlInput) {
        targetSelector = '[data-tour="playlist-url-input"]';
      } else if (modalContainer) {
        targetSelector = '[data-tour="import-modal-container"]';
      } else if (importPlaylistBtn) {
        targetSelector = '[data-tour="import-playlist-btn"]';
      }
    }

    const el = document.querySelector(targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  };

  // Step transition effect: Switch tab & scroll target into view FIRST before revealing step
  useEffect(() => {
    if (!isOpen || !step) return;

    let isMounted = true;
    setIsTransitioning(true);

    const performStepNavigation = async () => {
      // 1. Ensure target tab is active
      if (activeTab !== step.targetTab) {
        setActiveTab(step.targetTab);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }

      let selector = step.targetSelector;
      if (step.id === 42) {
        const doneBtn = document.querySelector('[data-tour="import-done-btn"]');
        const submitBtn = document.querySelector('[data-tour="import-submit-btn"]');
        const urlInput = document.querySelector('[data-tour="playlist-url-input"]');
        const modalContainer = document.querySelector('[data-tour="import-modal-container"]');
        const importPlaylistBtn = document.querySelector('[data-tour="import-playlist-btn"]');

        if (doneBtn) selector = '[data-tour="import-done-btn"]';
        else if (submitBtn) selector = '[data-tour="import-submit-btn"]';
        else if (urlInput) selector = '[data-tour="playlist-url-input"]';
        else if (modalContainer) selector = '[data-tour="import-modal-container"]';
        else if (importPlaylistBtn) selector = '[data-tour="import-playlist-btn"]';
      }

      // 2. Scroll to target element FIRST
      await scrollToTargetElement(selector);

      if (isMounted) {
        updateTargetRect();
        setIsTransitioning(false);
      }
    };

    performStepNavigation();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentStepIndex, step?.id]);

  useLayoutEffect(() => {
    updateTargetRect();
    const timer = setTimeout(updateTargetRect, 200);
    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, activeTab]);

  // Continuous polling and resize/scroll listeners for live target rect updates
  useEffect(() => {
    if (!isOpen) return;

    const handleResizeOrScroll = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    // Polling interval to catch dynamically rendered elements, tab switches, and modal opens
    const interval = setInterval(updateTargetRect, 150);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
      clearInterval(interval);
    };
  }, [isOpen, currentStepIndex, activeTab]);

  // Specialized State Detector for Step 2 (Service Type) & Step 3 (Service Date)
  const currentServiceTypeRef = useRef<string>('Sunday Service');

  useEffect(() => {
    if (!isOpen) return;

    const handleServiceDetailsResponse = (e: Event) => {
      const customEvt = e as CustomEvent<{ serviceType: string; serviceDate: string }>;
      if (customEvt.detail?.serviceType) {
        currentServiceTypeRef.current = customEvt.detail.serviceType;
      }
    };

    const handleServiceTypeSelected = (e: Event) => {
      const customEvt = e as CustomEvent<{ previousType?: string; serviceType: string; serviceDate?: string }>;
      if (!customEvt.detail?.serviceType) return;

      const newType = customEvt.detail.serviceType;
      currentServiceTypeRef.current = newType;
      // Do NOT auto-advance step 2. The guide remains on Service Type step until user presses Next Step.
    };

    const handleServiceDateSelected = (e: Event) => {
      const customEvt = e as CustomEvent<{ previousDate?: string; serviceDate: string; serviceType?: string }>;
      if (!customEvt.detail?.serviceDate) return;

      const selectedDate = customEvt.detail.serviceDate;
      const sType = customEvt.detail.serviceType || currentServiceTypeRef.current || 'Sunday Service';

      // Validate date string format (YYYY-MM-DD)
      if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) return;

      // Sunday Service validation: selected date must be a Sunday
      if (sType === 'Sunday Service') {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dt = new Date(Date.UTC(year, month - 1, day));
        if (dt.getUTCDay() !== 0) {
          return;
        }
      }
      // Do NOT auto-advance step 3. The guide remains on Service Date step until user presses Next Step.
    };

    window.addEventListener('service-details-response', handleServiceDetailsResponse);
    window.addEventListener('service-type-user-selected', handleServiceTypeSelected);
    window.addEventListener('service-date-user-selected', handleServiceDateSelected);

    // Request initial service details from SchedulerView
    window.dispatchEvent(new CustomEvent('request-service-details'));

    return () => {
      window.removeEventListener('service-details-response', handleServiceDetailsResponse);
      window.removeEventListener('service-type-user-selected', handleServiceTypeSelected);
      window.removeEventListener('service-date-user-selected', handleServiceDateSelected);
    };
  }, [isOpen, step, currentStepIndex]);

  // Specialized State Detector for Step 4, 4A, 4B (Add Songs / Import Playlist)
  const step4InitialSongsRef = useRef<Set<string> | null>(null);
  const step4InitializedRef = useRef<boolean>(false);
  const step4PendingModalCloseRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen || !step) return;

    // Helper to advance to Step 5 (Arrange Songs)
    const advanceToStep5 = () => {
      if (isAdvancingRef.current) return;
      isAdvancingRef.current = true;

      setTimeout(() => {
        const arrangeSongsIndex = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 5);
        const nextIndex = arrangeSongsIndex !== -1 ? arrangeSongsIndex : currentStepIndexRef.current + 1;
        currentStepIndexRef.current = nextIndex;
        setCurrentStepIndex(nextIndex);
        setTimeout(() => {
          isAdvancingRef.current = false;
        }, 300);
      }, 50);
    };

    // Periodically check if import modal closed while pending step 5
    const modalCheckInterval = setInterval(() => {
      if (step4PendingModalCloseRef.current) {
        const modalContainer = document.querySelector('[data-tour="import-modal-container"]');
        if (!modalContainer) {
          step4PendingModalCloseRef.current = false;
          advanceToStep5();
        }
      }
    }, 150);

    // 1. Direct handler for playlist import success event
    const handlePlaylistImportSuccess = (e: Event) => {
      if (step.id === 4 || step.id === 41 || step.id === 42) {
        const customEvt = e as CustomEvent<{ praiseSongs?: string[]; worshipSongs?: string[] }>;
        const pSongs = customEvt.detail?.praiseSongs || [];
        const wSongs = customEvt.detail?.worshipSongs || [];
        const totalSongs = [...pSongs, ...wSongs].filter((s) => s && s.trim().length > 0);
        if (totalSongs.length > 0) {
          const isModalOpen = Boolean(
            document.querySelector('[data-tour="import-done-btn"]') ||
            document.querySelector('[data-tour="import-modal-container"]')
          );
          if (isModalOpen) {
            step4PendingModalCloseRef.current = true;
          } else {
            advanceToStep5();
          }
        }
      }
    };

    // 2. Direct handler for blank lineup created event
    const handleBlankLineupCreated = () => {
      if (step.id === 4 || step.id === 41 || step.id === 42) {
        advanceToStep5();
      }
    };

    // 3. Helper to evaluate if songs were added or imported via lineup-songs-changed
    const evaluateStep4Songs = (praiseSongs: string[], worshipSongs: string[]) => {
      if (isAdvancingRef.current) return;
      if (step.id !== 4 && step.id !== 41) return;

      const currentNonEmpty = [...praiseSongs, ...worshipSongs]
        .map((s) => (s || '').trim().toLowerCase())
        .filter(Boolean);

      // Initialize baseline on first event
      if (!step4InitializedRef.current || step4InitialSongsRef.current === null) {
        step4InitialSongsRef.current = new Set(currentNonEmpty);
        step4InitializedRef.current = true;
        return;
      }

      const initialSet = step4InitialSongsRef.current;
      const initialSize = initialSet.size;

      let isSuccess = false;

      if (initialSize === 0) {
        // Lineup was empty initially: successfully completed if at least 1 non-empty song exists now
        if (currentNonEmpty.length > 0) {
          isSuccess = true;
        }
      } else {
        // Lineup had existing songs initially:
        // Complete if song count increased OR a new non-empty song title is present that wasn't in initial set
        if (currentNonEmpty.length > initialSize) {
          isSuccess = true;
        } else if (currentNonEmpty.some((song) => !initialSet.has(song))) {
          isSuccess = true;
        }
      }

      if (isSuccess) {
        advanceToStep5();
      }
    };

    // Handler for custom lineup-songs-changed event
    const handleLineupSongsChanged = (e: Event) => {
      const customEvt = e as CustomEvent<{ praiseSongs: string[]; worshipSongs: string[] }>;
      if (customEvt.detail) {
        const { praiseSongs = [], worshipSongs = [] } = customEvt.detail;
        evaluateStep4Songs(praiseSongs, worshipSongs);
      }
    };

    // Handlers for Save and Export events
    const handleLineupSavedSuccess = () => {
      if (step.id === 7) {
        if (isAdvancingRef.current) return;
        isAdvancingRef.current = true;
        setTimeout(() => {
          const exportIndex = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 8);
          const nextIndex = exportIndex !== -1 ? exportIndex : currentStepIndexRef.current + 1;
          currentStepIndexRef.current = nextIndex;
          setCurrentStepIndex(nextIndex);
          setTimeout(() => {
            isAdvancingRef.current = false;
          }, 300);
        }, 50);
      }
    };

    const handleLineupExportedSuccess = () => {
      if (step.id === 8) {
        if (isAdvancingRef.current) return;
        isAdvancingRef.current = true;
        setTimeout(() => {
          setIsSaveCompletedState(true);
          setTimeout(() => {
            isAdvancingRef.current = false;
          }, 300);
        }, 50);
      }
    };

    window.addEventListener('playlist-import-success', handlePlaylistImportSuccess);
    window.addEventListener('blank-lineup-created', handleBlankLineupCreated);
    window.addEventListener('lineup-songs-changed', handleLineupSongsChanged);
    window.addEventListener('lineup-saved-success', handleLineupSavedSuccess);
    window.addEventListener('lineup-exported-success', handleLineupExportedSuccess);

    if (step.id === 4 || step.id === 41 || step.id === 42) {
      // Request current lineup state from SchedulerView
      window.dispatchEvent(new CustomEvent('request-lineup-songs'));
    }

    return () => {
      clearInterval(modalCheckInterval);
      window.removeEventListener('playlist-import-success', handlePlaylistImportSuccess);
      window.removeEventListener('blank-lineup-created', handleBlankLineupCreated);
      window.removeEventListener('lineup-songs-changed', handleLineupSongsChanged);
      window.removeEventListener('lineup-saved-success', handleLineupSavedSuccess);
      window.removeEventListener('lineup-exported-success', handleLineupExportedSuccess);
    };
  }, [isOpen, currentStepIndex, step]);

  // Listen to user interaction on target element dynamically (non-blocking capture phase)
  useEffect(() => {
    if (!isOpen || !step || step.actionType === 'none') return;

    const handleGlobalInteraction = (e: Event) => {
      if (isAdvancingRef.current) return;

      const targetEl = document.querySelector(step.targetSelector);
      if (!targetEl) return;

      const eventTarget = e.target as Node | null;
      if (!eventTarget) return;

      // Check if event occurred on or inside targetEl
      const isTargetMatch = targetEl === eventTarget || targetEl.contains(eventTarget);
      if (!isTargetMatch) return;

      // Validate action type
      if (step.actionType === 'click') {
        if (e.type !== 'click' && e.type !== 'pointerup') return;
      } else if (step.actionType === 'input') {
        if (e.type !== 'input' && e.type !== 'change' && e.type !== 'keyup') return;
        const inputEl = eventTarget as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (inputEl && inputEl.value !== undefined) {
          if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
            if (!(inputEl as HTMLInputElement).checked) return;
          } else {
            // Text input: must have non-empty value
            if (!inputEl.value || inputEl.value.trim().length === 0) return;
          }
        }
      }

      // Valid action detected: silently auto-advance to the next step
      isAdvancingRef.current = true;

      setTimeout(() => {
        if (currentStepIndexRef.current < INTERACTIVE_GUIDE_STEPS.length - 1) {
          const nextIndex = currentStepIndexRef.current + 1;
          currentStepIndexRef.current = nextIndex;
          setCurrentStepIndex(nextIndex);
        }
        setTimeout(() => {
          isAdvancingRef.current = false;
        }, 300);
      }, 50);
    };

    window.addEventListener('click', handleGlobalInteraction, true);
    window.addEventListener('input', handleGlobalInteraction, true);
    window.addEventListener('change', handleGlobalInteraction, true);
    window.addEventListener('pointerup', handleGlobalInteraction, true);

    return () => {
      window.removeEventListener('click', handleGlobalInteraction, true);
      window.removeEventListener('input', handleGlobalInteraction, true);
      window.removeEventListener('change', handleGlobalInteraction, true);
      window.removeEventListener('pointerup', handleGlobalInteraction, true);
    };
  }, [isOpen, currentStepIndex, step]);

  // REMOVED: Auto-open YouTube Playlist Import Modal when entering Step 4B
  // The Interactive Guide is strictly a tutorial/demo layer and must NEVER programmatically click real buttons or open real modals.

  if (!isOpen) return null;

  const getNextButtonLabel = () => {
    if (step.id === 7) return 'Finish Guide';
    if (step.id === 8 || step.id >= 10) return 'Finish Topic';
    return 'Next Step';
  };

  const handleNext = () => {
    if (step.id === 4) {
      const idx4a = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 41);
      if (idx4a !== -1) {
        setCurrentStepIndex(idx4a);
        currentStepIndexRef.current = idx4a;
        return;
      }
    } else if (step.id === 41 || step.id === 42) {
      const idx5 = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 5);
      if (idx5 !== -1) {
        setCurrentStepIndex(idx5);
        currentStepIndexRef.current = idx5;
        return;
      }
    } else if (step.id === 7 || step.id === 8 || step.id >= 10) {
      handleComplete();
      return;
    }

    if (currentStepIndex < INTERACTIVE_GUIDE_STEPS.length - 1) {
      const next = currentStepIndex + 1;
      setCurrentStepIndex(next);
      currentStepIndexRef.current = next;
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step.id === 41 || step.id === 42 || step.id === 5) {
      const idx4 = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 4);
      if (idx4 !== -1) {
        setCurrentStepIndex(idx4);
        currentStepIndexRef.current = idx4;
        return;
      }
    }

    if (currentStepIndex > 0) {
      const prev = currentStepIndex - 1;
      setCurrentStepIndex(prev);
      currentStepIndexRef.current = prev;
    }
  };

  const handleSkip = () => {
    StorageService.setOnboardingSkippedSession(true);
    onClose();
  };

  const handleNeverShow = () => {
    StorageService.setOnboardingDisabled(true);
    onClose();
  };

  const handleComplete = () => {
    StorageService.setOnboardingDisabled(true);
    onClose();
  };

  const totalSteps = INTERACTIVE_GUIDE_STEPS.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const getStepBadgeText = () => {
    if (step.id === 41) return 'Step 4A of 7';
    if (step.id === 42) return 'Step 4B of 7';
    if (step.id <= 7) return `Step ${step.id} of 7`;
    return 'Help Topic';
  };

  const getProgressPercent = () => {
    if (step.id === 41 || step.id === 42) return (4 / 7) * 100;
    if (step.id <= 7) return (step.id / 7) * 100;
    return 100;
  };

  // Detect real-time modal state for Step 4B & general modal detection
  const modalEl = typeof document !== 'undefined' ? document.querySelector('[data-tour="import-modal-container"]') : null;
  const isImportModalOpen = Boolean(
    typeof document !== 'undefined' &&
    (document.querySelector('[data-tour="playlist-url-input"]') || modalEl)
  );

  const isImportModalLoading = Boolean(
    typeof document !== 'undefined' &&
    (modalEl?.textContent?.includes('Importing...') || modalEl?.querySelector('.animate-spin'))
  );

  const isImportModalPreviewTab = Boolean(
    typeof document !== 'undefined' &&
    document.querySelector('[data-tour="import-submit-btn"]')
  );

  const isImportModalDoneTab = Boolean(
    typeof document !== 'undefined' &&
    document.querySelector('[data-tour="import-done-btn"]')
  );

  let effectiveStepTitle = step.stepTitle;
  let effectiveActionPrompt = step.actionPrompt;
  let effectiveDescription = step.description;

  if (step.id === 42) {
    if (isImportModalOpen) {
      effectiveStepTitle = 'Step 4B: Import Your Playlist';
      if (isImportModalLoading) {
        effectiveActionPrompt = 'Importing playlist... Please wait.';
        effectiveDescription = 'Fetching playlist songs and populating your worship lineup.';
      } else if (isImportModalDoneTab) {
        effectiveActionPrompt = 'Your songs were imported. Click "Done & Edit Line-up" to continue.';
        effectiveDescription = 'Review your import summary and click Done & Edit Line-up to open the lineup editor.';
      } else if (isImportModalPreviewTab) {
        effectiveActionPrompt = 'Review your songs, then click "Import Selected Songs".';
        effectiveDescription = 'Select or deselect songs as needed, then click the Import button to populate your line-up.';
      } else {
        effectiveActionPrompt = 'Paste your YouTube or YouTube Music playlist link, then click Import.';
        effectiveDescription = 'Paste your playlist link into the field and click Import Playlist to fetch worship songs.';
      }
    } else {
      effectiveStepTitle = 'Step 4B: Import YouTube Playlist';
      effectiveActionPrompt = 'Click "Import YouTube / YT Music Playlist" to open the playlist importer.';
      effectiveDescription = 'Click the highlighted button on the page to open the YouTube playlist importer modal.';
    }
  }

  // Calculate Popover Position to dynamically prevent clipping and overlapping target/modal
  const getPopoverStyle = (): React.CSSProperties => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const popoverWidth = popoverRef.current?.offsetWidth || 380;
    const popoverHeight = popoverRef.current?.offsetHeight || 280;

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const headerHeight = 70;
    const sidebarWidth = vw >= 1024 ? 256 : 0;

    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 9995,
      transition: 'top 0.2s ease-out, left 0.2s ease-out, bottom 0.2s ease-out, right 0.2s ease-out, opacity 0.2s ease-out',
      opacity: isTransitioning ? 0 : 1
    };

    if (isMobile) {
      if (targetRect) {
        const targetCenterY = targetRect.top + targetRect.height / 2;
        if (targetCenterY > vh / 2) {
          return {
            ...baseStyle,
            top: `${headerHeight + 12}px`,
            left: '12px',
            right: '12px',
            maxHeight: `${Math.min(320, vh - headerHeight - 24)}px`
          };
        }
      }
      return {
        ...baseStyle,
        bottom: '12px',
        left: '12px',
        right: '12px',
        maxHeight: `${Math.min(320, vh - 24)}px`
      };
    }

    if (isImportModalOpen || modalEl) {
      return {
        ...baseStyle,
        bottom: '24px',
        right: '24px',
        width: '380px'
      };
    }

    if (!targetRect) {
      return {
        ...baseStyle,
        bottom: '24px',
        right: '24px',
        width: '380px'
      };
    }

    const T = {
      left: targetRect.left - 8,
      top: targetRect.top - 8,
      right: targetRect.right + 8,
      bottom: targetRect.bottom + 8,
      width: targetRect.width + 16,
      height: targetRect.height + 16
    };

    const PW = Math.min(popoverWidth, vw - sidebarWidth - 32);
    const PH = popoverHeight;

    const overlaps = (pLeft: number, pTop: number, pW: number, pH: number) => {
      const pRight = pLeft + pW;
      const pBottom = pTop + pH;
      const margin = 8;
      return !(
        pRight + margin <= T.left ||
        pLeft >= T.right + margin ||
        pBottom + margin <= T.top ||
        pTop >= T.bottom + margin
      );
    };

    // Candidate 1: Below Target
    {
      const pTop = T.bottom + 16;
      let pLeft = T.left;
      if (pLeft + PW > vw - 16) pLeft = vw - PW - 16;
      if (pLeft < sidebarWidth + 16) pLeft = sidebarWidth + 16;

      if (pTop + PH <= vh - 16 && !overlaps(pLeft, pTop, PW, PH)) {
        return { ...baseStyle, top: `${pTop}px`, left: `${pLeft}px`, width: `${PW}px` };
      }
    }

    // Candidate 2: Above Target
    {
      const pTop = T.top - PH - 16;
      let pLeft = T.left;
      if (pLeft + PW > vw - 16) pLeft = vw - PW - 16;
      if (pLeft < sidebarWidth + 16) pLeft = sidebarWidth + 16;

      if (pTop >= headerHeight + 16 && !overlaps(pLeft, pTop, PW, PH)) {
        return { ...baseStyle, top: `${pTop}px`, left: `${pLeft}px`, width: `${PW}px` };
      }
    }

    // Candidate 3: Right of Target
    {
      const pLeft = T.right + 16;
      let pTop = T.top;
      if (pTop + PH > vh - 16) pTop = vh - PH - 16;
      if (pTop < headerHeight + 16) pTop = headerHeight + 16;

      if (pLeft + PW <= vw - 16 && !overlaps(pLeft, pTop, PW, PH)) {
        return { ...baseStyle, top: `${pTop}px`, left: `${pLeft}px`, width: `${PW}px` };
      }
    }

    // Candidate 4: Left of Target
    {
      const pLeft = T.left - PW - 16;
      let pTop = T.top;
      if (pTop + PH > vh - 16) pTop = vh - PH - 16;
      if (pTop < headerHeight + 16) pTop = headerHeight + 16;

      if (pLeft >= sidebarWidth + 16 && !overlaps(pLeft, pTop, PW, PH)) {
        return { ...baseStyle, top: `${pTop}px`, left: `${pLeft}px`, width: `${PW}px` };
      }
    }

    // Candidate 5: Corners
    const corners = [
      { pLeft: vw - PW - 16, pTop: vh - PH - 16 },
      { pLeft: sidebarWidth + 16, pTop: vh - PH - 16 },
      { pLeft: vw - PW - 16, pTop: headerHeight + 16 },
      { pLeft: sidebarWidth + 16, pTop: headerHeight + 16 }
    ];

    for (const corner of corners) {
      if (!overlaps(corner.pLeft, corner.pTop, PW, PH)) {
        return { ...baseStyle, top: `${corner.pTop}px`, left: `${corner.pLeft}px`, width: `${PW}px` };
      }
    }

    // Fallback: Safe corner positioning
    const pLeft = Math.max(sidebarWidth + 16, vw - PW - 16);
    const pTop = Math.max(headerHeight + 16, vh - PH - 16);

    return {
      ...baseStyle,
      top: `${pTop}px`,
      left: `${pLeft}px`,
      width: `${PW}px`
    };
  };

  const popoverStyle = getPopoverStyle();

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none select-none animate-in fade-in duration-200">
      
      {/* Non-blocking SVG Dimmed Background with Cutout Mask around target element */}
      {targetRect ? (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[9991]">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.20)"
            mask="url(#tour-spotlight-mask)"
          />
          {/* Animated Ring around highlighted target */}
          <rect
            x={targetRect.left - 6}
            y={targetRect.top - 6}
            width={targetRect.width + 12}
            height={targetRect.height + 12}
            rx="12"
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            className="animate-pulse"
          />
        </svg>
      ) : (
        <div className="absolute inset-0 bg-slate-950/15 pointer-events-none z-[9991]" />
      )}

      {/* Popover Guide Tooltip Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="pointer-events-auto z-[9995] w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 animate-in zoom-in-95"
      >
        {/* Card Header & Progress */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {getStepBadgeText()}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                {step.sectionTitle}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
                title="Jump to Topic"
              >
                <Compass className="w-4 h-4" />
                <span className="hidden sm:inline">Topics</span>
              </button>

              <button
                onClick={handleSkip}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Exit Guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
        </div>

        {/* Topic Selector Dropdown Overlay */}
        {isTopicMenuOpen && (
          <div className="p-3 bg-slate-900 text-white max-h-56 overflow-y-auto space-y-1 text-xs border-b border-slate-800 animate-in slide-in-from-top-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1">
              Select Guide / Help Topic
            </p>
            {[
              { label: 'Create a Line-up (Basic Guide)', id: 1 },
              { label: 'Help: Song Database', id: 11 },
              { label: 'Help: Import YouTube Playlist', id: 42 },
              { label: 'Help: Saved Line-ups Archive', id: 10 },
              { label: 'Help: Member Roster & Editor', id: 12 },
              { label: 'Help: Member Assignment', id: 6 },
              { label: 'Help: Export PDF / PNG', id: 8 },
              { label: 'Help: Service Types & Dates', id: 2 },
              { label: 'Help: Song Repetition Detection', id: 13 },
              { label: 'Help: Application Settings', id: 14 },
              { label: 'Help: Backup & Restore Data', id: 15 }
            ].map((topic) => (
              <button
                key={topic.id}
                onClick={() => {
                  const targetIdx = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === topic.id);
                  if (targetIdx !== -1) {
                    setCurrentStepIndex(targetIdx);
                    currentStepIndexRef.current = targetIdx;
                  }
                  setIsTopicMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  step.id === topic.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{topic.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            ))}
          </div>
        )}

        {/* Card Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto max-h-[50vh] sm:max-h-[380px]">
          {isSaveCompletedState ? (
            <div className="p-4 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  You're all set!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Your lineup creation is complete.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsSaveCompletedState(false);
                  handleComplete();
                }}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Finish Guide
              </button>
            </div>
          ) : step.id === 8 ? (
            <div className="space-y-3.5">
              <div>
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Line-up Saved Successfully</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Your lineup has been saved.
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Would you like to export it?
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const pdfBtn = document.querySelector<HTMLButtonElement>('[data-tour="export-pdf-btn"]');
                    if (pdfBtn) pdfBtn.click();
                  }}
                  className="p-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                        <span>Export PDF</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Generate formatted PDF document for printing.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const pngBtn = document.querySelector<HTMLButtonElement>('[data-tour="export-png-btn"]');
                    if (pngBtn) pngBtn.click();
                  }}
                  className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Export PNG</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Generate high-resolution image for mobile sharing.
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSaveCompletedState(true);
                  }}
                  className="w-full py-2.5 px-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 rounded-xl transition-colors cursor-pointer text-center mt-0.5"
                >
                  Skip Export
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step Title */}
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{effectiveStepTitle}</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {effectiveDescription}
                </p>
              </div>

              {/* Action Prompt Banner */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2.5">
                <MousePointer className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-bounce" />
                <span className="font-semibold">{effectiveActionPrompt}</span>
              </div>

              {/* Step 4 Decision Options */}
              {step.id === 4 && (
                <div className="grid grid-cols-1 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const step4aIndex = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 41);
                      if (step4aIndex !== -1) {
                        setCurrentStepIndex(step4aIndex);
                        currentStepIndexRef.current = step4aIndex;
                      }
                    }}
                    className="p-3 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 rounded-xl text-left transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                        <span>Create Blank Line-up</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Add songs manually from the song database or enter title & key.
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const step4bIndex = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 42);
                      if (step4bIndex !== -1) {
                        setCurrentStepIndex(step4bIndex);
                        currentStepIndexRef.current = step4bIndex;
                      }
                    }}
                    className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-left transition-all cursor-pointer group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
                      B
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Import YouTube Playlist</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                        Paste a YouTube or YouTube Music playlist URL to auto-populate songs.
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Change Method link on Step 4A / 4B */}
              {(step.id === 41 || step.id === 42) && (
                <div className="pt-1 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const step4Index = INTERACTIVE_GUIDE_STEPS.findIndex((s) => s.id === 4);
                      if (step4Index !== -1) {
                        setCurrentStepIndex(step4Index);
                        currentStepIndexRef.current = step4Index;
                      }
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Change creation method (Back to Choice)</span>
                  </button>
                </div>
              )}

              {/* Bullets */}
              {step.bullets && step.bullets.length > 0 && (
                <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
                  {step.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-500 dark:text-indigo-400 font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Production Rule Note */}
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 italic">
                💡 {step.rule}
              </div>
            </>
          )}
        </div>

        {/* Card Footer Navigation */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                isFirstStep
                  ? 'opacity-40 cursor-not-allowed text-slate-400 border-slate-200'
                  : 'text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={handleNeverShow}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer hidden sm:inline"
              title="Don't auto-open guide on launch"
            >
              Never show
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Exit Guide
            </button>

            {/* Show Next Step button on Service Type (2), Service Date (3), Arrange Songs (5), Assign Members (6), Save Lineup (7), and Help Topics (8, >= 10) */}
            {(step.id === 2 || step.id === 3 || step.id === 5 || step.id === 6 || step.id === 7 || step.id === 8 || step.id >= 10) && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>{getNextButtonLabel()}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
