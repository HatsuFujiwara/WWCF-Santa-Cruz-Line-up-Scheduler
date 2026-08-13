import React, { useState, useEffect } from 'react';
import { Song, SongFamily, SongRelationshipType } from '../types';
import { SongFamilyService } from '../services/songFamilyService';
import {
  X,
  Layers,
  Music,
  Plus,
  Trash2,
  Check,
  Search,
  Star,
  Unlink,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SongFamilyModalProps {
  isOpen: boolean;
  familyToEdit?: SongFamily | null;
  initialSongs?: Song[];
  allSongs: Song[];
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type?: 'success' | 'danger' | 'info') => void;
}

const RELATIONSHIP_OPTIONS: { value: SongRelationshipType; label: string; desc: string }[] = [
  { value: 'ORIGINAL', label: 'Original Version', desc: 'The canonical original recording/release' },
  { value: 'LIVE_VERSION', label: 'Live Version', desc: 'Live concert or worship service recording' },
  { value: 'ACOUSTIC_VERSION', label: 'Acoustic / Unplugged', desc: 'Acoustic or stripped-down arrangement' },
  { value: 'COVER', label: 'Cover Version', desc: 'Recorded by a different artist/band' },
  { value: 'REMAKE', label: 'Remake / Re-recording', desc: 'Modern re-recording or new arrangement' },
  { value: 'ALTERNATE_VERSION', label: 'Alternate / Studio Edit', desc: 'Radio edit, extended, or alternate mix' },
  { value: 'VERSION', label: 'General Version', desc: 'Another recording or variation' }
];

