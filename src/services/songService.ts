import { Song, Schedule, SongCategory } from '../types';
import { DEFAULT_SONGS } from '../data/songSeedData';
import { getManilaTodayString, getManilaNowISO } from '../utils/dateUtils';
import { isFirstRegularServiceOfMonth, getLastRegularSchedulesOfPreviousMonth } from '../utils/scheduleUtils';
import { isSpecialEvent, isFirstWeekOfMonth, getLastWeekOfPreviousMonthRange } from '../utils/recommendationUtils';

const SONGS_STORAGE_KEY = 'wwcf_songs_v1';

export interface DuplicateMatch {
  isDuplicate: boolean;
  matchType?: 'title' | 'youtubeId' | 'youtubeUrl';
  existingSong?: Song;
}

export interface YouTubeMetadataResult {
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  title?: string;
  artist?: string;
  duration?: string;
}

export interface AffectedScheduleRef {
  id: string;
  serviceDate: string;
  serviceType: string;
}

export interface MonthlyUsageCheckResult {
  songTitle: string;
  timesUsedThisMonth: number;
  lastDateUsed?: string;
  serviceTypes: string[];
  datesUsed: string[];
  affectedSchedules?: AffectedScheduleRef[];
}

/**
 * Extracts YouTube 11-character Video ID from various URL formats
 */
export function extractYouTubeId(urlStr: string): string | null {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();
  // Regex supporting youtube.com, youtu.be, m.youtube.com, music.youtube.com, shorts, etc.
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }
  // If user pasted raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Asynchronous SongService layer structured for easy migration to Firebase/Supabase
 */
export class SongService {
  /**
   * Overwrites/Saves full songs list (used for restores or mass updates)
   */
  static async saveSongsList(songs: Song[]): Promise<void> {
    try {
      localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
    } catch (e) {
      console.error('Error saving songs list:', e);
    }
  }

