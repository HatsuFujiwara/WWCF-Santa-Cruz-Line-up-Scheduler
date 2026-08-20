import React, { useState } from 'react';
import {
  Youtube,
  Music,
  Check,
  AlertTriangle,
  AlertCircle,
  Loader2,
  X,
  Plus,
  ExternalLink,
  Sparkles,
  Layers,
  Info,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Clipboard,
  Link as LinkIcon
} from 'lucide-react';
import { Song, SongCategory, SongConflictResult, SongRelationshipType, SongFamily, SongVersionType } from '../types';
import { extractYouTubeId, SongService } from '../services/songService';
import { SongFamilyService } from '../services/songFamilyService';
import { fetchMultiSourceMetadata } from '../services/musicMetadataService';
import { sanitizeSongLanguage, SongLanguage } from '../utils/languageUtils';
import { getManilaTodayString } from '../utils/dateUtils';
import { areArtistsEquivalent } from '../utils/songFamilyUtils';
import { detectSongVersionType } from '../utils/versionDetectionUtils';

export interface SingleSongImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (savedSong: Song, isNew: boolean) => void;
  initialCategory?: 'praise' | 'worship' | 'both';
  targetLineupSlot?: {
    category: 'praise' | 'worship';
    index: number;
  };
  onSelectExistingForLineup?: (existingSong: Song, performedKey?: string) => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const SingleSongImportModal: React.FC<SingleSongImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  initialCategory = 'praise',
  targetLineupSlot,
  onSelectExistingForLineup,
  showToast
}) => {
  const [step, setStep] = useState<'INPUT' | 'PREVIEW' | 'CONFLICT_RESOLUTION'>('INPUT');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields State
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [duration, setDuration] = useState('');
  const [key, setKey] = useState('');
  const [performedKey, setPerformedKey] = useState('');
  const [language, setLanguage] = useState<SongLanguage>('English');
  const [category, setCategory] = useState<SongCategory>(initialCategory);
  const [versionType, setVersionType] = useState<SongVersionType>('original');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [songwriters, setSongwriters] = useState('');
  const [ccliNumber, setCcliNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Conflict / Duplicate detection state
  const [conflictResult, setConflictResult] = useState<SongConflictResult | null>(null);
  const [existingSongMatch, setExistingSongMatch] = useState<Song | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<SongRelationshipType>('COVER');
  const [existingSongFamily, setExistingSongFamily] = useState<SongFamily | null>(null);

  // Reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep('INPUT');
      setUrlInput('');
      setErrorMsg(null);
      setIsLoading(false);
      setIsEditing(false);
      setTitle('');
      setArtist('');
      setAlbum('');
      setReleaseYear('');
      setDuration('');
      setKey('');
      setPerformedKey('');
      setLanguage('English');
      setCategory(initialCategory || 'praise');
      setVersionType('original');
      setYoutubeUrl('');
      setYoutubeId('');
      setThumbnailUrl('');
      setLyrics('');
      setSongwriters('');
      setCcliNumber('');
      setNotes('');
      setConflictResult(null);
      setExistingSongMatch(null);
      setSelectedRelationship('COVER');
      setExistingSongFamily(null);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setUrlInput(text.trim());
          setErrorMsg(null);
        }
      }
    } catch {
      // Ignore clipboard read permission failures
    }
  };

  const handleFetchSong = async () => {
    const raw = urlInput.trim();
    if (!raw) {
      setErrorMsg('Please enter a valid YouTube or YouTube Music URL.');
      return;
    }

    // Validate YouTube URL structure
    const ytId = extractYouTubeId(raw);
    const isYtUrl =
      raw.includes('youtube.com') ||
      raw.includes('youtu.be') ||
      raw.includes('music.youtube.com') ||
      !!ytId;

    if (!isYtUrl && !ytId) {
      setErrorMsg('This source is not supported. Please use a YouTube or YouTube Music song link.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Fetch metadata using the comprehensive music metadata service
      const meta = await fetchMultiSourceMetadata(raw);

      const parsedTitle = meta.title || 'Untitled Song';
      const parsedArtist = meta.artist || 'Unknown Artist';
      const parsedYtUrl = meta.youtubeMusicUrl || meta.youtubeUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : raw);
      const parsedYtId = meta.youtubeId || ytId || '';
      const parsedThumb = meta.thumbnailUrl || (parsedYtId ? `https://img.youtube.com/vi/${parsedYtId}/hqdefault.jpg` : '');
      const parsedLang = sanitizeSongLanguage(meta.language || 'English');
      const parsedKey = meta.key || meta.originalKey || '';

      // Auto-detect Original vs Cover status
      const detectedVer = detectSongVersionType({
        title: parsedTitle,
        artist: parsedArtist,
        relationshipType: meta.relationshipType
      });
      setVersionType(detectedVer.versionType);

      setTitle(parsedTitle);
      setArtist(parsedArtist);
      setAlbum(meta.album || '');
      setReleaseYear(meta.releaseYear || '');
      setDuration(meta.duration || '');
      setKey(parsedKey);
      setPerformedKey(parsedKey);
      setLanguage(parsedLang);
      setCategory(initialCategory || 'praise');
      setYoutubeUrl(parsedYtUrl);
      setYoutubeId(parsedYtId);
      setThumbnailUrl(parsedThumb);
      setLyrics(meta.lyrics || '');
      setSongwriters(meta.songwriters || '');
      setCcliNumber(meta.ccliNumber || '');
      setNotes(`Imported from ${parsedYtUrl.includes('music.youtube.com') ? 'YouTube Music' : 'YouTube'} on ${getManilaTodayString()}`);

      // 2. Check for conflicts & duplicate in the Song Database
      const conflict = await SongService.detectSongConflict({
        title: parsedTitle,
        artist: parsedArtist,
        album: meta.album,
        songwriters: meta.songwriters,
        lyrics: meta.lyrics,
        ccliNumber: meta.ccliNumber,
        youtubeUrl: parsedYtUrl,
        youtubeId: parsedYtId
      });

      if (conflict.hasConflict && conflict.existingSong) {
        setConflictResult(conflict);
        setExistingSongMatch(conflict.existingSong);
        if (conflict.existingSong.songFamilyId) {
          const fam = await SongFamilyService.getSongFamilyById(conflict.existingSong.songFamilyId);
          setExistingSongFamily(fam);
        }
        if (conflict.suggestedRelationship) {
          setSelectedRelationship(conflict.suggestedRelationship);
          if (conflict.suggestedRelationship === 'COVER') {
            setVersionType('cover');
          } else if (conflict.suggestedRelationship === 'ORIGINAL') {
            setVersionType('original');
          }
        }
        setStep('CONFLICT_RESOLUTION');
      } else {
        setConflictResult(null);
        setExistingSongMatch(null);
        setStep('PREVIEW');
      }
    } catch (err: any) {
      console.warn('Metadata fetch error:', err);
      // Fallback: allow manual entry if fetch failed
      const cleanYtId = extractYouTubeId(raw) || '';
      setTitle('');
      setArtist('');
      setVersionType('original');
      setYoutubeUrl(raw);
      setYoutubeId(cleanYtId);
      if (cleanYtId) {
        setThumbnailUrl(`https://img.youtube.com/vi/${cleanYtId}/hqdefault.jpg`);
      }
      setIsEditing(true);
      setStep('PREVIEW');
      setErrorMsg('Unable to retrieve metadata from this source. You can manually enter the song details below.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveImportedSong = async (linkToExistingFamily = false) => {
    if (!title.trim()) {
      showToast('Please enter a song title.', 'danger');
      return;
    }

    setIsLoading(true);
    try {
      // If linking to family as COVER, ensure versionType is cover; if ORIGINAL, ensure original
      const finalVersionType: SongVersionType = linkToExistingFamily
        ? (selectedRelationship === 'COVER' ? 'cover' : selectedRelationship === 'ORIGINAL' ? 'original' : versionType)
        : versionType;

      // 1. Save song to database
      const songDataToSave: Partial<Song> & { title: string } = {
        title: title.trim(),
        artist: artist.trim() || 'Unknown Artist',
        album: album.trim(),
        releaseYear: releaseYear.trim(),
        genre: 'Praise & Worship',
        key: key.trim(),
        originalKey: key.trim(),
        versionType: finalVersionType,
        duration: duration.trim() || '3:45',
        category: category,
        language: sanitizeSongLanguage(language),
        youtubeUrl: youtubeUrl.trim(),
        youtubeId: youtubeId.trim() || (youtubeUrl ? extractYouTubeId(youtubeUrl) || undefined : undefined),
        thumbnailUrl: thumbnailUrl.trim() || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : undefined),
        lyrics: lyrics.trim(),
        songwriters: songwriters.trim(),
        ccliNumber: ccliNumber.trim(),
        notes: notes.trim()
      };

      const saved = await SongService.saveSong(songDataToSave);

      // 2. If linking to Song Family
      if (linkToExistingFamily && existingSongMatch) {
        try {
          if (existingSongMatch.songFamilyId) {
            await SongFamilyService.addSongToFamily(
              existingSongMatch.songFamilyId,
              saved.id,
              selectedRelationship
            );
          } else {
            // Create a new family containing both songs
            await SongFamilyService.createSongFamily({
              name: existingSongMatch.title,
              songIds: [existingSongMatch.id, saved.id],
              originalSongId: selectedRelationship === 'ORIGINAL' ? saved.id : existingSongMatch.id,
              versions: [
                { songId: existingSongMatch.id, relationshipType: selectedRelationship === 'ORIGINAL' ? 'COVER' : 'ORIGINAL' },
                { songId: saved.id, relationshipType: selectedRelationship }
              ]
            });
          }
        } catch (e) {
          console.error('Failed to link song family:', e);
        }
      }

      showToast(`"${saved.title}" imported successfully!`, 'success');
      onImportComplete(saved, true);

      // If in Lineup context and callback provided
      if (targetLineupSlot && onSelectExistingForLineup) {
        onSelectExistingForLineup(saved, performedKey.trim() || key.trim());
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('Failed to save imported song.', 'danger');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExistingSong = () => {
    if (!existingSongMatch) return;
    if (onSelectExistingForLineup) {
      onSelectExistingForLineup(existingSongMatch, performedKey.trim() || existingSongMatch.key || '');
    }
    showToast(`Added "${existingSongMatch.title}" to lineup`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center shadow-xs">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                <span>Import Song</span>
                {targetLineupSlot && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize">
                    For {targetLineupSlot.category} #{targetLineupSlot.index + 1}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import a single song from YouTube or YouTube Music
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* STEP 1: INPUT URL */}
          {step === 'INPUT' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  YouTube / YouTube Music URL <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleFetchSong();
                        }
                      }}
                      placeholder="https://www.youtube.com/watch?v=... or https://music.youtube.com/watch?v=..."
                      className="w-full pl-3.5 pr-20 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      autoFocus
                    />
                    {urlInput && (
                      <button
                        type="button"
                        onClick={() => setUrlInput('')}
                        className="absolute right-10 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                        title="Clear"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="absolute right-2 top-2 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-700 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-3 h-3" />
                      <span>Paste</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFetchSong}
                    disabled={isLoading || !urlInput.trim()}
                    className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer min-h-[40px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Fetch Song</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Accepted formats: <code className="text-slate-600 dark:text-slate-300">youtube.com/watch?v=...</code>, <code className="text-slate-600 dark:text-slate-300">youtu.be/...</code>, or <code className="text-slate-600 dark:text-slate-300">music.youtube.com/watch?v=...</code>
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Info Note */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Info className="w-4 h-4 text-indigo-500" />
                  <span>Automatic Multi-Source Metadata Retrieval</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  The system will automatically extract the song title, artist, original key, release year, album art, duration, and detect its language (<strong>English</strong>, <strong>Tagalog</strong>, or <strong>Multi-lingual</strong>). You will be able to review and edit before saving.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: CONFLICT / DUPLICATE DETECTION RESOLUTION */}
          {step === 'CONFLICT_RESOLUTION' && existingSongMatch && (
            <div className="space-y-4 animate-in fade-in">
              {/* Conflict Header Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                conflictResult?.conflictType === 'SAME_TITLE_DIFF_ARTIST'
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
                  : 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200'
              }`}>
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <h4 className="font-bold text-sm">
                    {conflictResult?.conflictType === 'SAME_TITLE_SAME_ARTIST' && '⚠️ POSSIBLE DUPLICATE SONG'}
                    {conflictResult?.conflictType === 'SAME_TITLE_DIFF_ARTIST' && '⚠️ SAME TITLE, DIFFERENT ARTIST'}
                    {conflictResult?.conflictType === 'SAME_VIDEO_MATCH' && '⚠️ MATCHING VIDEO LINK FOUND'}
                    {conflictResult?.conflictType === 'DIFF_TITLE_POSSIBLE_COMPOSITION' && '⚠️ POSSIBLE RELATED SONG'}
                  </h4>
                  <p className="text-xs leading-relaxed opacity-90">
                    {conflictResult?.conflictType === 'SAME_TITLE_SAME_ARTIST' &&
                      'Same artist detected. This may be the same recording or a duplicate.'}
                    {conflictResult?.conflictType === 'SAME_TITLE_DIFF_ARTIST' &&
                      'A song with the same title exists in your Song Database, but the artist is different. Are these the same underlying song?'}
                    {conflictResult?.conflictType === 'SAME_VIDEO_MATCH' &&
                      'An existing song in your database shares this exact YouTube recording link.'}
                    {conflictResult?.conflictType === 'DIFF_TITLE_POSSIBLE_COMPOSITION' &&
                      'This song has a different title but composition analysis suggests it may be related to an existing song.'}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                {/* Existing Song Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                      Existing in Library
                    </span>
                    {existingSongMatch.timesUsed > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        Used {existingSongMatch.timesUsed}x
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 pt-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {existingSongMatch.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-1">
                      {existingSongMatch.artist || 'Unknown Artist'}
                    </p>
                    {existingSongMatch.album && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        Album: {existingSongMatch.album}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    {existingSongMatch.key && <span>Key: <strong className="text-slate-700 dark:text-slate-200">{existingSongMatch.key}</strong></span>}
                    {existingSongMatch.language && <span>Lang: <strong className="text-slate-700 dark:text-slate-200">{existingSongMatch.language}</strong></span>}
                    {existingSongFamily && (
                      <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                        <Layers className="w-3 h-3" /> Family: {existingSongFamily.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Candidate / Imported Song Card */}
                <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/80 px-2 py-0.5 rounded-md">
                      Imported Link
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      New Record
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {title}
                    </h5>
                    <p className="text-xs text-indigo-950 dark:text-indigo-200 font-semibold line-clamp-1">
                      {artist || 'Unknown Artist'}
                    </p>
                    {album && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Album: {album}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-indigo-200/60 dark:border-indigo-900/60">
                    {key && <span>Key: <strong className="text-slate-700 dark:text-slate-200">{key}</strong></span>}
                    <span>Lang: <strong className="text-slate-700 dark:text-slate-200">{language}</strong></span>
                    <span>Cat: <strong className="text-slate-700 dark:text-slate-200 capitalize">{category}</strong></span>
                  </div>
                </div>
              </div>

              {/* Relationship picker if DIFFERENT ARTIST or RELATED COMPOSITION */}
              {conflictResult?.conflictType === 'SAME_TITLE_DIFF_ARTIST' && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    If this is a related song, choose relationship type:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['COVER', 'LIVE_VERSION', 'ACOUSTIC_VERSION', 'ALTERNATE_VERSION', 'ORIGINAL', 'VERSION'] as SongRelationshipType[]).map((rel) => (
                      <button
                        key={rel}
                        type="button"
                        onClick={() => setSelectedRelationship(rel)}
                        className={`p-2 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                          selectedRelationship === rel
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {rel === 'COVER' && 'Cover'}
                        {rel === 'LIVE_VERSION' && 'Live'}
                        {rel === 'ACOUSTIC_VERSION' && 'Acoustic'}
                        {rel === 'ALTERNATE_VERSION' && 'Alt Version'}
                        {rel === 'ORIGINAL' && 'Original'}
                        {rel === 'VERSION' && 'Version'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons for Conflict */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* If in Lineup context, offer to Use Existing Song */}
                {targetLineupSlot && (
                  <button
                    type="button"
                    onClick={handleUseExistingSong}
                    className="w-full py-2.5 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Use Existing Song in Lineup</span>
                  </button>
                )}

                {conflictResult?.conflictType === 'SAME_TITLE_DIFF_ARTIST' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveImportedSong(false)}
                      disabled={isLoading}
                      className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      NO — DIFFERENT SONG
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveImportedSong(true)}
                      disabled={isLoading}
                      className="py-2.5 px-4 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-4 h-4" />
                      <span>YES — LINK TO FAMILY</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('INPUT')}
                      className="py-2.5 px-4 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Cancel / Try Another Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('PREVIEW')}
                      className="py-2.5 px-4 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 hover:bg-amber-100 dark:hover:bg-amber-900/80 border border-amber-200 dark:border-amber-800 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 text-center"
                    >
                      <span>Continue as Separate Song</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & EDIT BEFORE SAVING */}
          {step === 'PREVIEW' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-24 h-20 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 relative border border-slate-300 dark:border-slate-600 shadow-xs">
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Music className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[9px] font-bold flex items-center gap-0.5">
                      <Youtube className="w-2.5 h-2.5 text-red-500" />
                      <span>{duration || '3:45'}</span>
                    </div>
                  </div>

                  {/* Song Core Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="text-base font-black text-slate-900 dark:text-slate-100 truncate">
                      {title || 'Untitled Song'}
                    </h4>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                      {artist || 'Unknown Artist'}
                    </p>
                    {album && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Album: {album} {releaseYear ? `(${releaseYear})` : ''}
                      </p>
                    )}

                    {youtubeUrl && (
                      <a
                        href={youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:underline pt-0.5"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        <span>Open on YouTube / YouTube Music</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                    <span>Status:</span>
                    {versionType === 'cover' ? (
                      <span className="text-purple-600 dark:text-purple-400 uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span>COVER</span>
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>ORIGINAL</span>
                      </span>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                    <span>Language:</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{language}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                    <span>Category:</span>
                    <span className="capitalize text-emerald-600 dark:text-emerald-400">{category}</span>
                  </div>

                  {key && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                      <span>Original Key:</span>
                      <span className="text-purple-600 dark:text-purple-400">{key}</span>
                    </div>
                  )}

                  {targetLineupSlot && performedKey && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold">
                      <span>Performed Key:</span>
                      <span>{performedKey}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Edit Form */}
              {isEditing && (
                <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      Edit Song Metadata
                    </h5>
                    <span className="text-[10px] text-slate-400">Fine-tune before saving</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Song Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Artist / Worship Leader
                      </label>
                      <input
                        type="text"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Song Status (Original / Cover) <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setVersionType('original')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            versionType === 'original'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>ORIGINAL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setVersionType('cover')}
                          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            versionType === 'cover'
                              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>COVER</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(sanitizeSongLanguage(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                      >
                        <option value="English">English</option>
                        <option value="Tagalog">Tagalog</option>
                        <option value="Multi-lingual">Multi-lingual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as SongCategory)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
                      >
                        <option value="praise">Praise (Fast)</option>
                        <option value="worship">Worship (Slow)</option>
                        <option value="both">Both</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Original Key
                      </label>
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="e.g. G, C, D"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium uppercase"
                      />
                    </div>

                    {targetLineupSlot && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Performed Key (For Lineup)
                        </label>
                        <input
                          type="text"
                          value={performedKey}
                          onChange={(e) => setPerformedKey(e.target.value)}
                          placeholder="e.g. D"
                          className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 font-bold uppercase"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Album
                      </label>
                      <input
                        type="text"
                        value={album}
                        onChange={(e) => setAlbum(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Release Year
                      </label>
                      <input
                        type="text"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(e.target.value)}
                        placeholder="e.g. 2023"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep('INPUT')}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Hide Edit Form' : 'Edit Before Saving'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveImportedSong(false)}
                    disabled={isLoading || !title.trim()}
                    className="px-5 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>{targetLineupSlot ? 'Add to Lineup & Database' : 'Add Song'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
