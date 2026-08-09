import { extractYouTubeId } from './songService';

export interface ComprehensiveMetadata {
  title?: string;
  artist?: string;
  album?: string;
  releaseYear?: string;
  duration?: string;
  genre?: string;
  language?: string;
  coverArtUrl?: string;
  thumbnailUrl?: string;
  isrc?: string;
  key?: string; // Manual field only
  originalKey?: string; // Manual field only
  bpm?: number | string; // Manual field only
  timeSignature?: string; // Manual field only
  youtubeMusicUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  qobuzUrl?: string;
  tidalUrl?: string;
  sourcesQueried?: string[];
  sourcesSucceeded?: string[];
}

/**
 * Formats track duration in milliseconds or seconds to "M:SS" format.
 */
function formatDuration(secondsOrMs: number): string {
  if (!secondsOrMs || secondsOrMs <= 0) return '';
  const totalSeconds = secondsOrMs > 10000 ? Math.floor(secondsOrMs / 1000) : Math.floor(secondsOrMs);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * 1. YouTube Music
 */
async function fetchYouTubeMusicMetadata(input: string): Promise<Partial<ComprehensiveMetadata> | null> {
  const ytId = extractYouTubeId(input);
  if (ytId || input.includes('music.youtube.com')) {
    const cleanId = ytId || extractYouTubeId(input);
    if (!cleanId) return null;
    try {
      const ytmUrl = `https://music.youtube.com/watch?v=${cleanId}`;
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(ytmUrl)}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        let title = '';
        let artist = '';
        if (data.title) {
          let rawTitle = (data.title as string)
            .replace(/\s*[\(\[](Official|Live|Lyrics|Video|Audio|HD|4K|Worship|Music Video).*?[\)\]]/gi, '')
            .trim();

          if (rawTitle.includes(' - ')) {
            const parts = rawTitle.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          } else {
            title = rawTitle;
            artist = data.author_name ? data.author_name.replace(/\s*-\s*Topic$/i, '').trim() : '';
          }
        }

        return {
          title,
          artist,
          youtubeMusicUrl: ytmUrl,
          youtubeId: cleanId,
          thumbnailUrl: `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`
        };
      }
    } catch (e) {
      console.warn('YouTube Music fetch failed:', e);
    }
  }
  return null;
}

/**
 * 2. YouTube
 */
async function fetchYouTubeMetadata(input: string): Promise<Partial<ComprehensiveMetadata> | null> {
  const ytId = extractYouTubeId(input);
  if (!ytId) return null;

  const cleanUrl = `https://www.youtube.com/watch?v=${ytId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      let title = '';
      let artist = '';
      if (data.title) {
        let rawTitle = (data.title as string)
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

      return {
        title,
        artist,
        youtubeId: ytId,
        youtubeUrl: cleanUrl,
        thumbnailUrl
      };
    }
  } catch (e) {
    console.warn('YouTube fetch failed:', e);
  }

  return {
    youtubeId: ytId,
    youtubeUrl: cleanUrl,
    thumbnailUrl
  };
}

/**
 * 3. Spotify
 */
async function fetchSpotifyMetadata(queryOrUrl: string): Promise<Partial<ComprehensiveMetadata> | null> {
  if (queryOrUrl.includes('open.spotify.com')) {
    try {
      const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(queryOrUrl)}`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title,
          artist: data.author_name,
          coverArtUrl: data.thumbnail_url,
          spotifyUrl: queryOrUrl
        };
      }
    } catch (e) {
      console.warn('Spotify oEmbed fetch failed:', e);
    }
  }
  return null;
}

/**
 * 4. Apple Music
 */
async function fetchAppleMusicMetadata(query: string): Promise<Partial<ComprehensiveMetadata> | null> {
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const res = await fetch(itunesUrl, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.results && data.results.length > 0) {
      const item = data.results[0];
      const releaseYear = item.releaseDate ? item.releaseDate.substring(0, 4) : '';
      const coverArtUrl = item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '';
      const duration = item.trackTimeMillis ? formatDuration(item.trackTimeMillis) : '';

      return {
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName,
        releaseYear,
        duration,
        genre: item.primaryGenreName,
        coverArtUrl,
        appleMusicUrl: item.trackViewUrl,
        isrc: item.isrc
      };
    }
  } catch (e) {
    console.warn('Apple Music / iTunes API fetch failed:', e);
  }
  return null;
}