  /**
   * Retrieves all songs from database (LocalStorage or Cloud backend)
   */
  static async getSongs(): Promise<Song[]> {
    try {
      const data = localStorage.getItem(SONGS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (e) {
      console.error('Error fetching songs:', e);
      return [];
    }
  }

  /**
   * Saves or updates a song in the database
   */
  static async saveSong(songData: Partial<Song> & { title: string }): Promise<Song> {
    const songs = await this.getSongs();
    let savedSong: Song;

    if (songData.id) {
      // Update existing
      const index = songs.findIndex((s) => s.id === songData.id);
      savedSong = {
        id: songData.id,
        title: songData.title.trim(),
        artist: (songData.artist || 'Unknown Artist').trim(),
        album: songData.album || '',
        genre: songData.genre || 'Praise & Worship',
        key: songData.key || '',
        originalKey: songData.originalKey || songData.key || '',
        bpm: songData.bpm ? Number(songData.bpm) : undefined,
        timeSignature: songData.timeSignature || '',
        duration: songData.duration || '',
        releaseYear: songData.releaseYear || '',
        language: songData.language || 'English',
        ccliNumber: songData.ccliNumber || '',
        youtubeUrl: songData.youtubeUrl || '',
        youtubeId: songData.youtubeId || (songData.youtubeUrl ? extractYouTubeId(songData.youtubeUrl) || undefined : undefined),
        thumbnailUrl: songData.thumbnailUrl || (songData.youtubeId ? `https://img.youtube.com/vi/${songData.youtubeId}/hqdefault.jpg` : ''),
        coverArtUrl: songData.coverArtUrl || '',
        isrc: songData.isrc || '',
        spotifyUrl: songData.spotifyUrl || '',
        appleMusicUrl: songData.appleMusicUrl || '',
        qobuzUrl: songData.qobuzUrl || '',
        tidalUrl: songData.tidalUrl || '',
        geniusUrl: songData.geniusUrl || '',
        dateAdded: songData.dateAdded || getManilaTodayString(),
        lastUsedDate: songData.lastUsedDate,
        timesUsed: songData.timesUsed ?? 0,
        serviceHistory: songData.serviceHistory || [],
        notes: songData.notes || '',
        category: songData.category || 'both',
        labels: songData.labels || [],
        themes: songData.themes || []
      };

      if (index >= 0) {
        songs[index] = savedSong;
      } else {
        songs.push(savedSong);
      }
    } else {
      // Create new
      const newId = 'song_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const ytId = songData.youtubeId || (songData.youtubeUrl ? extractYouTubeId(songData.youtubeUrl) || undefined : undefined);
      
      savedSong = {
        id: newId,
        title: songData.title.trim(),
        artist: (songData.artist || 'Unknown Artist').trim(),
        album: songData.album || '',
        genre: songData.genre || 'Praise & Worship',
        key: songData.key || '',
        originalKey: songData.originalKey || songData.key || '',
        bpm: songData.bpm ? Number(songData.bpm) : undefined,
        timeSignature: songData.timeSignature || '',
        duration: songData.duration || '',
        releaseYear: songData.releaseYear || '',
        language: songData.language || 'English',
        ccliNumber: songData.ccliNumber || '',
        youtubeUrl: songData.youtubeUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
        youtubeId: ytId,
        thumbnailUrl: songData.thumbnailUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : ''),
        coverArtUrl: songData.coverArtUrl || '',
        isrc: songData.isrc || '',
        spotifyUrl: songData.spotifyUrl || '',
        appleMusicUrl: songData.appleMusicUrl || '',
        qobuzUrl: songData.qobuzUrl || '',
        tidalUrl: songData.tidalUrl || '',
        geniusUrl: songData.geniusUrl || '',
        dateAdded: getManilaTodayString(),
        timesUsed: 0,
        serviceHistory: [],
        notes: songData.notes || '',
        category: songData.category || 'both',
        labels: songData.labels || [],
        themes: songData.themes || []
      };
      songs.unshift(savedSong);
    }

    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
    return savedSong;
  }

  /**
   * Bulk updates category for multiple songs by ID array
   */
  static async bulkUpdateCategory(ids: string[], category: SongCategory): Promise<void> {
    if (!ids || ids.length === 0) return;
    const songs = await this.getSongs();
    const idSet = new Set(ids.map((id) => id.trim()));
    let modified = false;

    for (const song of songs) {
      if (idSet.has(song.id)) {
        song.category = category;
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
    }
  }

  /**
   * Deletes a song by ID or title match
   */
  static async deleteSong(id: string): Promise<void> {
    if (!id) return;
    const songs = await this.getSongs();
    const targetId = id.trim();
    const targetTitle = targetId.toLowerCase();

    const filtered = songs.filter(
      (s) => s.id !== targetId && s.title.trim().toLowerCase() !== targetTitle
    );
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Bulk deletes multiple songs by array of IDs
   */
  static async deleteSongsBulk(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const songs = await this.getSongs();
    const idSet = new Set(ids.map((id) => id.trim()));
    const filtered = songs.filter((s) => !idSet.has(s.id));
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Checks database for duplicate song by Title, YouTube ID, or YouTube URL
   */
  static async findDuplicate(query: {
    title?: string;
    youtubeUrl?: string;
    youtubeId?: string;
    excludeId?: string;
  }): Promise<DuplicateMatch> {
    const songs = await this.getSongs();
    const cleanTitle = query.title ? query.title.trim().toLowerCase() : '';
    const cleanYtId = query.youtubeId || (query.youtubeUrl ? extractYouTubeId(query.youtubeUrl) : null);
    const cleanYtUrl = query.youtubeUrl ? query.youtubeUrl.trim().toLowerCase() : '';

    for (const song of songs) {
      if (query.excludeId && song.id === query.excludeId) continue;

      // Check YouTube ID match
      if (cleanYtId && song.youtubeId && song.youtubeId === cleanYtId) {
        return { isDuplicate: true, matchType: 'youtubeId', existingSong: song };
      }

      // Check YouTube URL match
      if (cleanYtUrl && song.youtubeUrl && song.youtubeUrl.trim().toLowerCase() === cleanYtUrl) {
        return { isDuplicate: true, matchType: 'youtubeUrl', existingSong: song };
      }

      // Check Title match (exact case-insensitive)
      if (cleanTitle && song.title.trim().toLowerCase() === cleanTitle) {
        return { isDuplicate: true, matchType: 'title', existingSong: song };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Fetches metadata for YouTube URL via oEmbed API
   */
  static async fetchYouTubeMetadata(urlOrId: string): Promise<YouTubeMetadataResult> {
    const ytId = extractYouTubeId(urlOrId);
    if (!ytId) {
      throw new Error('Could not parse a valid YouTube Video ID from the link provided.');
    }

    const cleanUrl = `https://www.youtube.com/watch?v=${ytId}`;
    const thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

    let title = '';
    let artist = '';

    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          let rawTitle = data.title as string;
          // Strip YouTube video tags like (Official Video), [Live], (Lyrics), etc.
          rawTitle = rawTitle
            .replace(/\s*[\(\[](Official|Live|Lyrics|Video|Audio|HD|4K|Worship|Music Video).*?[\)\]]/gi, '')
            .trim();

          if (rawTitle.includes(' - ')) {
            const parts = rawTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          } else if (rawTitle.includes(' | ')) {
            const parts = rawTitle.split(' | ');
            title = parts[0].trim();
            artist = parts[1].trim();
          } else {
            title = rawTitle;
            artist = data.author_name ? data.author_name.replace(/\s*-\s*Topic$/i, '').trim() : '';
          }
        }
      }
    } catch (e) {
      console.warn('YouTube oEmbed API fetch failed, falling back to basic YouTube ID', e);
    }

    return {
      youtubeId: ytId,
      youtubeUrl: cleanUrl,
      thumbnailUrl,
      title,
      artist
    };
  }

  /**
   * Calculates how many times a song appears in saved worship line-ups
   * within a specific calendar month (Asia/Manila context).
   * Defaults to the current calendar month (e.g., "2026-08").
   */
  static getMonthlyUsageCount(
    songTitle: string,
    schedules: Schedule[],
    targetMonthStr?: string
  ): number {
    const cleanTitle = songTitle.trim().toLowerCase();
    if (!cleanTitle || !schedules || schedules.length === 0) return 0;

    const monthStr = targetMonthStr || getManilaTodayString().substring(0, 7);

    let count = 0;
    for (const sch of schedules) {
      if (!sch.serviceDate) continue;
      const schYM = sch.serviceDate.substring(0, 7);
      if (schYM !== monthStr) continue;

      if (sch.praiseSongs) {
        for (const p of sch.praiseSongs) {
          if (p.trim().toLowerCase() === cleanTitle) {
            count++;
          }
        }
      }
      if (sch.worshipSongs) {
        for (const w of sch.worshipSongs) {
          if (w.trim().toLowerCase() === cleanTitle) {
            count++;
          }
        }
      }
    }

    return count;
  }

  /**
   * Checks whether a song has been used during the target service month (e.g., "2026-08").
   * Applies the First-Come, First-Serve rule:
   * The first line-up that used the song in the calendar month (by service date,
   * then creation timestamp/id) is considered the original usage and MUST NOT be marked as repeated.
   * Only later line-ups receive a repeated-song warning.
   */
  static checkMonthlyUsage(
    songTitle: string,
    targetDateStr: string,
    schedules: Schedule[],
    excludeScheduleId?: string,
    candidateServiceType: string = 'Sunday Service'
  ): MonthlyUsageCheckResult {
    const cleanTitle = songTitle.trim().toLowerCase();
    if (!cleanTitle || !targetDateStr) {
      return { songTitle, timesUsedThisMonth: 0, serviceTypes: [], datesUsed: [], affectedSchedules: [] };
    }

    const targetYearMonth = targetDateStr.substring(0, 7);
    const isCandidateRegular = !isSpecialEvent(candidateServiceType);

    // Filter out the schedule being edited if excludeScheduleId is provided
    const otherSchedules = schedules.filter((s) => s.id !== excludeScheduleId);

    // Find all saved schedules in target month containing this song (ignoring special events if candidate is regular)
    let candidateSchedules = otherSchedules.filter((sch) => {
      if (isCandidateRegular && isSpecialEvent(sch.serviceType)) {
        return false;
      }
      const schYM = sch.serviceDate ? sch.serviceDate.substring(0, 7) : '';
      return schYM === targetYearMonth;
    });

    // Cross-Month Carry-Over Check (First week of month -> check last week of prev month)
    if (isFirstWeekOfMonth(targetDateStr)) {
      const range = getLastWeekOfPreviousMonthRange(targetDateStr);
      const prevWeekSchedules = otherSchedules.filter((sch) => {
        if (isCandidateRegular && isSpecialEvent(sch.serviceType)) return false;
        return sch.serviceDate && sch.serviceDate >= range.startDate && sch.serviceDate <= range.endDate;
      });
      for (const pSch of prevWeekSchedules) {
        if (!candidateSchedules.some((s) => s.id === pSch.id)) {
          candidateSchedules.push(pSch);
        }
      }
    } else if (
      isFirstRegularServiceOfMonth(
        candidateServiceType,
        targetDateStr,
        schedules
      )
    ) {
      const prevRegulars = getLastRegularSchedulesOfPreviousMonth(
        targetYearMonth,
        schedules
      );
      for (const pSch of prevRegulars) {
        if (pSch.id !== excludeScheduleId && !candidateSchedules.some((s) => s.id === pSch.id)) {
          if (!isCandidateRegular || !isSpecialEvent(pSch.serviceType)) {
            candidateSchedules.push(pSch);
          }
        }
      }
    }

    const containingSchedules = candidateSchedules.filter((sch) => {
      const hasPraise = (sch.praiseSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
      const hasWorship = (sch.worshipSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
      return hasPraise || hasWorship;
    });

    // Calculate total times used in existing schedules this month
    const totalUsesInOtherSchedules = containingSchedules.reduce((acc, sch) => {
      const praiseCount = (sch.praiseSongs || []).filter((s) => s.trim().toLowerCase() === cleanTitle).length;
      const worshipCount = (sch.worshipSongs || []).filter((s) => s.trim().toLowerCase() === cleanTitle).length;
      return acc + praiseCount + worshipCount;
    }, 0);

    if (containingSchedules.length === 0) {
      return { songTitle, timesUsedThisMonth: 0, serviceTypes: [], datesUsed: [], affectedSchedules: [] };
    }

    const datesUsed: string[] = [];
    const serviceTypesSet = new Set<string>();
    const affectedSchedules: AffectedScheduleRef[] = [];

    containingSchedules.forEach((sch) => {
      datesUsed.push(sch.serviceDate);
      if (sch.serviceType) serviceTypesSet.add(sch.serviceType);
      affectedSchedules.push({
        id: sch.id,
        serviceDate: sch.serviceDate,
        serviceType: sch.serviceType
      });
    });

    datesUsed.sort().reverse();

    return {
      songTitle,
      timesUsedThisMonth: totalUsesInOtherSchedules,
      lastDateUsed: datesUsed.length > 0 ? datesUsed[0] : undefined,
      serviceTypes: Array.from(serviceTypesSet),
      datesUsed,
      affectedSchedules
    };
  }

  /**
   * Recalculates song usage statistics across all schedules and updates database
   */
  static async syncSongUsageFromSchedules(schedules: Schedule[]): Promise<void> {
    const songs = await this.getSongs();
    let modified = false;

    for (const song of songs) {
      const cleanTitle = song.title.trim().toLowerCase();
      const history: { date: string; serviceType: string; scheduleId?: string }[] = [];

      schedules.forEach((sch) => {
        const inPraise = (sch.praiseSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
        const inWorship = (sch.worshipSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
        if (inPraise || inWorship) {
          history.push({
            date: sch.serviceDate,
            serviceType: sch.serviceType,
            scheduleId: sch.id
          });
        }
      });

      history.sort((a, b) => (a.date < b.date ? 1 : -1)); // Sort descending

      const newTimesUsed = history.length;
      const newLastUsed = history.length > 0 ? history[0].date : undefined;

      if (song.timesUsed !== newTimesUsed || song.lastUsedDate !== newLastUsed) {
        song.timesUsed = newTimesUsed;
        song.lastUsedDate = newLastUsed;
        song.serviceHistory = history;
        modified = true;
      }
    }

    if (modified) {
      localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs));
    }
  }
}
