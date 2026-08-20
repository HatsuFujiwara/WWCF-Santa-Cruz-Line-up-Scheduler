import React, { useState } from 'react';
import {
  Youtube,
  Music2,
  ListMusic,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import {
  YouTubePlaylistService,
  YouTubePlaylistPreview,
  PlaylistItem,
  ImportSummary,
  extractPlaylistId
} from '../services/youtubePlaylistService';
import { Song } from '../types';
import { RearrangeableSongList } from './RearrangeableSongList';

interface PlaylistImportModalProps {
  isOpen: boolean;
  isEditing?: boolean;
  onClose: () => void;
  onImportComplete: (importedSongs: Song[], summary: ImportSummary) => void;
  onSelectBlank: () => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

export const PlaylistImportModal: React.FC<PlaylistImportModalProps> = ({
  isOpen,
  isEditing = false,
  onClose,
  onImportComplete,
  onSelectBlank,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'url_input' | 'preview' | 'summary'>('url_input');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('YOUTUBE_API_KEY') || 'AIzaSyBgN1CgoxgHCZVKU_a_KQuOGY-qSSBpctQ');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preview state
  const [preview, setPreview] = useState<YouTubePlaylistPreview | null>(null);
  const [previewItems, setPreviewItems] = useState<PlaylistItem[]>([]);
  const [selectedItemsMap, setSelectedItemsMap] = useState<Record<string, boolean>>({});

  // Summary state
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) {
      localStorage.setItem('YOUTUBE_API_KEY', val.trim());
    } else {
      localStorage.removeItem('YOUTUBE_API_KEY');
    }
  };

  const handleFetchPreview = async (urlToFetch?: string) => {
    const targetUrl = urlToFetch || playlistUrl;
    if (!targetUrl.trim()) {
      setErrorMsg('Please paste a valid YouTube or YouTube Music playlist URL.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await YouTubePlaylistService.fetchPlaylistPreview(targetUrl, apiKey);
      setPreview(data);
      setPreviewItems(data.items || []);

      // Select all songs by default
      const initialMap: Record<string, boolean> = {};
      data.items.forEach((item) => {
        initialMap[item.videoId] = true;
      });
      setSelectedItemsMap(initialMap);

      setActiveTab('preview');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to fetch playlist details. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelectAll = (selectAll: boolean) => {
    const updated: Record<string, boolean> = {};
    previewItems.forEach((item) => {
      updated[item.videoId] = selectAll;
    });
    setSelectedItemsMap(updated);
  };

  const handleToggleItem = (videoId: string) => {
    setSelectedItemsMap((prev) => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  const selectedCount = Object.values(selectedItemsMap).filter(Boolean).length;

  const handleExecuteImport = async () => {
    if (!preview) return;

    const rawSelected = previewItems.filter((item) => selectedItemsMap[item.videoId]);
    if (rawSelected.length === 0) {
      showToast('Please select at least one song to import.', 'danger');
      return;
    }

    // Assign final playlist positions based on the user's rearranged order
    const itemsToImport = rawSelected.map((item, idx) => ({
      ...item,
      playlistPosition: idx + 1
    }));

    setIsImporting(true);

    try {
      const { summary, importedSongs } = await YouTubePlaylistService.importPlaylistSongs(
        itemsToImport,
        {
          playlistId: preview.playlistId,
          playlistName: preview.playlistName
        }
      );

      setImportSummary(summary);
      setActiveTab('summary');
      onImportComplete(importedSongs, summary);
    } catch (err: any) {
      console.error(err);
      showToast('Error importing songs from playlist.', 'danger');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div data-tour="import-modal-container" className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-lg">
              <Youtube className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Import YouTube / YouTube Music Playlist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Paste your YouTube or YouTube Music playlist link to import worship songs.
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
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'url_input' && (
            <div className="space-y-4">
              {/* URL Input Form */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  YouTube or YouTube Music Playlist URL
                </label>
                <div className="relative">
                  <input
                    data-tour="playlist-url-input"
                    type="url"
                    autoFocus
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFetchPreview();
                    }}
                    placeholder="https://www.youtube.com/playlist?list=PL... or https://music.youtube.com/..."
                    className="w-full pl-10 pr-32 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                  <Youtube className="w-5 h-5 text-red-500 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => handleFetchPreview()}
                    disabled={isLoading || !playlistUrl.trim()}
                    className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing...</span>
                      </>
                    ) : (
                      <>
                        <span>Import Playlist</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {isLoading && (
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-800 dark:text-indigo-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                    <span>Importing playlist... Please wait.</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Supports public/unlisted YouTube Playlists and YouTube Music mixes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium underline cursor-pointer"
                  >
                    {showApiKeyInput ? 'Hide API Key Settings' : 'Custom API Key (Optional)'}
                  </button>
                </div>

                {showApiKeyInput && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5 animate-fadeIn">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      YouTube Data API v3 Key (Optional — saved locally)
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => handleApiKeyChange(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Provide an official API key if your project requires higher quota limits.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Playlist Preview */}
          {activeTab === 'preview' && preview && (
            <div className="space-y-4">
              {/* Playlist Summary Card */}
              <div className="flex items-start gap-4 p-4 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl">
                <img
                  src={preview.playlistThumbnail}
                  alt={preview.playlistName}
                  className="w-20 h-20 object-cover rounded-lg shadow-sm border border-indigo-200 dark:border-indigo-800 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      YouTube Playlist
                    </span>
                    <a
                      href={preview.playlistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                    {preview.playlistName}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 mt-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Music2 className="w-3.5 h-3.5 text-indigo-500" />
                      {preview.totalSongs} Songs
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      Est. {preview.estimatedTotalDuration}
                    </span>
                  </div>
                </div>
              </div>

              {/* Selection Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select songs to import ({selectedCount} of {preview.totalSongs} selected)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Rearrangeable Song List */}
              <RearrangeableSongList
                items={previewItems}
                onReorder={(newItems) => setPreviewItems(newItems)}
                selectedItemsMap={selectedItemsMap}
                onToggleItem={handleToggleItem}
              />

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic text-center pt-1">
                Drag and drop songs or use the arrow buttons to rearrange the line-up order. Positions 1 & 2 will automatically become Praise Songs, and Positions 3+ will become Worship Songs.
              </p>
            </div>
          )}

          {/* Tab 3: Summary */}
          {activeTab === 'summary' && importSummary && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Playlist Successfully Imported!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The lineup has been populated and songs have been synchronized with the Song Database.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {importSummary.totalImported}
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Imported</p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    {importSummary.newlyAdded}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">New Songs Added</p>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {importSummary.existingFound}
                  </p>
                  <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300">Existing Reused</p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {importSummary.skippedErrors}
                  </p>
                  <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Skipped/Errors</p>
                </div>
              </div>

              {importSummary.existingSongTitles.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left border border-slate-200 dark:border-slate-700 text-xs">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Existing Songs Reused & Updated:
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">
                    {importSummary.existingSongTitles.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          {activeTab === 'url_input' && (
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}

          {activeTab === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('url_input')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 transition-colors"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-tour="import-submit-btn"
                  onClick={handleExecuteImport}
                  disabled={isImporting || selectedCount === 0}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing Songs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Import {selectedCount} Selected Songs</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {activeTab === 'summary' && (
            <button
              type="button"
              data-tour="import-done-btn"
              onClick={onClose}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              Done & Edit Line-up
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
