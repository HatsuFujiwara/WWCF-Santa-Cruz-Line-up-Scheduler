import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Member, Schedule, Song } from '../types';
import { StorageService, DraftSchedule } from '../services/storage';
import { SongService } from '../services/songService';
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
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw
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

type Mode = 'select' | 'pc_export' | 'phone_import';

type PcState =
  | 'idle'
  | 'creating'
  | 'waiting_for_device'
  | 'device_connected'
  | 'transferring'
  | 'success'
  | 'expired'
  | 'error'
  | 'cancelled';

type PhoneState =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'confirm_import'
  | 'importing'
  | 'success'
  | 'error';

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

  // PC State
  const [pcState, setPcState] = useState<PcState>('idle');
  const [includeDraft, setIncludeDraft] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [pcErrorMessage, setPcErrorMessage] = useState<string>('');

  // Phone State
  const [phoneState, setPhoneState] = useState<PhoneState>('idle');
  const [cameraError, setCameraError] = useState<'permission_denied' | 'no_camera' | 'unavailable' | null>(null);
  const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
  const [scannedSessionData, setScannedSessionData] = useState<{
    sessionId: string;
    token: string;
    counts: { members: number; songs: number; schedules: number; hasDraft: boolean };
    payloadData?: any;
  } | null>(null);
  const [phoneErrorMessage, setPhoneErrorMessage] = useState<string>('');

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from URL params if auto-detected on startup
  useEffect(() => {
    if (isOpen && initialSessionParams && initialSessionParams.sessionId && initialSessionParams.token) {
      setMode('phone_import');
      handleConnectToSession(initialSessionParams.sessionId, initialSessionParams.token);
    }
  }, [isOpen, initialSessionParams]);

  // Handle Expiration Countdown Timer
  useEffect(() => {
    if (expiresAt && (pcState === 'waiting_for_device' || pcState === 'device_connected')) {
      countdownTimerRef.current = setInterval(() => {
        const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setSecondsRemaining(diff);
        if (diff <= 0) {
          setPcState('expired');
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        }
      }, 1000);
    } else {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [expiresAt, pcState]);

  // Polling for PC side session status
  useEffect(() => {
    if (sessionId && sessionToken && (pcState === 'waiting_for_device' || pcState === 'device_connected')) {
      pollingTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/transfer/session/${sessionId}/status?token=${sessionToken}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'connected' && pcState === 'waiting_for_device') {
              setPcState('device_connected');
            } else if (data.status === 'completed') {
              setPcState('success');
              showToast('Data transferred successfully to mobile device!', 'success');
              if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            } else if (data.status === 'expired') {
              setPcState('expired');
              if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            } else if (data.status === 'cancelled') {
              setPcState('cancelled');
              if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 1500);
    } else {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    }

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [sessionId, sessionToken, pcState]);

  // Start HTML5 Camera QR Scanner for Phone
  useEffect(() => {
    if (mode === 'phone_import' && phoneState === 'scanning') {
      let isMounted = true;
      setCameraError(null);

      const startCamera = async () => {
        try {
          // Give DOM time to render container
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

  // --- PC GENERATOR LOGIC ---
  const handleGenerateQr = async () => {
    setPcState('creating');
    setPcErrorMessage('');

    try {
      const payloadObj = {
        app: 'WWCF Santa Cruz Worship Ministry',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          members,
          songs,
          schedules,
          labels,
          draft: includeDraft ? draftSchedule : undefined
        }
      };

      const response = await fetch('/api/transfer/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: payloadObj,
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

      setSessionId(resData.sessionId);
      setSessionToken(resData.token);
      setExpiresAt(resData.expiresAt);
      setSecondsRemaining(Math.floor((resData.expiresAt - Date.now()) / 1000));

      const generatedDataUrl = await QRCode.toDataURL(resData.qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      setQrDataUrl(generatedDataUrl);
      setPcState('waiting_for_device');
    } catch (err: any) {
      console.error('QR creation error:', err);
      setPcErrorMessage(err.message || 'Could not generate transfer QR code.');
      setPcState('error');
    }
  };

  const handleCancelPcTransfer = async () => {
    if (sessionId && sessionToken) {
      try {
        await fetch(`/api/transfer/session/${sessionId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: sessionToken })
        });
      } catch {}
    }
    setPcState('cancelled');
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
  };

  // --- PHONE SCANNER LOGIC ---
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
        // Try parsing JSON
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

      setScannedSessionData({
        sessionId: sid,
        token: tok,
        counts: data.counts,
        payloadData: data.payload?.data
      });
      setPhoneState('confirm_import');
    } catch (err: any) {
      console.error('Error connecting to session:', err);
      setPhoneErrorMessage('Failed to connect to transfer session. Please check your network.');
      setPhoneState('error');
    }
  };

  const handleExecuteImport = async () => {
    if (!scannedSessionData || !scannedSessionData.payloadData) return;

    setPhoneState('importing');

    try {
      const incoming = scannedSessionData.payloadData;

      if (importStrategy === 'replace') {
        // REPLACE ALL DATA
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
        if (incoming.draft) {
          StorageService.saveDraftSchedule(incoming.draft);
        }
      } else {
        // MERGE DATA SAFELY
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

        if (incoming.draft) {
          StorageService.saveDraftSchedule(incoming.draft);
        }
      }

      // Notify backend that transfer is completed
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
      console.error('Import error:', err);
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
    setPcState('idle');
    setPhoneState('idle');
    setQrDataUrl('');
    setSessionId('');
    setSessionToken('');
    setExpiresAt(null);
    setScannedSessionData(null);
    setPcErrorMessage('');
    setPhoneErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        data-tour="transfer-modal-container"
        className="w-full max-w-lg bg-black text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transform animate-in zoom-in-95 duration-200"
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
                WWCF Santa Cruz Device-to-Device Data Sync
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
                  Transfer application data directly from a PC/computer to a phone or tablet using a secure temporary QR session.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PC Option */}
                <button
                  type="button"
                  data-tour="transfer-pc-option"
                  onClick={() => {
                    setMode('pc_export');
                    setPcState('idle');
                  }}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-[#1b75bc]/60 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="p-3 rounded-xl bg-[#1b75bc]/20 text-[#1b75bc] w-fit group-hover:scale-105 transition-transform">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-[#1b75bc] transition-colors">
                      PC / Computer
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      Generate a temporary QR code to send data from this PC to a phone.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-semibold text-[#1b75bc] flex items-center gap-1">
                    <span>Generate Transfer QR</span>
                    <span>&rarr;</span>
                  </div>
                </button>

                {/* Phone Option */}
                <button
                  type="button"
                  data-tour="transfer-phone-option"
                  onClick={() => {
                    setMode('phone_import');
                    setPhoneState('scanning');
                  }}
                  className="p-5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-emerald-500/60 text-left transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                >
                  <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-400 w-fit group-hover:scale-105 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                      Phone / Mobile
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">
                      Open in-app camera scanner to receive data from computer.
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <span>Scan QR Code</span>
                    <span>&rarr;</span>
                  </div>
                </button>
              </div>

              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#1b75bc] shrink-0 mt-0.5" />
                <span>
                  <strong>Secure Session:</strong> Your QR code contains only a temporary session token. Application data moves securely during the active connection.
                </span>
              </div>
            </div>
          )}

          {/* VIEW 2: PC EXPORT GENERATOR */}
          {mode === 'pc_export' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
              >
                <span>&larr; Back to mode selection</span>
              </button>

              {pcState === 'idle' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
                    <h4 className="font-bold text-white text-sm">
                      Select Data to Include
                    </h4>
                    <p className="text-xs text-slate-400">
                      The current saved application dataset ({members.length} members, {songs.length} songs, {schedules.length} line-ups) will be transferred.
                    </p>

                    {/* Optional Draft Checkbox */}
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 bg-black/50 cursor-pointer hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={includeDraft}
                        onChange={(e) => setIncludeDraft(e.target.checked)}
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
                    onClick={handleGenerateQr}
                    className="w-full py-3 px-4 bg-[#1b75bc] hover:bg-[#16629e] text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#1b75bc]/20"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Generate Transfer QR</span>
                  </button>
                </div>
              )}

              {pcState === 'creating' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#1b75bc] animate-spin" />
                  <p className="text-sm font-semibold text-white">Creating temporary transfer session...</p>
                </div>
              )}

              {(pcState === 'waiting_for_device' || pcState === 'device_connected') && (
                <div data-tour="transfer-qr-display" className="flex flex-col items-center justify-center text-center space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold">
                    {pcState === 'waiting_for_device' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-amber-400">Waiting for device...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-emerald-400 font-bold">Device connected!</span>
                      </>
                    )}
                  </div>

                  {/* QR Code Container */}
                  {qrDataUrl && (
                    <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-700">
                      <img src={qrDataUrl} alt="Transfer QR Code" className="w-56 h-56 object-contain" />
                    </div>
                  )}

                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                    Scan this QR code using the <strong>Transfer Data</strong> scanner on your phone.
                  </p>

                  {/* Countdown Timer */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-[#1b75bc]" />
                    <span>Session expires in: </span>
                    <span className="font-mono font-bold text-white">{formatCountdown(secondsRemaining)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCancelPcTransfer}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel Transfer
                  </button>
                </div>
              )}

              {pcState === 'success' && (
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

              {pcState === 'expired' && (
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
                    onClick={handleGenerateQr}
                    className="py-2 px-5 bg-[#1b75bc] hover:bg-[#16629e] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Generate New QR Code</span>
                  </button>
                </div>
              )}

              {pcState === 'cancelled' && (
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

              {pcState === 'error' && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Error Creating Transfer</span>
                  </div>
                  <p>{pcErrorMessage || 'An unexpected error occurred.'}</p>
                  <button
                    type="button"
                    onClick={handleGenerateQr}
                    className="py-1.5 px-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-semibold text-xs cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: PHONE SCANNER & IMPORT */}
          {mode === 'phone_import' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer mb-2"
              >
                <span>&larr; Back to mode selection</span>
              </button>

              {/* CAMERA SCANNING SUB-VIEW */}
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

                  {/* QR Camera Reader Container */}
                  <div data-tour="transfer-scanner-view" className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 min-h-[260px] flex items-center justify-center">
                    <div id="qr-reader-target" className="w-full h-full min-h-[260px]" />

                    {/* Camera Errors */}
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

              {/* CONNECTING SUB-VIEW */}
              {phoneState === 'connecting' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Connecting to transfer session...</p>
                </div>
              )}

              {/* CONFIRMATION SUMMARY SUB-VIEW */}
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
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-lg font-extrabold text-white">{scannedSessionData.counts.members}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Members</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-lg font-extrabold text-white">{scannedSessionData.counts.songs}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Songs</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-black/60 border border-slate-800">
                        <div className="text-lg font-extrabold text-white">{scannedSessionData.counts.schedules}</div>
                        <div className="text-[10px] text-slate-400 font-medium">Line-ups</div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Choice */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Select Import Strategy:</label>
                    <div className="space-y-2">
                      <label
                        onClick={() => setImportStrategy('merge')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          importStrategy === 'merge'
                            ? 'bg-emerald-950/40 border-emerald-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importStrategy"
                          checked={importStrategy === 'merge'}
                          onChange={() => setImportStrategy('merge')}
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
                        onClick={() => setImportStrategy('replace')}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          importStrategy === 'replace'
                            ? 'bg-amber-950/40 border-amber-600 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importStrategy"
                          checked={importStrategy === 'replace'}
                          onChange={() => setImportStrategy('replace')}
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
                      onClick={handleExecuteImport}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      Import Data
                    </button>
                  </div>
                </div>
              )}

              {/* IMPORTING SUB-VIEW */}
              {phoneState === 'importing' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-sm font-semibold text-white">Importing transferred data...</p>
                </div>
              )}

              {/* SUCCESS SUB-VIEW */}
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

              {/* ERROR SUB-VIEW */}
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
