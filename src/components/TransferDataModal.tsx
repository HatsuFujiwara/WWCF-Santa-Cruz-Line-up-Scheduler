import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Member, Schedule, Song } from '../types';
import { StorageService, DraftSchedule } from '../services/storage';
import { SongService } from '../services/songService';
import { SongFamilyService } from '../services/songFamilyService';
import {
  X,
  QrCode,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Camera,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Upload,
  Download,
  Check,
  Layers,
  Users,
  Music2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface TransferDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  songs: Song[];
  schedules: Schedule[];
  labels: string[];
  draftSchedule?: DraftSchedule | null;
  onDataTransferred: () => void;
  showToast: (text: string, type?: 'success' | 'danger' | 'info') => void;
  initialSessionParams?: { sessionId: string; token: string } | null;
}

type Mode = 'select' | 'pc_send' | 'pc_receive' | 'phone_scanner';

type PcSendState =
  | 'idle'
  | 'creating'
  | 'waiting_for_device'
  | 'device_connected'
  | 'success'
  | 'expired'
  | 'error'
  | 'cancelled';

type PcReceiveState =
  | 'idle'
  | 'creating'
  | 'waiting_for_phone'
  | 'device_connected'
  | 'data_received'
  | 'importing'
  | 'success'
  | 'expired'
  | 'error'
  | 'cancelled';

type PhoneState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'confirm_import' // PC -> Phone flow
  | 'importing'
  | 'confirm_send' // Phone -> PC flow
  | 'uploading'
  | 'upload_success'
  | 'success'
  | 'error';

/**
 * Reusable helper to build transfer payload from application state.
 */
async function buildCurrentPayload(options: {
  members?: Member[];
  songs?: Song[];
  schedules?: Schedule[];
  labels?: string[];
  includeDraft: boolean;
  draftSchedule?: DraftSchedule | null;
  direction: 'pc_to_phone' | 'phone_to_pc';
}) {
  const currentMembers = options.members || StorageService.getMembersSync();
  const currentSongs = options.songs || (await SongService.getSongs());
  const currentSchedules = options.schedules || StorageService.getSchedulesSync();
  const currentLabels = options.labels || StorageService.getLabelsSync();
  const currentSongFamilies = await SongFamilyService.getSongFamilies();
  const currentDraft =
    options.draftSchedule !== undefined ? options.draftSchedule : StorageService.getDraftScheduleSync();

  return {
    app: 'WWCF Santa Cruz Worship Ministry',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    direction: options.direction,
    data: {
      members: currentMembers,
      songs: currentSongs,
      schedules: currentSchedules,
      labels: currentLabels,
      songFamilies: currentSongFamilies,
      draft: options.includeDraft ? currentDraft : undefined
    }
  };
}

/**
 * Reusable helper to execute Merge or Replace data import on the local device.
 */
async function executeDataImport(incoming: any, strategy: 'merge' | 'replace'): Promise<void> {
  if (!incoming) return;

  if (strategy === 'replace') {
    // REPLACE STRATEGY: Overwrites local datasets entirely with incoming dataset
    if (Array.isArray(incoming.members)) {
      StorageService.saveMembers(incoming.members);
    }
    if (Array.isArray(incoming.labels)) {
      StorageService.saveLabels(incoming.labels);
    }
    if (Array.isArray(incoming.schedules)) {
      StorageService.saveSchedules(incoming.schedules);
    }
    if (Array.isArray(incoming.songs)) {
      await SongService.saveSongsList(incoming.songs);
    }
    if (Array.isArray(incoming.songFamilies)) {
      await SongFamilyService.saveSongFamilies(incoming.songFamilies);
    }
    if (incoming.draft !== undefined) {
      StorageService.saveDraftSchedule(incoming.draft);
    }
  } else {
    // MERGE STRATEGY: Preserves existing records by ID, appends non-conflicting new items
    if (Array.isArray(incoming.members)) {
      const currentMembers = StorageService.getMembersSync();
      const memberMap = new Map<string, Member>();
      currentMembers.forEach((m) => memberMap.set(m.id, m));
      incoming.members.forEach((m: Member) => {
        if (!memberMap.has(m.id)) {
          memberMap.set(m.id, m);
        }
      });
      StorageService.saveMembers(Array.from(memberMap.values()));
    }

    if (Array.isArray(incoming.labels)) {
      const currentLabels = StorageService.getLabelsSync();
      const labelSet = new Set([...currentLabels, ...incoming.labels]);
      StorageService.saveLabels(Array.from(labelSet));
    }

    if (Array.isArray(incoming.schedules)) {
      const currentSchedules = StorageService.getSchedulesSync();
      const scheduleMap = new Map<string, Schedule>();
      currentSchedules.forEach((s) => scheduleMap.set(s.id, s));
      incoming.schedules.forEach((s: Schedule) => {
        if (!scheduleMap.has(s.id)) {
          scheduleMap.set(s.id, s);
        }
      });
      StorageService.saveSchedules(Array.from(scheduleMap.values()));
    }

    if (Array.isArray(incoming.songs)) {
      const currentSongs = await SongService.getSongs();
      const songMap = new Map<string, Song>();
      currentSongs.forEach((s) => songMap.set(s.id, s));
      incoming.songs.forEach((s: Song) => {
        if (!songMap.has(s.id)) {
          songMap.set(s.id, s);
        }
      });
      await SongService.saveSongsList(Array.from(songMap.values()));
    }

    if (Array.isArray(incoming.songFamilies)) {
      const currentFamilies = await SongFamilyService.getSongFamilies();
      const familyMap = new Map<string, any>();
      currentFamilies.forEach((f) => familyMap.set(f.id, f));
      incoming.songFamilies.forEach((f: any) => {
        if (!familyMap.has(f.id)) {
          familyMap.set(f.id, f);
        }
      });
      await SongFamilyService.saveSongFamilies(Array.from(familyMap.values()));
    }

    if (incoming.draft) {
      StorageService.saveDraftSchedule(incoming.draft);
    }
  }
}