export const SongFamilyModal: React.FC<SongFamilyModalProps> = ({
  isOpen,
  familyToEdit,
  initialSongs = [],
  allSongs,
  onClose,
  onSaved,
  showToast
}) => {
  if (!isOpen) return null;

  const [familyName, setFamilyName] = useState('');
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [originalSongId, setOriginalSongId] = useState<string>('');
  const [relationshipMap, setRelationshipMap] = useState<Record<string, SongRelationshipType>>({});
  const [notes, setNotes] = useState('');
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSongsList, setShowAddSongsList] = useState(false);

  useEffect(() => {
    if (familyToEdit) {
      setFamilyName(familyToEdit.name || '');
      setSelectedSongIds(familyToEdit.versionIds || []);
      setOriginalSongId(familyToEdit.originalSongId || (familyToEdit.versionIds[0] || ''));
      setNotes(familyToEdit.notes || '');

      const rMap: Record<string, SongRelationshipType> = {};
      (familyToEdit.versions || []).forEach((v) => {
        rMap[v.songId] = v.relationshipType;
      });
      // Fallback for songs in versionIds but not in versions
      familyToEdit.versionIds.forEach((sid) => {
        if (!rMap[sid]) {
          const song = allSongs.find((s) => s.id === sid);
          rMap[sid] = song?.relationshipType || (sid === familyToEdit.originalSongId ? 'ORIGINAL' : 'VERSION');
        }
      });
      setRelationshipMap(rMap);
    } else {
      const initIds = initialSongs.map((s) => s.id);
      setSelectedSongIds(initIds);
      const defaultName = initialSongs.length > 0 ? initialSongs[0].title.replace(/\s*[\(\[].*?[\)\]]/g, '').trim() : '';
      setFamilyName(defaultName);
      setOriginalSongId(initIds.length > 0 ? initIds[0] : '');
      setNotes('');

      const rMap: Record<string, SongRelationshipType> = {};
      initialSongs.forEach((s, idx) => {
        rMap[s.id] = idx === 0 ? 'ORIGINAL' : (s.relationshipType || 'VERSION');
      });
      setRelationshipMap(rMap);
    }
  }, [familyToEdit, initialSongs, allSongs]);

  const handleToggleAddSong = (songId: string) => {
    if (selectedSongIds.includes(songId)) {
      handleRemoveSong(songId);
    } else {
      setSelectedSongIds((prev) => [...prev, songId]);
      setRelationshipMap((prev) => ({
        ...prev,
        [songId]: selectedSongIds.length === 0 ? 'ORIGINAL' : 'VERSION'
      }));
      if (!originalSongId) {
        setOriginalSongId(songId);
      }
    }
  };

  const handleRemoveSong = (songId: string) => {
    const nextIds = selectedSongIds.filter((id) => id !== songId);
    setSelectedSongIds(nextIds);
    if (originalSongId === songId) {
      setOriginalSongId(nextIds.length > 0 ? nextIds[0] : '');
    }
  };

  const handleRelationshipChange = (songId: string, rel: SongRelationshipType) => {
    setRelationshipMap((prev) => ({ ...prev, [songId]: rel }));
    if (rel === 'ORIGINAL') {
      setOriginalSongId(songId);
    }
  };

  const handleSetOriginal = (songId: string) => {
    setOriginalSongId(songId);
    setRelationshipMap((prev) => ({
      ...prev,
      [songId]: 'ORIGINAL'
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      showToast('Please enter a Song Family name.', 'danger');
      return;
    }

    if (selectedSongIds.length === 0) {
      showToast('Please select at least one song to include in this family.', 'danger');
      return;
    }

    setIsSaving(true);
    try {
      const versionsList = selectedSongIds.map((sid) => ({
        songId: sid,
        relationshipType: relationshipMap[sid] || (sid === originalSongId ? 'ORIGINAL' : 'VERSION')
      }));

      if (familyToEdit) {
        await SongFamilyService.updateSongFamily({
          ...familyToEdit,
          name: familyName.trim(),
          versionIds: selectedSongIds,
          originalSongId: originalSongId || selectedSongIds[0],
          notes: notes.trim(),
          versions: versionsList.map((v) => ({ ...v, confidence: 'high' }))
        });
        showToast(`Song Family "${familyName.trim()}" updated successfully.`, 'success');
      } else {
        await SongFamilyService.createSongFamily({
          name: familyName.trim(),
          songIds: selectedSongIds,
          originalSongId: originalSongId || selectedSongIds[0],
          notes: notes.trim(),
          versions: versionsList
        });
        showToast(`Song Family "${familyName.trim()}" created successfully.`, 'success');
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving song family:', err);
      showToast('Failed to save Song Family.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFamily = async () => {
    if (!familyToEdit) return;
    if (window.confirm(`Are you sure you want to dissolve the Song Family "${familyToEdit.name}"? Individual songs will NOT be deleted.`)) {
      setIsSaving(true);
      try {
        await SongFamilyService.deleteSongFamily(familyToEdit.id);
        showToast(`Song Family "${familyToEdit.name}" dissolved. All songs are now independent.`, 'info');
        onSaved();
        onClose();
      } catch (err) {
        console.error('Error deleting song family:', err);
        showToast('Failed to delete Song Family.', 'danger');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Filter available songs for adding
  const availableSongsToAdd = allSongs.filter((s) => {
    if (selectedSongIds.includes(s.id)) return false;
    if (!songSearchQuery.trim()) return true;
    const q = songSearchQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
  });

  const selectedSongObjects = selectedSongIds
    .map((id) => allSongs.find((s) => s.id === id))
    .filter(Boolean) as Song[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {familyToEdit ? 'Manage Song Family' : 'Create Song Family'}
              </h2>
              <p className="text-xs text-slate-500">
                Group multiple recordings/versions of the same composition together
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Family Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Canonical Song Family Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. Tribes, Sukdulang Biyaya, Forever"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This name will be displayed as the main title in aggregate usage statistics & member favorite analytics.
            </p>
          </div>

          {/* Member Songs in this Family */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Member Song Versions ({selectedSongObjects.length})
              </label>
              <button
                type="button"
                onClick={() => setShowAddSongsList(!showAddSongsList)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddSongsList ? 'Close Song Picker' : 'Add Songs to Family'}</span>
              </button>
            </div>

            {/* Song Picker Drawer */}
            {showAddSongsList && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={songSearchQuery}
                    onChange={(e) => setSongSearchQuery(e.target.value)}
                    placeholder="Search song from database to add..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {availableSongsToAdd.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">No matching songs available.</p>
                  ) : (
                    availableSongsToAdd.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleToggleAddSong(s.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Music className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{s.title}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">• {s.artist}</span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Add
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected Songs List */}
            {selectedSongObjects.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                No songs added to this family yet. Click <strong>"Add Songs to Family"</strong> above.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSongObjects.map((song) => {
                  const isOriginal = originalSongId === song.id;
                  const currentRel = relationshipMap[song.id] || (isOriginal ? 'ORIGINAL' : 'VERSION');

                  return (
                    <div
                      key={song.id}
                      className={`p-3 rounded-xl border transition-colors ${
                        isOriginal
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {song.title}
                            </span>
                            {isOriginal && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-300">
                                <Star className="w-2.5 h-2.5 fill-amber-500" /> Original
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {song.artist} {song.album ? `• ${song.album}` : ''} {song.key ? `• Key: ${song.key}` : ''} • Used {song.timesUsed}x
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isOriginal && (
                            <button
                              type="button"
                              onClick={() => handleSetOriginal(song.id)}
                              title="Set as Original Version"
                              className="px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 hover:bg-amber-200/80 rounded-lg transition-colors cursor-pointer"
                            >
                              Set as Original
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSong(song.id)}
                            title="Remove from family"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Relationship Type Selector */}
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-500 shrink-0">Relationship:</span>
                        <select
                          value={currentRel}
                          onChange={(e) => handleRelationshipChange(song.id, e.target.value as SongRelationshipType)}
                          className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        >
                          {RELATIONSHIP_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Family Composition Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Written by Kyle Cedric Salvador; original key C; includes live acoustic variation"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            {familyToEdit && (
              <button
                type="button"
                onClick={handleDeleteFamily}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dissolve Family</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : familyToEdit ? 'Save Changes' : 'Create Family'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