/**
 * 5. Qobuz
 */
async function fetchQobuzMetadata(query: string): Promise<Partial<ComprehensiveMetadata> | null> {
  try {
    const qobuzUrl = `https://corsproxy.io/?${encodeURIComponent(`https://www.qobuz.com/api.json/0.2/track/search?query=${encodeURIComponent(query)}&limit=1&app_id=100000000`)}`;
    const res = await fetch(qobuzUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        const item = data.tracks.items[0];
        return {
          title: item.title,
          artist: item.performer?.name || item.album?.artist?.name,
          album: item.album?.title,
          coverArtUrl: item.album?.image?.large,
          qobuzUrl: item.url || `https://www.qobuz.com/track/${item.id}`
        };
      }
    }
  } catch (e) {
    console.warn('Qobuz API fetch failed:', e);
  }
  return null;
}

/**
 * 6. TIDAL
 */
async function fetchTidalMetadata(queryOrUrl: string): Promise<Partial<ComprehensiveMetadata> | null> {
  if (queryOrUrl.includes('tidal.com')) {
    try {
      const oembedUrl = `https://embed.tidal.com/oembed?url=${encodeURIComponent(queryOrUrl)}`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title,
          artist: data.author_name,
          coverArtUrl: data.thumbnail_url,
          tidalUrl: queryOrUrl
        };
      }
    } catch (e) {
      console.warn('TIDAL fetch failed:', e);
    }
  }
  return null;
}

/**
 * Queries Songlink / Odesli API to resolve platform links across the supported sources
 */
async function fetchSonglinkPlatformUrls(urlOrQuery: string): Promise<Partial<ComprehensiveMetadata> | null> {
  try {
    if (!urlOrQuery.startsWith('http')) return null;

    const songlinkUrl = `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(urlOrQuery)}&userCountry=US`;
    const res = await fetch(songlinkUrl, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.linksByPlatform) {
      const links = data.linksByPlatform;
      return {
        youtubeMusicUrl: links.youtubeMusic?.url,
        youtubeUrl: links.youtube?.url,
        spotifyUrl: links.spotify?.url,
        appleMusicUrl: links.appleMusic?.url,
        qobuzUrl: links.qobuz?.url,
        tidalUrl: links.tidal?.url
      };
    }
  } catch (e) {
    console.warn('Songlink API fetch failed:', e);
  }
  return null;
}

/**
 * Retrieves song metadata from allowed sources strictly in priority order:
 * 1. YouTube Music
 * 2. YouTube
 * 3. Spotify
 * 4. Apple Music
 * 5. Qobuz
 * 6. TIDAL
 *
 * Automatic fetching of Original Key, Performed Key, BPM, and Time Signature is completely removed.
 * Those fields remain blank unless entered manually by the user.
 */