export const TransferDataModal: React.FC<TransferDataModalProps> = ({
  isOpen,
  onClose,
  members,
  songs,
  schedules,
  labels,
  draftSchedule,
  onDataTransferred,
  showToast,
  initialSessionParams
}) => {
  const [mode, setMode] = useState<Mode>('select');

  // PC SEND State (PC -> Phone)
  const [pcSendState, setPcSendState] = useState<PcSendState>('idle');
  const [includeDraftSend, setIncludeDraftSend] = useState<boolean>(false);
  const [sendQrDataUrl, setSendQrDataUrl] = useState<string>('');
  const [sendSessionId, setSendSessionId] = useState<string>('');
  const [sendSessionToken, setSendSessionToken] = useState<string>('');
  const [sendExpiresAt, setSendExpiresAt] = useState<number | null>(null);
  const [sendSecondsRemaining, setSendSecondsRemaining] = useState<number>(0);
  const [pcSendErrorMessage, setPcSendErrorMessage] = useState<string>('');

  // PC RECEIVE State (Phone -> PC)
  const [pcReceiveState, setPcReceiveState] = useState<PcReceiveState>('idle');
  const [receiveQrDataUrl, setReceiveQrDataUrl] = useState<string>('');
  const [receiveSessionId, setReceiveSessionId] = useState<string>('');
  const [receiveSessionToken, setReceiveSessionToken] = useState<string>('');
  const [receiveExpiresAt, setReceiveExpiresAt] = useState<number | null>(null);
  const [receiveSecondsRemaining, setReceiveSecondsRemaining] = useState<number>(0);
  const [pcReceiveErrorMessage, setPcReceiveErrorMessage] = useState<string>('');
  const [pcReceiveStrategy, setPcReceiveStrategy] = useState<'merge' | 'replace'>('merge');
  const [pcReceiveCounts, setPcReceiveCounts] = useState<{
    members: number;
    songs: number;
    schedules: number;
    songFamilies: number;
    hasDraft: boolean;
  } | null>(null);
  const [pcReceivePayload, setPcReceivePayload] = useState<any>(null);

  // Phone Scanner State (handles both PC->Phone and Phone->PC)
  const [phoneState, setPhoneState] = useState<PhoneState>('idle');
  const [cameraError, setCameraError] = useState<'permission_denied' | 'no_camera' | 'unavailable' | null>(null);
  const [phoneImportStrategy, setPhoneImportStrategy] = useState<'merge' | 'replace'>('merge');
  const [phoneIncludeDraft, setPhoneIncludeDraft] = useState<boolean>(Boolean(draftSchedule));
  const [phoneCountsSummary, setPhoneCountsSummary] = useState<{
    members: number;
    songs: number;
    schedules: number;
    songFamilies: number;
  }>({ members: 0, songs: 0, schedules: 0, songFamilies: 0 });
  const [scannedSessionData, setScannedSessionData] = useState<{
    sessionId: string;
    token: string;
    direction: 'pc_to_phone' | 'phone_to_pc';
    counts: { members: number; songs: number; schedules: number; songFamilies: number; hasDraft: boolean };
    payloadData?: any;
  } | null>(null);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState<string>('');

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const sendPollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sendCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const receivePollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const receiveCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load Phone local counts for Phone -> PC send summary
  useEffect(() => {
    if (isOpen) {
      SongFamilyService.getSongFamilies().then((fams) => {
        setPhoneCountsSummary({
          members: members.length,
          songs: songs.length,
          schedules: schedules.length,
          songFamilies: fams.length
        });
      });
    }
  }, [isOpen, members, songs, schedules]);

  // Auto-connect if initialSessionParams provided via URL query
  useEffect(() => {
    if (isOpen && initialSessionParams && initialSessionParams.sessionId && initialSessionParams.token) {
      setMode('phone_scanner');
      handleConnectToSession(initialSessionParams.sessionId, initialSessionParams.token);
    }
  }, [isOpen, initialSessionParams]);

  // ----------------------------------------------------
  // Timers & Polling for PC SEND (PC -> Phone)
  // ----------------------------------------------------
  useEffect(() => {
    if (sendExpiresAt && (pcSendState === 'waiting_for_device' || pcSendState === 'device_connected')) {
      sendCountdownTimerRef.current = setInterval(() => {
        const diff = Math.max(0, Math.floor((sendExpiresAt - Date.now()) / 1000));
        setSendSecondsRemaining(diff);
        if (diff <= 0) {
          setPcSendState('expired');
          if (sendCountdownTimerRef.current) clearInterval(sendCountdownTimerRef.current);
          if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
        }
      }, 1000);
    } else {
      if (sendCountdownTimerRef.current) clearInterval(sendCountdownTimerRef.current);
    }

    return () => {
      if (sendCountdownTimerRef.current) clearInterval(sendCountdownTimerRef.current);
    };
  }, [sendExpiresAt, pcSendState]);

  useEffect(() => {
    if (sendSessionId && sendSessionToken && (pcSendState === 'waiting_for_device' || pcSendState === 'device_connected')) {
      sendPollingTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/transfer/session/${sendSessionId}/status?token=${sendSessionToken}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'connected' && pcSendState === 'waiting_for_device') {
              setPcSendState('device_connected');
            } else if (data.status === 'completed') {
              setPcSendState('success');
              showToast('Data transferred successfully to mobile device!', 'success');
              if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
            } else if (data.status === 'expired') {
              setPcSendState('expired');
              if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
            } else if (data.status === 'cancelled') {
              setPcSendState('cancelled');
              if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
            }
          }
        } catch (e) {
          console.error('Send Polling error:', e);
        }
      }, 1500);
    } else {
      if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
    }

    return () => {
      if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
    };
  }, [sendSessionId, sendSessionToken, pcSendState]);

  // ----------------------------------------------------
  // Timers & Polling for PC RECEIVE (Phone -> PC)
  // ----------------------------------------------------
  useEffect(() => {
    if (receiveExpiresAt && (pcReceiveState === 'waiting_for_phone' || pcReceiveState === 'device_connected')) {
      receiveCountdownTimerRef.current = setInterval(() => {
        const diff = Math.max(0, Math.floor((receiveExpiresAt - Date.now()) / 1000));
        setReceiveSecondsRemaining(diff);
        if (diff <= 0) {
          setPcReceiveState('expired');
          if (receiveCountdownTimerRef.current) clearInterval(receiveCountdownTimerRef.current);
          if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
        }
      }, 1000);
    } else {
      if (receiveCountdownTimerRef.current) clearInterval(receiveCountdownTimerRef.current);
    }

    return () => {
      if (receiveCountdownTimerRef.current) clearInterval(receiveCountdownTimerRef.current);
    };
  }, [receiveExpiresAt, pcReceiveState]);

  useEffect(() => {
    if (receiveSessionId && receiveSessionToken && (pcReceiveState === 'waiting_for_phone' || pcReceiveState === 'device_connected')) {
      receivePollingTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/transfer/session/${receiveSessionId}/status?token=${receiveSessionToken}`);
          if (res.ok) {
            const statusData = await res.json();
            if (statusData.status === 'connected' && pcReceiveState === 'waiting_for_phone') {
              setPcReceiveState('device_connected');
            } else if (statusData.status === 'data_ready') {
              // Phone has uploaded its payload! Retrieve the full payload for confirmation & import
              if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
              try {
                const fullRes = await fetch(`/api/transfer/session/${receiveSessionId}?token=${receiveSessionToken}`);
                if (fullRes.ok) {
                  const fullData = await fullRes.json();
                  setPcReceiveCounts(fullData.counts);
                  setPcReceivePayload(fullData.payload?.data);
                  setPcReceiveState('data_received');
                  showToast('Incoming data received from phone!', 'info');
                }
              } catch (err) {
                console.error('Failed to fetch uploaded session payload:', err);
              }
            } else if (statusData.status === 'expired') {
              setPcReceiveState('expired');
              if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
            } else if (statusData.status === 'cancelled') {
              setPcReceiveState('cancelled');
              if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
            }
          }
        } catch (e) {
          console.error('Receive Polling error:', e);
        }
      }, 1500);
    } else {
      if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
    }

    return () => {
      if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
    };
  }, [receiveSessionId, receiveSessionToken, pcReceiveState]);

  // ----------------------------------------------------
  // HTML5 Camera QR Scanner for Phone
  // ----------------------------------------------------
  useEffect(() => {
    if (mode === 'phone_scanner' && phoneState === 'scanning') {
      let isMounted = true;
      setCameraError(null);

      const startCamera = async () => {
        try {
          await new Promise((res) => setTimeout(res, 150));
          if (!isMounted) return;

          const scanner = new Html5Qrcode('qr-reader-target');
          html5QrcodeRef.current = scanner;

          await scanner.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
              if (isMounted) {
                stopCamera();
                parseAndConnectQr(decodedText);
              }
            },
            () => {}
          );
        } catch (err: any) {
          console.error('Camera error:', err);
          if (!isMounted) return;
          const errStr = String(err?.message || err);
          if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
            setCameraError('permission_denied');
          } else if (errStr.includes('NotFoundError') || errStr.includes('DevicesNotFoundError')) {
            setCameraError('no_camera');
          } else {
            setCameraError('unavailable');
          }
        }
      };

      startCamera();

      return () => {
        isMounted = false;
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [mode, phoneState]);

  const stopCamera = () => {
    if (html5QrcodeRef.current) {
      const scanner = html5QrcodeRef.current;
      html5QrcodeRef.current = null;
      scanner
        .stop()
        .catch(() => {})
        .finally(() => {
          try {
            scanner.clear();
          } catch {}
        });
    }
  };

  if (!isOpen) return null;

  // ----------------------------------------------------
  // HANDLERS: PC SEND (PC -> Phone)
  // ----------------------------------------------------
  const handleGenerateSendQr = async () => {
    setPcSendState('creating');
    setPcSendErrorMessage('');

    try {
      const payloadObj = await buildCurrentPayload({
        members,
        songs,
        schedules,
        labels,
        includeDraft: includeDraftSend,
        draftSchedule,
        direction: 'pc_to_phone'
      });

      const response = await fetch('/api/transfer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: payloadObj,
          direction: 'pc_to_phone',
          expiresInSeconds: 600
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create temporary transfer session.');
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.message || 'Error generating transfer session.');
      }

      setSendSessionId(resData.sessionId);
      setSendSessionToken(resData.token);
      setSendExpiresAt(resData.expiresAt);
      setSendSecondsRemaining(Math.floor((resData.expiresAt - Date.now()) / 1000));

      const generatedDataUrl = await QRCode.toDataURL(resData.qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      setSendQrDataUrl(generatedDataUrl);
      setPcSendState('waiting_for_device');
    } catch (err: any) {
      console.error('Send QR creation error:', err);
      setPcSendErrorMessage(err.message || 'Could not generate transfer QR code.');
      setPcSendState('error');
    }
  };

  const handleCancelSendTransfer = async () => {
    if (sendSessionId && sendSessionToken) {
      try {
        await fetch(`/api/transfer/session/${sendSessionId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sendSessionToken })
        });
      } catch {}
    }
    setPcSendState('cancelled');
    if (sendPollingTimerRef.current) clearInterval(sendPollingTimerRef.current);
  };

  // ----------------------------------------------------
  // HANDLERS: PC RECEIVE (Phone -> PC)
  // ----------------------------------------------------
  const handleGenerateReceiveQr = async () => {
    setPcReceiveState('creating');
    setPcReceiveErrorMessage('');
    setPcReceiveCounts(null);
    setPcReceivePayload(null);

    try {
      const response = await fetch('/api/transfer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'phone_to_pc',
          expiresInSeconds: 600
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create receiving transfer session.');
      }

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.message || 'Error generating receiving session.');
      }

      setReceiveSessionId(resData.sessionId);
      setReceiveSessionToken(resData.token);
      setReceiveExpiresAt(resData.expiresAt);
      setReceiveSecondsRemaining(Math.floor((resData.expiresAt - Date.now()) / 1000));

      const generatedDataUrl = await QRCode.toDataURL(resData.qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      setReceiveQrDataUrl(generatedDataUrl);
      setPcReceiveState('waiting_for_phone');
    } catch (err: any) {
      console.error('Receive QR creation error:', err);
      setPcReceiveErrorMessage(err.message || 'Could not generate receiving QR code.');
      setPcReceiveState('error');
    }
  };

  const handleCancelReceiveTransfer = async () => {
    if (receiveSessionId && receiveSessionToken) {
      try {
        await fetch(`/api/transfer/session/${receiveSessionId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: receiveSessionToken })
        });
      } catch {}
    }
    setPcReceiveState('cancelled');
    if (receivePollingTimerRef.current) clearInterval(receivePollingTimerRef.current);
  };

  const handleExecutePcImport = async () => {
    if (!pcReceivePayload) return;

    setPcReceiveState('importing');

    try {
      await executeDataImport(pcReceivePayload, pcReceiveStrategy);

      // Complete session on server
      try {
        await fetch(`/api/transfer/session/${receiveSessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: receiveSessionToken })
        });
      } catch {}

      setPcReceiveState('success');
      onDataTransferred();
      showToast('Data from your phone has been successfully transferred to this PC.', 'success');
    } catch (err) {
      console.error('PC Import error:', err);
      setPcReceiveErrorMessage('Failed to import phone data onto PC.');
      setPcReceiveState('error');
    }
  };

  // ----------------------------------------------------
  // HANDLERS: PHONE SCANNER & ACTIONS
  // ----------------------------------------------------
  const parseAndConnectQr = (rawQrText: string) => {
    try {
      setPhoneState('connecting');
      setPhoneErrorMessage('');

      let sid = '';
      let tok = '';

      if (rawQrText.includes('transferSessionId=')) {
        const url = new URL(rawQrText);
        sid = url.searchParams.get('transferSessionId') || '';
        tok = url.searchParams.get('token') || '';
      } else {
        const parsed = JSON.parse(rawQrText);
        sid = parsed.sessionId || parsed.transferSessionId || '';
        tok = parsed.token || '';
      }

      if (!sid || !tok) {
        setPhoneErrorMessage('Invalid transfer QR code format.');
        setPhoneState('error');
        return;
      }

      handleConnectToSession(sid, tok);
    } catch (e) {
      setPhoneErrorMessage('Invalid or unrecognized QR code.');
      setPhoneState('error');
    }
  };

  const handleConnectToSession = async (sid: string, tok: string) => {
    setPhoneState('connecting');
    setPhoneErrorMessage('');

    try {
      const response = await fetch(`/api/transfer/session/${sid}?token=${tok}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.error === 'EXPIRED') {
          setPhoneErrorMessage('This transfer session has expired.');
        } else if (data.error === 'ALREADY_USED') {
          setPhoneErrorMessage('This transfer session has already been used.');
        } else if (data.error === 'CANCELLED') {
          setPhoneErrorMessage('This transfer session was cancelled by the host.');
        } else {
          setPhoneErrorMessage(data.message || 'Transfer session unavailable.');
        }
        setPhoneState('error');
        return;
      }

      const sessionDirection: 'pc_to_phone' | 'phone_to_pc' = data.direction || 'pc_to_phone';

      setScannedSessionData({
        sessionId: sid,
        token: tok,
        direction: sessionDirection,
        counts: data.counts,
        payloadData: data.payload?.data
      });

      if (sessionDirection === 'phone_to_pc') {
        // Phone -> PC: Display confirmation to upload local phone data to PC
        setPhoneState('confirm_send');
      } else {
        // PC -> Phone: Display confirmation to import incoming PC data onto Phone
        setPhoneState('confirm_import');
      }
    } catch (err: any) {
      console.error('Error connecting to session:', err);
      setPhoneErrorMessage('Failed to connect to transfer session. Please check your network.');
      setPhoneState('error');
    }
  };

  // Phone action: Send Data to PC
  const handleSendPhoneDataToPc = async () => {
    if (!scannedSessionData) return;

    setPhoneState('uploading');

    try {
      const payloadObj = await buildCurrentPayload({
        members,
        songs,
        schedules,
        labels,
        includeDraft: phoneIncludeDraft,
        draftSchedule,
        direction: 'phone_to_pc'
      });

      const response = await fetch(`/api/transfer/session/${scannedSessionData.sessionId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: scannedSessionData.token,
          payload: payloadObj
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to upload data to PC session.');
      }

      setPhoneState('upload_success');
      showToast('Data uploaded to PC! Please complete import on your PC.', 'success');
    } catch (err: any) {
      console.error('Phone upload error:', err);
      setPhoneErrorMessage(err.message || 'Failed to upload phone data to PC.');
      setPhoneState('error');
    }
  };

  // Phone action: Import Data from PC
  const handleExecutePhoneImport = async () => {
    if (!scannedSessionData || !scannedSessionData.payloadData) return;

    setPhoneState('importing');

    try {
      await executeDataImport(scannedSessionData.payloadData, phoneImportStrategy);

      // Complete session on server
      try {
        await fetch(`/api/transfer/session/${scannedSessionData.sessionId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: scannedSessionData.token })
        });
      } catch {}

      setPhoneState('success');
      onDataTransferred();
      showToast('Data imported successfully!', 'success');
    } catch (err) {
      console.error('Phone Import error:', err);
      setPhoneErrorMessage('Failed to import data into local storage.');
      setPhoneState('error');
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const handleReset = () => {
    stopCamera();
    setMode('select');
    setPcSendState('idle');
    setPcReceiveState('idle');
    setPhoneState('idle');
    setSendQrDataUrl('');
    setSendSessionId('');
    setSendSessionToken('');
    setSendExpiresAt(null);
    setReceiveQrDataUrl('');
    setReceiveSessionId('');
    setReceiveSessionToken('');
    setReceiveExpiresAt(null);
    setScannedSessionData(null);
    setPcSendErrorMessage('');
    setPcReceiveErrorMessage('');
    setPhoneErrorMessage('');
    setPcReceiveCounts(null);
    setPcReceivePayload(null);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        data-tour="transfer-modal-container"
        className="w-full max-w-lg bg-black text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] my-auto transform animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1b75bc]/20 text-[#1b75bc]">
              <ArrowRightLeft className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Transfer Data
              </h3>
              <p className="text-xs text-slate-400">
                WWCF Santa Cruz Two-Way Device Sync (PC ⇄ Phone)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* VIEW 1: Main Mode Selection */}
          {mode === 'select' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Transfer ministry data seamlessly between your PC/computer and mobile devices using a secure, temporary QR session.
                </p>
              </div>

              {/* 2 Transfer Directions (PC-initiated) */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Computer Options (Display QR Code)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Send Data to Phone */}
                  <button
                    type="button"
                    data-tour="transfer-pc-send-option"
                    onClick={() => {
                      setMode('pc_send');
                      setPcSendState('idle');
                    }}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-[#1b75bc]/60 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-[#1b75bc]/20 text-[#1b75bc] group-hover:scale-105 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1b75bc]/10 text-[#1b75bc] border border-[#1b75bc]/20">
                        PC → Phone
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-[#1b75bc] transition-colors">
                        📤 Send Data to Phone
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        Transfer this PC's data to a mobile phone or tablet.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-[#1b75bc] flex items-center gap-1">
                      <span>Generate Send QR</span>
                      <span>&rarr;</span>
                    </div>
                  </button>

                  {/* Option 2: Receive Data from Phone */}
                  <button
                    type="button"
                    data-tour="transfer-pc-receive-option"
                    onClick={() => {
                      setMode('pc_receive');
                      handleGenerateReceiveQr();
                    }}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/60 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-emerald-950/60 text-emerald-400 group-hover:scale-105 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                        Phone → PC
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                        📥 Receive Data from Phone
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-snug">
                        Receive and import data uploaded from your phone to this PC.
                      </p>
                    </div>
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <span>Generate Receive QR</span>
                      <span>&rarr;</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mobile Scanner Option */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Mobile Device Option (Camera Scanner)
                </div>

                <button
                  type="button"
                  data-tour="transfer-phone-scanner-option"
                  onClick={() => {
                    setMode('phone_scanner');
                    setPhoneState('scanning');
                  }}
                  className="w-full p-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/60 text-left transition-all cursor-pointer group flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-indigo-950/60 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                        📱 Scan QR Code on Screen
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Open camera scanner to connect to a PC session (send to PC or receive from PC).
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-indigo-400 shrink-0 flex items-center gap-1">
                    <span>Open Scanner</span>
                    <span>&rarr;</span>
                  </div>
                </button>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#1b75bc] shrink-0 mt-0.5" />
                <span>
                  <strong>Secure Two-Way Session:</strong> The QR code contains only a temporary session token. No database data is exposed in the QR code.
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: PC SEND GENERATOR (PC -> Phone) */}
          {mode === 'pc_send' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
              >
                <span>&larr; Back to transfer options</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-[#1b75bc]">
                <Upload className="w-4 h-4" />
                <span>Send Data to Phone (PC → Phone)</span>
              </div>

              {pcSendState === 'idle' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
                    <h4 className="font-bold text-white text-sm">
                      Select Data to Include
                    </h4>
                    <p className="text-xs text-slate-400">
                      The current saved PC dataset ({members.length} members, {songs.length} songs, {schedules.length} line-ups) will be transferred.
                    </p>

                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-black/50 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={includeDraftSend}
                        onChange={(e) => setIncludeDraftSend(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-[#1b75bc] focus:ring-[#1b75bc]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Include current working draft</div>
                        <div className="text-[11px] text-slate-400">
                          {draftSchedule ? 'Active unsaved draft available' : 'No active draft found'}
                        </div>
                      </div>
                    </label>
                  </div>

                  <button
                    type="button"
                    data-tour="transfer-generate-btn"
                    onClick={handleGenerateSendQr}
                    className="w-full py-3 px-4 bg-[#1b75bc] hover:bg-[#16629e] text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#1b75bc]/20"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Generate Transfer QR</span>
                  </button>
                </div>
              )}

              {pcSendState === 'creating' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#1b75bc] animate-spin" />
                  <p className="text-sm font-semibold text-white">Creating temporary transfer session...</p>
                </div>
              )}

              {(pcSendState === 'waiting_for_device' || pcSendState === 'device_connected') && (
                <div data-tour="transfer-qr-display" className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold">
                    {pcSendState === 'waiting_for_device' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-400">Waiting for phone to scan...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">Phone connected!</span>
                      </>
                    )}
                  </div>

                  {sendQrDataUrl && (
                    <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-700">
                      <img src={sendQrDataUrl} alt="Transfer QR Code" className="w-56 h-56 object-contain" />
                    </div>
                  )}

                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    Scan this QR code using the <strong>Scan QR Code</strong> scanner on your phone.
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-[#1b75bc]" />
                    <span>Session expires in: </span>
                    <span className="font-mono font-bold text-white">{formatCountdown(sendSecondsRemaining)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelSendTransfer}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel Transfer
                  </button>
                </div>
              )}

              {pcSendState === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Transfer Complete!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Application data was successfully transferred to the phone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-6 bg-[#1b75bc] hover:bg-[#16629e] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {pcSendState === 'expired' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Session Expired</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      This transfer session timed out after 10 minutes. Please generate a new QR code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateSendQr}
                    className="py-2 px-5 bg-[#1b75bc] hover:bg-[#16629e] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Generate New QR Code</span>
                  </button>
                </div>
              )}

              {pcSendState === 'cancelled' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <p className="text-xs text-slate-400">Transfer session was cancelled.</p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2 px-4 bg-slate-900 border border-slate-800 text-xs font-semibold text-white rounded-xl cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {pcSendState === 'error' && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Error Creating Transfer</span>
                  </div>
                  <p>{pcSendErrorMessage || 'An unexpected error occurred.'}</p>
                  <button
                    type="button"
                    onClick={handleGenerateSendQr}
                    className="py-1.5 px-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PC RECEIVE GENERATOR (Phone -> PC) */}
          {mode === 'pc_receive' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
              >
                <span>&larr; Back to transfer options</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <Download className="w-4 h-4" />
                <span>Receive Data from Phone (Phone → PC)</span>
              </div>

              {pcReceiveState === 'creating' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Creating receiving transfer session...</p>
                </div>
              )}

              {(pcReceiveState === 'waiting_for_phone' || pcReceiveState === 'device_connected') && (
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold">
                    {pcReceiveState === 'waiting_for_phone' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-emerald-400">Waiting for phone to connect...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">Phone connected! Waiting for upload...</span>
                      </>
                    )}
                  </div>

                  {receiveQrDataUrl && (
                    <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-700">
                      <img src={receiveQrDataUrl} alt="Receive QR Code" className="w-56 h-56 object-contain" />
                    </div>
                  )}

                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    Scan this QR code with your phone to upload and transfer your phone's data to this PC.
                  </p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Session expires in: </span>
                    <span className="font-mono font-bold text-white">{formatCountdown(receiveSecondsRemaining)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelReceiveTransfer}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel Receive
                  </button>
                </div>
              )}

              {/* PC Screen: Data Received from Phone (Import Strategy Choice) */}
              {pcReceiveState === 'data_received' && pcReceiveCounts && (
                <div className="space-y-5 animate-in zoom-in-95 duration-150">
                  <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Data Received from Phone</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Your phone has uploaded its data payload. Choose an import strategy to apply to this PC.
                    </p>
                  </div>

                  {/* Summary Counts */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Incoming Phone Payload Summary
                    </h4>
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{pcReceiveCounts.members}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Members</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{pcReceiveCounts.songs}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Songs</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{pcReceiveCounts.schedules}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Line-ups</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{pcReceiveCounts.songFamilies}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Families</div>
                      </div>
                    </div>
                    {pcReceiveCounts.hasDraft && (
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Working draft schedule included in payload</span>
                      </div>
                    )}
                  </div>

                  {/* Strategy Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Select PC Import Strategy:</label>
                    <div className="space-y-2">
                      <label
                        onClick={() => setPcReceiveStrategy('merge')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          pcReceiveStrategy === 'merge'
                            ? 'bg-emerald-950/40 border-emerald-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pcReceiveStrategy"
                          checked={pcReceiveStrategy === 'merge'}
                          onChange={() => setPcReceiveStrategy('merge')}
                          className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Merge with Existing PC Data (Safe)</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Preserves existing PC records. Appends incoming records that do not already exist.
                          </div>
                        </div>
                      </label>

                      <label
                        onClick={() => setPcReceiveStrategy('replace')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          pcReceiveStrategy === 'replace'
                            ? 'bg-amber-950/40 border-amber-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pcReceiveStrategy"
                          checked={pcReceiveStrategy === 'replace'}
                          onChange={() => setPcReceiveStrategy('replace')}
                          className="mt-0.5 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Replace All PC Data</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Replaces current PC application state entirely with the incoming phone dataset.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecutePcImport}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Import Data to PC</span>
                    </button>
                  </div>
                </div>
              )}

              {pcReceiveState === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Importing data onto PC...</p>
                </div>
              )}

              {pcReceiveState === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Transfer Complete</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Data from your phone has been successfully transferred to this PC.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {pcReceiveState === 'expired' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">Session Expired</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      This receiving session timed out after 10 minutes. Please generate a new QR code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateReceiveQr}
                    className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Generate New QR Code</span>
                  </button>
                </div>
              )}

              {pcReceiveState === 'cancelled' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <p className="text-xs text-slate-400">Receiving session was cancelled.</p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-2 px-4 bg-slate-900 border border-slate-800 text-xs font-semibold text-white rounded-xl cursor-pointer"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {pcReceiveState === 'error' && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Error in Receive Session</span>
                  </div>
                  <p>{pcReceiveErrorMessage || 'An unexpected error occurred.'}</p>
                  <button
                    type="button"
                    onClick={handleGenerateReceiveQr}
                    className="py-1.5 px-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: PHONE SCANNER & ACTIONS (Dual Direction) */}
          {mode === 'phone_scanner' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
              >
                <span>&larr; Back to transfer options</span>
              </button>

              {/* CAMERA SCANNING */}
              {phoneState === 'scanning' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white font-bold text-sm">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Scan PC Transfer QR Code</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-snug">
                    Point your camera at the QR code displayed on the computer screen.
                  </p>

                  <div data-tour="transfer-scanner-view" className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[260px] flex items-center justify-center">
                    <div id="qr-reader-target" className="w-full h-full min-h-[260px]" />

                    {cameraError === 'permission_denied' && (
                      <div className="absolute inset-0 p-6 bg-black/90 flex flex-col items-center justify-center text-center space-y-3 text-xs text-amber-300">
                        <AlertCircle className="w-8 h-8 text-amber-400" />
                        <p className="font-bold text-sm text-white">Camera Access Denied</p>
                        <p className="text-slate-300">
                          Please allow camera access in your browser site permissions to scan the QR code.
                        </p>
                      </div>
                    )}

                    {cameraError === 'no_camera' && (
                      <div className="absolute inset-0 p-6 bg-black/90 flex flex-col items-center justify-center text-center space-y-3 text-xs text-slate-300">
                        <AlertCircle className="w-8 h-8 text-slate-400" />
                        <p className="font-bold text-sm text-white">No Camera Found</p>
                        <p className="text-slate-400">
                          No available camera hardware was detected on this device.
                        </p>
                      </div>
                    )}

                    {cameraError === 'unavailable' && (
                      <div className="absolute inset-0 p-6 bg-black/90 flex flex-col items-center justify-center text-center space-y-3 text-xs text-slate-300">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                        <p className="font-bold text-sm text-white">Camera Unavailable</p>
                        <p className="text-slate-400">
                          Could not access the device camera. Ensure another app is not using it.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CONNECTING */}
              {phoneState === 'connecting' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Connecting to transfer session...</p>
                </div>
              )}

              {/* BRANCH 1: PHONE -> PC CONFIRM SEND */}
              {phoneState === 'confirm_send' && (
                <div className="space-y-5 animate-in zoom-in-95 duration-150">
                  <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>Ready to Send Data to PC</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Connected to PC receiving session. Confirm the phone dataset you want to upload.
                    </p>
                  </div>

                  {/* Summary of Local Phone Data */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Phone Dataset Summary
                    </h4>
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{phoneCountsSummary.members}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Members</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{phoneCountsSummary.songs}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Songs</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{phoneCountsSummary.schedules}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Line-ups</div>
                      </div>
                      <div className="p-2 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{phoneCountsSummary.songFamilies}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Families</div>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-3 mt-2 rounded-lg border border-slate-800 bg-black/50 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={phoneIncludeDraft}
                        onChange={(e) => setPhoneIncludeDraft(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Include current working draft</div>
                        <div className="text-[11px] text-slate-400">
                          {draftSchedule ? 'Draft Schedule Included' : 'No active draft found'}
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendPhoneDataToPc}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Send Data to PC</span>
                    </button>
                  </div>
                </div>
              )}

              {/* UPLOADING STATE */}
              {phoneState === 'uploading' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Uploading data to PC session...</p>
                </div>
              )}

              {/* UPLOAD SUCCESS (Phone Screen) */}
              {phoneState === 'upload_success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">✓ Data Sent to PC!</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Your phone data has been uploaded to the PC. Please choose your import strategy (Merge or Replace) on the PC screen to finish.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* BRANCH 2: PC -> PHONE CONFIRM IMPORT */}
              {phoneState === 'confirm_import' && scannedSessionData && (
                <div data-tour="transfer-confirm-panel" className="space-y-5 animate-in zoom-in-95 duration-150">
                  <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Transfer Data Ready</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Data from another WWCF Santa Cruz device is ready to import.
                    </p>
                  </div>

                  {/* Summary Counts Card */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Transfer Payload Summary
                    </h4>
                    <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{scannedSessionData.counts.members}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Members</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{scannedSessionData.counts.songs}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Songs</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{scannedSessionData.counts.schedules}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Line-ups</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-base font-extrabold text-white">{scannedSessionData.counts.songFamilies || 0}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Families</div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Select Import Strategy:</label>
                    <div className="space-y-2">
                      <label
                        onClick={() => setPhoneImportStrategy('merge')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          phoneImportStrategy === 'merge'
                            ? 'bg-emerald-950/40 border-emerald-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="phoneImportStrategy"
                          checked={phoneImportStrategy === 'merge'}
                          onChange={() => setPhoneImportStrategy('merge')}
                          className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Merge with Existing Phone Data (Safe)</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Appends non-conflicting records to your current device without deleting existing saved data.
                          </div>
                        </div>
                      </label>

                      <label
                        onClick={() => setPhoneImportStrategy('replace')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          phoneImportStrategy === 'replace'
                            ? 'bg-amber-950/40 border-amber-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="phoneImportStrategy"
                          checked={phoneImportStrategy === 'replace'}
                          onChange={() => setPhoneImportStrategy('replace')}
                          className="mt-0.5 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <div className="text-xs font-bold">Replace All Local Data</div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Replaces current device state entirely with the incoming transferred dataset.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      data-tour="transfer-import-btn"
                      onClick={handleExecutePhoneImport}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      Import Data
                    </button>
                  </div>
                </div>
              )}

              {/* IMPORTING */}
              {phoneState === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Importing transferred data...</p>
                </div>
              )}

              {/* SUCCESS (PC -> Phone) */}
              {phoneState === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">✓ TRANSFER COMPLETE</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                      Your WWCF Santa Cruz data has been transferred successfully.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* ERROR */}
              {phoneState === 'error' && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Transfer Error</span>
                  </div>
                  <p>{phoneErrorMessage || 'An error occurred during transfer.'}</p>
                  <button
                    type="button"
                    onClick={() => setPhoneState('scanning')}
                    className="py-1.5 px-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Try Scanning Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
