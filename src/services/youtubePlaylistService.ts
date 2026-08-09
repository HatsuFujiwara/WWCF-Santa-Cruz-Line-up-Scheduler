import { extractYouTubeId, SongService } from './songService';
import { Song } from '../types';
import { getManilaTodayString } from '../utils/dateUtils';

export interface PlaylistItem {
  videoId: string;
  youtubeUrl: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string; // e.g. "4:15"
  thumbnailUrl: string;
  playlistPosition: number;
}

export interface YouTubePlaylistPreview {
  playlistId: string;
  playlistName: string;
  playlistThumbnail: string;
  playlistUrl: string;
  items: PlaylistItem[];
  totalSongs: number;
  estimatedTotalDuration: string; // e.g. "22 mins" or "1 hr 15 mins"
}

export interface ImportSummary {
  totalImported: number;
  newlyAdded: number;
  existingFound: number;
  skippedErrors: number;
  existingSongTitles: string[];
  newSongTitles: string[];
}

/**
 * Helper to extract playlist ID from YouTube / YouTube Music URL
 */
export function extractPlaylistId(urlStr: string): string | null {
  if (!urlStr) return null;
  const trimmed = urlStr.trim();

  try {
    // Check list= query param in standard or YouTube Music URL
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const listParam = urlObj.searchParams.get('list');
    if (listParam) return listParam;
  } catch (e) {
    // ignore URL parse error
  }

  // Regex fallback for list= parameter
  const match = trimmed.match(/[?&]list=([^&]+)/);
  if (match && match[1]) {
    return match[1];
  }

  // If user pasted raw playlist ID (typically starting with PL, OLAK, RD, etc.)
  if (/^(PL|OLAK|RD|UU|FL|LL|TL)[a-zA-Z0-9_-]+$/.test(trimmed) || /^[a-zA-Z0-9_-]{12,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Formats seconds to "MM:SS" or "H:MM:SS"
 */
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '3:45';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Parses ISO 8601 duration string (e.g., "PT4M15S" or "PT1H2M3S") into "MM:SS" or "H:MM:SS"
 */
export function parseISO8601Duration(isoDuration: string): string {
  if (!isoDuration) return '3:45';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '3:45';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${secsFormatter(seconds)}`;
  }
  return `${minutes}:${secsFormatter(seconds)}`;
}

function secsFormatter(s: number): string {
  return s < 10 ? `0${s}` : `${s}`;
}

/**
 * Calculates estimated total duration in human readable format
 */
function calculateTotalDuration(items: PlaylistItem[]): string {
  let totalSec = 0;
  items.forEach((item) => {
    if (item.duration) {
      const parts = item.duration.split(':').map(Number);
      if (parts.length === 3) {
        totalSec += parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        totalSec += parts[0] * 60 + parts[1];
      }
    } else {
      totalSec += 225; // default estimate
    }
  });

  const mins = Math.round(totalSec / 60);
  if (mins < 60) {
    return `${mins} mins`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} hr${hours > 1 ? 's' : ''} ${remMins} min${remMins !== 1 ? 's' : ''}`;
}

/**
 * Clean channel name
 */
function channelNameFormatter(channelName?: string): string {
  if (!channelName) return 'Unknown Artist';
  let clean = channelName.replace(/\s*-\s*Topic$/i, '').trim();
  if (clean.toLowerCase() === 'various artists' || clean.toLowerCase() === 'youtube') {
    return 'Worship Team';
  }
  return clean;
}

/**
 * Clean YouTube Title into (Artist, Title)
 */
function parseYouTubeTitle(rawTitle: string, channelName?: string): { title: string; artist: string } {
  let clean = rawTitle
    .replace(/\s*[\(\[](Official|Live|Lyrics|Video|Audio|HD|4K|Worship|Music Video|Visualizer|Lyric Video).*?[\)\]]/gi, '')
    .trim();

  let artist = channelName ? channelNameFormatter(channelName) : 'Unknown Artist';
  let title = clean;

  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    artist = parts[0].trim();
    title = parts.slice(1).join(' - ').trim();
  } else if (clean.includes(' | ')) {
    const parts = clean.split(' | ');
    title = parts[0].trim();
    artist = parts[1].trim();
  }

  return { title, artist };
}

export class YouTubePlaylistService {
  /**
   * Resolve YouTube API key from params, env, or localStorage
   */
  private static getApiKey(customKey?: string): string {
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
    const envKey =
      (import.meta as any).env?.VITE_YOUTUBE_API_KEY ||
      (typeof process !== 'undefined' ? process.env?.VITE_YOUTUBE_API_KEY || process.env?.YOUTUBE_API_KEY : undefined);

    if (
      envKey &&
      typeof envKey === 'string' &&
      envKey.trim() &&
      envKey !== 'MY_YOUTUBE_API_KEY' &&
      envKey !== '""' &&
      envKey !== "''"
    ) {
      return envKey.trim();
    }

    const localKey = localStorage.getItem('YOUTUBE_API_KEY');
    if (localKey && typeof localKey === 'string' && localKey.trim()) {
      return localKey.trim();
    }

    // Default configured YouTube Data API v3 key
    return 'AIzaSyBgN1CgoxgHCZVKU_a_KQuOGY-qSSBpctQ';
  }

  /**
   * Fetches full playlist metadata and list of songs using YouTube Data API v3 or fallback proxies
   */
  static async fetchPlaylistPreview(urlOrId: string, customApiKey?: string): Promise<YouTubePlaylistPreview> {
    console.log('[YouTubePlaylistService] Initiating playlist fetch for input:', urlOrId);

    const playlistId = extractPlaylistId(urlOrId);
    if (!playlistId) {
      console.warn('[YouTubePlaylistService] Failed to extract playlist ID from input:', urlOrId);
      throw new Error(
        'Invalid YouTube or YouTube Music playlist link. Please provide a valid URL containing the "list=" parameter (e.g. https://music.youtube.com/playlist?list=PL...)'
      );
    }

    console.log('[YouTubePlaylistService] Extracted Playlist ID:', playlistId);
    const cleanPlaylistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const apiKey = this.getApiKey(customApiKey);

    if (apiKey) {
      try {
        return await this.fetchViaYouTubeAPI(playlistId, cleanPlaylistUrl, apiKey);
      } catch (err: any) {
        console.warn('[YouTubePlaylistService] YouTube Data API v3 returned error or key is invalid:', err.message || err);
        console.log('[YouTubePlaylistService] Gracefully falling back to alternative fetch strategy...');
      }
    } else {
      console.log('[YouTubePlaylistService] No YouTube API key configured. Attempting fallback service endpoints.');
    }

    // Fallback: public mirror proxy logic or HTML parsing fallback
    try {
      return await this.fetchViaFallbackProxies(playlistId, cleanPlaylistUrl);
    } catch (fallbackErr: any) {
      console.error('[YouTubePlaylistService] Fallback fetch failed:', fallbackErr);
      throw new Error(
        `Unable to fetch playlist "${playlistId}". Please ensure the playlist is Public or Unlisted. If you have an official YouTube Data API v3 key, click "Custom API Key (Optional)" in the modal to enter it.`
      );
    }
  }

  /**
   * Fetches playlist directly via official YouTube Data API v3
   */
  private static async fetchViaYouTubeAPI(
    playlistId: string,
    cleanPlaylistUrl: string,
    apiKey: string
  ): Promise<YouTubePlaylistPreview> {
    console.log(`[YouTubePlaylistService] Requesting playlists.list for playlistId: ${playlistId}`);

    // 1. Fetch Playlist Header Info
    const playlistMetaUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(apiKey)}`;
    const playlistMetaRes = await fetch(playlistMetaUrl);

    if (!playlistMetaRes.ok) {
      const errJson = await playlistMetaRes.json().catch(() => ({}));
      const errorObj = errJson?.error;
      console.error('[YouTubePlaylistService] Playlists API Error:', errorObj);

      if (playlistMetaRes.status === 403 || playlistMetaRes.status === 400) {
        const reason = errorObj?.errors?.[0]?.reason || '';
        if (reason === 'keyInvalid') {
          throw new Error('The YouTube API Key is invalid. Please verify your API key configuration.');
        } else if (reason === 'quotaExceeded') {
          throw new Error('YouTube API daily quota exceeded. Please try again later or configure your own API key.');
        }
      }
      if (playlistMetaRes.status === 404 || !errorObj) {
        throw new Error('Playlist not found. Please verify that the link is correct and set to Public or Unlisted.');
      }
      throw new Error(errorObj?.message || `YouTube API error (status ${playlistMetaRes.status})`);
    }

    const playlistMetaJson = await playlistMetaRes.json();
    if (!playlistMetaJson.items || playlistMetaJson.items.length === 0) {
      console.warn('[YouTubePlaylistService] Playlist metadata items array is empty for ID:', playlistId);
      throw new Error('Playlist not found, deleted, or set to Private. Please ensure the playlist is Public or Unlisted on YouTube.');
    }

    const playlistSnippet = playlistMetaJson.items[0].snippet;
    const playlistName = playlistSnippet?.title || 'YouTube Worship Playlist';
    const playlistThumbnail =
      playlistSnippet?.thumbnails?.high?.url ||
      playlistSnippet?.thumbnails?.medium?.url ||
      playlistSnippet?.thumbnails?.default?.url ||
      '';

    // 2. Fetch all playlist items (handling nextPageToken for > 50 items)
    let pageToken = '';
    const rawItems: {
      videoId: string;
      title: string;
      artist: string;
      thumbnailUrl: string;
      position: number;
    }[] = [];

    let pageCount = 0;
    const MAX_PAGES = 10; // Safety limit (up to 500 items)

    do {
      pageCount++;
      let itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(playlistId)}&maxResults=50&key=${encodeURIComponent(apiKey)}`;
      if (pageToken) {
        itemsUrl += `&pageToken=${encodeURIComponent(pageToken)}`;
      }

      console.log(`[YouTubePlaylistService] Requesting playlistItems.list page ${pageCount} (pageToken: "${pageToken}")`);
      const itemsRes = await fetch(itemsUrl);

      if (!itemsRes.ok) {
        const errJson = await itemsRes.json().catch(() => ({}));
        const errorObj = errJson?.error;
        console.error(`[YouTubePlaylistService] playlistItems page ${pageCount} error:`, errorObj);

        if (itemsRes.status === 403 && errorObj?.errors?.[0]?.reason === 'quotaExceeded') {
          throw new Error('YouTube API daily quota exceeded while retrieving playlist items.');
        }
        break;
      }

      const itemsJson = await itemsRes.json();
      const items = itemsJson?.items || [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const snippet = item.snippet;
        const videoId = item.contentDetails?.videoId || snippet?.resourceId?.videoId;

        if (!videoId) continue;

        // Skip private or deleted videos
        const rawTitle = snippet?.title || '';
        if (rawTitle === 'Private video' || rawTitle === 'Deleted video') {
          console.warn(`[YouTubePlaylistService] Skipping private/deleted video at position ${snippet?.position}`);
          continue;
        }

        const channelTitle = snippet?.videoOwnerChannelTitle || snippet?.channelTitle || '';
        const { title, artist } = parseYouTubeTitle(rawTitle, channelTitle);
        const thumbnail =
          snippet?.thumbnails?.high?.url ||
          snippet?.thumbnails?.medium?.url ||
          snippet?.thumbnails?.default?.url ||
          `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        const position = typeof snippet?.position === 'number' ? snippet.position + 1 : rawItems.length + 1;

        rawItems.push({
          videoId,
          title,
          artist,
          thumbnailUrl: thumbnail,
          position
        });
      }

      pageToken = itemsJson.nextPageToken || '';
    } while (pageToken && pageCount < MAX_PAGES);

    if (rawItems.length === 0) {
      throw new Error('The playlist was found, but contains no public, playable videos.');
    }

    console.log(`[YouTubePlaylistService] Successfully retrieved ${rawItems.length} items across ${pageCount} pages`);

    // 3. Fetch Video Durations & Verified Metadata via videos.list in chunks of 50
    const videoDetailsMap = new Map<string, { duration: string; artist?: string }>();
    const allVideoIds = rawItems.map((item) => item.videoId);

    for (let i = 0; i < allVideoIds.length; i += 50) {
      const chunk = allVideoIds.slice(i, i + 50);
      const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${chunk.join(',')}&key=${encodeURIComponent(apiKey)}`;

      try {
        console.log(`[YouTubePlaylistService] Requesting videos.list for batch of ${chunk.length} videos`);
        const videosRes = await fetch(videosUrl);
        if (videosRes.ok) {
          const videosJson = await videosRes.json();
          const videoItems = videosJson?.items || [];

          for (const v of videoItems) {
            const vId = v.id;
            const isoDuration = v.contentDetails?.duration;
            const parsedDuration = parseISO8601Duration(isoDuration);
            const channelTitle = v.snippet?.channelTitle;

            videoDetailsMap.set(vId, {
              duration: parsedDuration,
              artist: channelTitle ? channelNameFormatter(channelTitle) : undefined
            });
          }
        }
      } catch (err) {
        console.warn('[YouTubePlaylistService] Failed to fetch video details chunk:', err);
      }
    }

    // Assemble final items list
    const playlistItems: PlaylistItem[] = rawItems.map((item) => {
      const details = videoDetailsMap.get(item.videoId);
      return {
        videoId: item.videoId,
        youtubeUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
        title: item.title,
        artist: details?.artist && item.artist === 'Unknown Artist' ? details.artist : item.artist,
        album: playlistName,
        duration: details?.duration || '3:45',
        thumbnailUrl: item.thumbnailUrl,
        playlistPosition: item.position
      };
    });

    const finalThumbnail = playlistThumbnail || playlistItems[0]?.thumbnailUrl || '';

    return {
      playlistId,
      playlistName,
      playlistThumbnail: finalThumbnail,
      playlistUrl: cleanPlaylistUrl,
      items: playlistItems,
      totalSongs: playlistItems.length,
      estimatedTotalDuration: calculateTotalDuration(playlistItems)
    };
  }

  /**
   * Fallback method using public endpoints if API key is not configured
   */
  private static async fetchViaFallbackProxies(
    playlistId: string,
    cleanPlaylistUrl: string
  ): Promise<YouTubePlaylistPreview> {
    console.log('[YouTubePlaylistService] Running fallback mirror endpoints for playlistId:', playlistId);

    const endpoints = [
      `https://pipedapi.kavin.rocks/playlists/${playlistId}`,
      `https://api.piped.private.coffee/playlists/${playlistId}`,
      `https://invidious.nerdvpn.de/api/v1/playlists/${playlistId}`,
      `https://vid.puffyan.us/api/v1/playlists/${playlistId}`
    ];

    let fetchedData: any = null;

    for (const ep of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(ep, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          if (json && (json.relatedStreams || json.videos)) {
            fetchedData = json;
            break;
          }
        }
      } catch (e: any) {
        console.warn(`[YouTubePlaylistService] Endpoint ${ep} failed:`, e.message);
      }
    }

    if (fetchedData) {
      const playlistName = fetchedData.title || fetchedData.playlistName || 'Worship Playlist';
      const playlistThumbnail =
        fetchedData.thumbnailUrl ||
        fetchedData.bannerUrl ||
        (fetchedData.relatedStreams && fetchedData.relatedStreams[0]?.thumbnail) ||
        `https://img.youtube.com/vi/${fetchedData.relatedStreams?.[0]?.url?.split('v=')?.[1] || 'default'}/hqdefault.jpg`;

      const rawVideos = fetchedData.relatedStreams || fetchedData.videos || [];
      const items: PlaylistItem[] = rawVideos.map((v: any, index: number) => {
        let videoId = '';
        if (v.url) {
          const match = v.url.match(/v=([^&]+)/);
          if (match) videoId = match[1];
        }
        if (!videoId && v.videoId) videoId = v.videoId;

        const { title, artist } = parseYouTubeTitle(v.title || 'Untitled Song', v.uploaderName || v.author);
        const durationSec = typeof v.duration === 'number' ? v.duration : parseInt(v.duration || '210', 10);
        const thumbnailUrl = v.thumbnail || v.videoThumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

        return {
          videoId: videoId || `vid_${index}`,
          youtubeUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : cleanPlaylistUrl,
          title,
          artist,
          album: v.album || playlistName,
          duration: formatDuration(durationSec),
          thumbnailUrl,
          playlistPosition: index + 1
        };
      });

      return {
        playlistId,
        playlistName,
        playlistThumbnail,
        playlistUrl: cleanPlaylistUrl,
        items,
        totalSongs: items.length,
        estimatedTotalDuration: calculateTotalDuration(items)
      };
    }

    throw new Error(
      `Unable to fetch playlist details for "${playlistId}". Please ensure the playlist is Public/Unlisted, or configure a YouTube Data API v3 key.`
    );
  }

  /**
   * Save selected items into Song Database with duplicate detection,
   * preserving usage history and metadata as specified.
   */
  static async importPlaylistSongs(
    selectedItems: PlaylistItem[],
    playlistMeta: { playlistId: string; playlistName: string }
  ): Promise<{ summary: ImportSummary; importedSongs: Song[] }> {
    console.log(`[YouTubePlaylistService] Starting import of ${selectedItems.length} songs from playlist "${playlistMeta.playlistName}" (${playlistMeta.playlistId})`);

    const summary: ImportSummary = {
      totalImported: selectedItems.length,
      newlyAdded: 0,
      existingFound: 0,
      skippedErrors: 0,
      existingSongTitles: [],
      newSongTitles: []
    };

    const importedSongs: Song[] = [];
    const dateImported = getManilaTodayString();

    for (let idx = 0; idx < selectedItems.length; idx++) {
      const item = selectedItems[idx];
      // Category assignment rule:
      // Song 1 & 2 (idx 0, 1) -> Praise
      // Song 3, 4, 5+ (idx >= 2) -> Worship
      const assignedCategory: 'praise' | 'worship' = idx < 2 ? 'praise' : 'worship';

      try {
        // Duplicate check against Song Database (checking Video ID, YouTube URL, and Title)
        const dupMatch = await SongService.findDuplicate({
          title: item.title,
          youtubeId: item.videoId,
          youtubeUrl: item.youtubeUrl
        });

        if (dupMatch.isDuplicate && dupMatch.existingSong) {
          // Duplicate found! Update existing song record category and metadata
          const existing = dupMatch.existingSong;
          console.log(`[YouTubePlaylistService] Duplicate detected for "${item.title}" (Match type: ${dupMatch.matchType}). Updating existing record ID: ${existing.id} with category ${assignedCategory}`);

          const updatedSong = await SongService.saveSong({
            ...existing,
            category: assignedCategory,
            artist: existing.artist && existing.artist !== 'Unknown Artist' ? existing.artist : item.artist,
            key: existing.key || '',
            originalKey: existing.originalKey || '',
            thumbnailUrl: existing.thumbnailUrl || item.thumbnailUrl,
            youtubeUrl: existing.youtubeUrl || item.youtubeUrl,
            youtubeId: existing.youtubeId || item.videoId,
            duration: existing.duration || item.duration,
            album: existing.album || item.album || playlistMeta.playlistName,
            notes: existing.notes
              ? `${existing.notes}\nImported from Playlist "${playlistMeta.playlistName}" (Pos #${item.playlistPosition}) on ${dateImported}`
              : `Imported from Playlist "${playlistMeta.playlistName}" (Pos #${item.playlistPosition}) on ${dateImported}`
          });

          summary.existingFound++;
          summary.existingSongTitles.push(existing.title);
          importedSongs.push(updatedSong);
        } else {
          // Save new song into database (without auto-assigning key, BPM, or time signature)
          console.log(`[YouTubePlaylistService] Creating new song record for "${item.title}" by ${item.artist} with category ${assignedCategory}`);
          const newSong = await SongService.saveSong({
            title: item.title,
            artist: item.artist,
            album: item.album || playlistMeta.playlistName,
            genre: 'Praise & Worship',
            key: '',
            originalKey: '',
            duration: item.duration || '3:45',
            youtubeUrl: item.youtubeUrl,
            youtubeId: item.videoId,
            thumbnailUrl: item.thumbnailUrl,
            notes: `Imported from YouTube Playlist "${playlistMeta.playlistName}" (ID: ${playlistMeta.playlistId}, Pos #${item.playlistPosition}) on ${dateImported}`,
            category: assignedCategory,
            labels: ['Playlist Import', playlistMeta.playlistName]
          });

          summary.newlyAdded++;
          summary.newSongTitles.push(newSong.title);
          importedSongs.push(newSong);
        }
      } catch (err) {
        console.error(`[YouTubePlaylistService] Error importing song "${item.title}":`, err);
        summary.skippedErrors++;
      }
    }

    console.log('[YouTubePlaylistService] Import completed. Summary:', summary);
    return { summary, importedSongs };
  }
}