export async function fetchMultiSourceMetadata(inputQueryOrUrl: string): Promise<ComprehensiveMetadata> {
  const sourcesQueried: string[] = [];
  const sourcesSucceeded: string[] = [];

  let query = inputQueryOrUrl.trim();
  const isUrl = inputQueryOrUrl.startsWith('http');

  const meta: ComprehensiveMetadata = {
    genre: 'Praise & Worship',
    language: 'English',
    sourcesQueried,
    sourcesSucceeded
  };

  // Helper to merge non-musical metadata fields respecting strict priority order
  const applyMetadataSource = (sourceName: string, sourceMeta: Partial<ComprehensiveMetadata> | null) => {
    sourcesQueried.push(sourceName);
    if (!sourceMeta) return false;

    let hasNewData = false;

    if (!meta.title && sourceMeta.title) { meta.title = sourceMeta.title; hasNewData = true; }
    if (!meta.artist && sourceMeta.artist) { meta.artist = sourceMeta.artist; hasNewData = true; }
    if (!meta.album && sourceMeta.album) { meta.album = sourceMeta.album; hasNewData = true; }
    if (!meta.releaseYear && sourceMeta.releaseYear) { meta.releaseYear = sourceMeta.releaseYear; hasNewData = true; }
    if (!meta.duration && sourceMeta.duration) { meta.duration = sourceMeta.duration; hasNewData = true; }
    if (!meta.genre && sourceMeta.genre) { meta.genre = sourceMeta.genre; hasNewData = true; }
    if (!meta.coverArtUrl && sourceMeta.coverArtUrl) { meta.coverArtUrl = sourceMeta.coverArtUrl; hasNewData = true; }
    if (!meta.thumbnailUrl && sourceMeta.thumbnailUrl) { meta.thumbnailUrl = sourceMeta.thumbnailUrl; hasNewData = true; }
    if (!meta.isrc && sourceMeta.isrc) { meta.isrc = sourceMeta.isrc; hasNewData = true; }

    if (!meta.youtubeMusicUrl && sourceMeta.youtubeMusicUrl) meta.youtubeMusicUrl = sourceMeta.youtubeMusicUrl;
    if (!meta.youtubeUrl && sourceMeta.youtubeUrl) meta.youtubeUrl = sourceMeta.youtubeUrl;
    if (!meta.youtubeId && sourceMeta.youtubeId) meta.youtubeId = sourceMeta.youtubeId;
    if (!meta.spotifyUrl && sourceMeta.spotifyUrl) meta.spotifyUrl = sourceMeta.spotifyUrl;
    if (!meta.appleMusicUrl && sourceMeta.appleMusicUrl) meta.appleMusicUrl = sourceMeta.appleMusicUrl;
    if (!meta.qobuzUrl && sourceMeta.qobuzUrl) meta.qobuzUrl = sourceMeta.qobuzUrl;
    if (!meta.tidalUrl && sourceMeta.tidalUrl) meta.tidalUrl = sourceMeta.tidalUrl;

    if (hasNewData) {
      sourcesSucceeded.push(sourceName);
    }
    return hasNewData;
  };

  const isMetadataComplete = () => Boolean(meta.title && meta.artist && meta.artist !== 'Unknown Artist');

  // 1. YouTube Music
  const ytmResult = await fetchYouTubeMusicMetadata(query);
  applyMetadataSource('YouTube Music', ytmResult);

  if (meta.title) {
    query = `${meta.title} ${meta.artist || ''}`.trim();
  }

  // 2. YouTube
  if (!isMetadataComplete()) {
    const ytResult = await fetchYouTubeMetadata(query);
    applyMetadataSource('YouTube', ytResult);
    if (meta.title) query = `${meta.title} ${meta.artist || ''}`.trim();
  }

  // 3. Spotify
  if (!isMetadataComplete()) {
    const spotifyResult = await fetchSpotifyMetadata(query);
    applyMetadataSource('Spotify', spotifyResult);
    if (meta.title) query = `${meta.title} ${meta.artist || ''}`.trim();
  }

  // 4. Apple Music
  if (!isMetadataComplete() || !meta.album || !meta.releaseYear) {
    const appleResult = await fetchAppleMusicMetadata(query);
    applyMetadataSource('Apple Music', appleResult);
    if (meta.title) query = `${meta.title} ${meta.artist || ''}`.trim();
  }

  // 5. Qobuz
  if (!isMetadataComplete() || !meta.album) {
    const qobuzResult = await fetchQobuzMetadata(query);
    applyMetadataSource('Qobuz', qobuzResult);
  }

  // 6. TIDAL
  if (!isMetadataComplete() || !meta.coverArtUrl) {
    const tidalResult = await fetchTidalMetadata(query);
    applyMetadataSource('TIDAL', tidalResult);
  }

  // Query Songlink for platform direct URLs if input is a URL
  if (isUrl) {
    const songlinkLinks = await fetchSonglinkPlatformUrls(inputQueryOrUrl);
    if (songlinkLinks) {
      applyMetadataSource('Songlink (Platform Links)', songlinkLinks);
    }
  }

  // Ensure thumbnails/cover arts are cross-populated
  if (!meta.thumbnailUrl && meta.coverArtUrl) meta.thumbnailUrl = meta.coverArtUrl;
  if (!meta.coverArtUrl && meta.thumbnailUrl) meta.coverArtUrl = meta.thumbnailUrl;

  if (!meta.title && !meta.youtubeId && sourcesSucceeded.length === 0) {
    throw new Error('Unable to retrieve metadata from available music sources. Please enter the information manually.');
  }

  return meta;
}
