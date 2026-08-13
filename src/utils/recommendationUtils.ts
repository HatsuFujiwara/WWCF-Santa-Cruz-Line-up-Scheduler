import { Song, Schedule } from '../types';
import { formatDateDisplayManila, getManilaTodayString } from './dateUtils';

export interface RecommendedSong {
  song: Song;
  score: number;
  priorityGroup: 'new' | 'once' | 'least_played';
  badges: string[];
  reasons: string[];
  isSeasonal: boolean;
  seasonalSeason?: string;
  lastPlayedFormatted?: string;
  timesUsed: number;
  lastUsedDate?: string;
}

export type CategoryFilter = 'all' | 'praise' | 'worship';
export type StatusFilter = 'all' | 'new' | 'once' | 'least_played' | 'seasonal';

/**
 * Determines whether a service type is considered a Special Event
 * (e.g. Youth Fellowship, Special Worship Event, etc.) vs a Regular Service (Sunday/Midweek).
 */
export function isSpecialEvent(serviceType?: string): boolean {
  if (!serviceType) return false;
  const clean = serviceType.trim();
  return clean !== 'Sunday Service' && clean !== 'Midweek Prayer Service';
}

/**
 * Returns true if the target date is in the first 7 calendar days of the month (Day 1..7).
 */
export function isFirstWeekOfMonth(dateStr: string): boolean {
  if (!dateStr || dateStr.length < 10) return false;
  const day = parseInt(dateStr.slice(8, 10), 10);
  return !isNaN(day) && day >= 1 && day <= 7;
}

/**
 * Calculates the start and end date strings (YYYY-MM-DD) for the final 7 calendar days of the previous month.
 */
export function getLastWeekOfPreviousMonthRange(dateStr: string): { startDate: string; endDate: string } {
  const [yStr, mStr] = dateStr.split('-');
  let year = parseInt(yStr, 10);
  let month = parseInt(mStr, 10);
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const startDay = daysInPrevMonth - 6;
  const mPadded = String(month).padStart(2, '0');
  const startDayPadded = String(startDay).padStart(2, '0');
  const endDayPadded = String(daysInPrevMonth).padStart(2, '0');
  return {
    startDate: `${year}-${mPadded}-${startDayPadded}`,
    endDate: `${year}-${mPadded}-${endDayPadded}`
  };
}

/**
 * Checks if a song is prohibited from recommendations based on:
 * 1) Played in the current month (same calendar YYYY-MM).
 * 2) Played in the last 7 calendar days of the previous month (if current date is day 1..7 of new month).
 * Special events (e.g. Youth Fellowship) do NOT restrict recommendations for regular services (Sunday/Midweek).
 */
export function isSongProhibitedByDateRules(
  songTitle: string,
  referenceDateStr: string,
  schedules: Schedule[],
  targetServiceType?: string
): boolean {
  const cleanTitle = songTitle.trim().toLowerCase();
  if (!cleanTitle || !referenceDateStr || schedules.length === 0) return false;

  const refYM = referenceDateStr.slice(0, 7);
  const inFirstWeek = isFirstWeekOfMonth(referenceDateStr);
  const prevWeekRange = inFirstWeek ? getLastWeekOfPreviousMonthRange(referenceDateStr) : null;
  const isTargetRegular = !isSpecialEvent(targetServiceType);

  for (const sch of schedules) {
    if (!sch.serviceDate) continue;

    // Check if sch contains this song
    const inPraise = (sch.praiseSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
    const inWorship = (sch.worshipSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
    if (!inPraise && !inWorship) continue;

    // Special event exception: If recommending for regular service, ignore special events
    if (isTargetRegular && isSpecialEvent(sch.serviceType)) {
      continue;
    }

    // Rule 1: Current Month Rule (played during same calendar month)
    const schYM = sch.serviceDate.slice(0, 7);
    if (schYM === refYM) {
      return true;
    }

    // Rule 2: Month Boundary Rule (played during last 7 days of prev month when in first 7 days of new month)
    if (inFirstWeek && prevWeekRange) {
      if (sch.serviceDate >= prevWeekRange.startDate && sch.serviceDate <= prevWeekRange.endDate) {
        return true;
      }
    }
  }

  return false;
}

export const COMMON_THEMES = [
  'Christmas',
  'Easter',
  'Resurrection',
  'Cross',
  'Holy Spirit',
  'Thanksgiving',
  'Worship',
  'Praise',
  'Communion',
  'Salvation',
  'Faith',
  'Hope',
  'Love',
  'Revival',
  'Missions',
  'Grace',
  'Healing',
  'Advent',
  'Nativity',
  'Emmanuel',
  'Noel',
  'Victory',
  'Gratitude',
  'Pentecost',
  'Fire'
];

export const MONTHLY_SEASONAL_THEMES: Record<number, { seasonName: string; icon: string; themes: string[] }> = {
  11: {
    seasonName: 'Christmas',
    icon: '🎄',
    themes: ['christmas', 'advent', 'nativity', 'emmanuel', 'noel', 'birth of christ']
  },
  2: {
    seasonName: 'Easter',
    icon: '✝️',
    themes: ['resurrection', 'cross', 'victory', 'easter', 'calvary', 'blood', 'communion', 'thanksgiving']
  },
  3: {
    seasonName: 'Easter',
    icon: '✝️',
    themes: ['resurrection', 'cross', 'victory', 'easter', 'calvary', 'blood', 'communion', 'thanksgiving']
  },
  10: {
    seasonName: 'Thanksgiving',
    icon: '🦃',
    themes: ['thanksgiving', 'gratitude', 'praise']
  },
  4: {
    seasonName: 'Pentecost',
    icon: '🔥',
    themes: ['holy spirit', 'pentecost', 'fire', 'revival']
  },
  5: {
    seasonName: 'Pentecost',
    icon: '🔥',
    themes: ['holy spirit', 'pentecost', 'fire', 'revival']
  }
};

/**
 * Calculates song usage directly from saved schedules for max accuracy.
 */
function getSongUsageStats(song: Song, schedules: Schedule[]) {
  const cleanTitle = song.title.trim().toLowerCase();
  let count = 0;
  let lastDate = song.lastUsedDate || '';

  schedules.forEach((sch) => {
    const praise = (sch.praiseSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
    const worship = (sch.worshipSongs || []).some((s) => s.trim().toLowerCase() === cleanTitle);
    if (praise || worship) {
      count++;
      if (!lastDate || sch.serviceDate > lastDate) {
        lastDate = sch.serviceDate;
      }
    }
  });

  return { timesUsed: count, lastUsedDate: lastDate };
}

/**
 * Generates smart song recommendations based on priority rules:
 * Priority 1 — Newly Added Songs (Never played)
 * Priority 2 — Played Only Once (Not played again in subsequent months)
 * Priority 3 — Least Played Songs
 * Priority 4 — Least Recently Played (Longest time since last played)
 * Seasonal Boost — Boosts songs matching the current month's themes (Christmas in Dec, Easter in Mar/Apr, etc.)
 */
export function getSmartSongRecommendations(
  allSongs: Song[],
  schedules: Schedule[],
  options?: {
    categoryFilter?: CategoryFilter;
    statusFilter?: StatusFilter;
    themeFilter?: string;
    searchQuery?: string;
    referenceDate?: Date | string;
    targetServiceType?: string;
  }
): RecommendedSong[] {
  let refDateStr = getManilaTodayString();
  let refDate = new Date();

  if (options?.referenceDate) {
    if (typeof options.referenceDate === 'string') {
      refDateStr = options.referenceDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(refDateStr)) {
        const [y, m, d] = refDateStr.split('-').map(Number);
        refDate = new Date(y, m - 1, d);
      }
    } else {
      refDate = options.referenceDate;
      const y = refDate.getFullYear();
      const m = String(refDate.getMonth() + 1).padStart(2, '0');
      const d = String(refDate.getDate()).padStart(2, '0');
      refDateStr = `${y}-${m}-${d}`;
    }
  }

  const currentMonthIdx = refDate.getMonth(); // 0 - 11
  const seasonalConfig = MONTHLY_SEASONAL_THEMES[currentMonthIdx];

  const results: RecommendedSong[] = [];

  for (const song of allSongs) {
    // Exclude songs prohibited by the new date-based rules BEFORE applying recommendation ranking
    if (isSongProhibitedByDateRules(song.title, refDateStr, schedules, options?.targetServiceType)) {
      continue;
    }

    const stats = getSongUsageStats(song, schedules);
    const timesUsed = stats.timesUsed;
    const lastUsedDate = stats.lastUsedDate;

    // Check themes
    const songThemes = (song.themes || song.labels || []).map((t) => t.trim().toLowerCase());
    
    // Check Seasonal Match
    let isSeasonal = false;
    let seasonalSeason = '';
    let seasonalIcon = '⭐';

    if (seasonalConfig) {
      const matchesSeasonalTheme = seasonalConfig.themes.some((st) =>
        songThemes.some((t) => t.includes(st) || st.includes(t)) ||
        song.genre?.toLowerCase().includes(st) ||
        song.title.toLowerCase().includes(st)
      );

      if (matchesSeasonalTheme) {
        isSeasonal = true;
        seasonalSeason = seasonalConfig.seasonName;
        seasonalIcon = seasonalConfig.icon;
      }
    }

    // Determine priority group & base score
    let priorityGroup: 'new' | 'once' | 'least_played';
    let baseScore = 0;
    const badges: string[] = [];
    const reasons: string[] = [];

    // Calculate months since last played (for priority 4 tie-breaker)
    let monthsSinceLastPlayed = 999;
    let lastPlayedFormatted = '';
    if (lastUsedDate) {
      const lastDate = new Date(lastUsedDate);
      const yearDiff = refDate.getFullYear() - lastDate.getFullYear();
      const monthDiff = refDate.getMonth() - lastDate.getMonth();
      monthsSinceLastPlayed = Math.max(0, yearDiff * 12 + monthDiff);
      lastPlayedFormatted = formatDateDisplayManila(lastUsedDate, { month: 'short', year: 'numeric' });
    }

    if (timesUsed === 0) {
      priorityGroup = 'new';
      baseScore = 10000;
      badges.push('✨ Newly Added');
      badges.push('⭐ Never Played');
      reasons.push('Newly added to database and never played in any saved lineup');
    } else if (timesUsed === 1) {
      priorityGroup = 'once';
      baseScore = 5000 + Math.min(monthsSinceLastPlayed * 50, 2000);
      badges.push('🔄 Played Once');
      if (lastPlayedFormatted) {
        badges.push(`Last Played: ${lastPlayedFormatted}`);
      }
      reasons.push(`Played only once (${lastPlayedFormatted || 'past lineup'}) and not used since`);
    } else {
      priorityGroup = 'least_played';
      baseScore = 2000 - timesUsed * 100 + Math.min(monthsSinceLastPlayed * 30, 1500);
      badges.push('🎵 Least Played');
      badges.push(`Played ${timesUsed}x`);
      if (lastPlayedFormatted) {
        badges.push(`Last Played: ${lastPlayedFormatted}`);
      }
      reasons.push(`Used ${timesUsed} times across saved lineups`);
    }

    // Seasonal boost score (+8,000 points)
    let finalScore = baseScore;
    if (isSeasonal) {
      finalScore += 8000;
      badges.unshift(`${seasonalIcon} ${seasonalSeason} Recommendation`);
      reasons.unshift(`Matches current seasonal theme (${seasonalSeason})`);
    }

    // Include song's themes in badges if present
    if (song.themes && song.themes.length > 0) {
      song.themes.forEach((t) => {
        if (!badges.includes(`🏷️ ${t}`)) {
          badges.push(`🏷️ ${t}`);
        }
      });
    }

    results.push({
      song,
      score: finalScore,
      priorityGroup,
      badges,
      reasons,
      isSeasonal,
      seasonalSeason,
      lastPlayedFormatted,
      timesUsed,
      lastUsedDate
    });
  }

  // Filter recommendations
  let filtered = results;

  // Category filter
  if (options?.categoryFilter && options.categoryFilter !== 'all') {
    const targetCat = options.categoryFilter;
    filtered = filtered.filter(
      (r) => r.song.category === targetCat || r.song.category === 'both'
    );
  }

  // Status filter
  if (options?.statusFilter && options.statusFilter !== 'all') {
    const status = options.statusFilter;
    if (status === 'new') {
      filtered = filtered.filter((r) => r.priorityGroup === 'new');
    } else if (status === 'once') {
      filtered = filtered.filter((r) => r.priorityGroup === 'once');
    } else if (status === 'least_played') {
      filtered = filtered.filter((r) => r.priorityGroup === 'least_played');
    } else if (status === 'seasonal') {
      filtered = filtered.filter((r) => r.isSeasonal);
    }
  }

  // Theme filter
  if (options?.themeFilter && options.themeFilter !== 'all') {
    const targetTheme = options.themeFilter.toLowerCase();
    filtered = filtered.filter((r) => {
      const themes = (r.song.themes || r.song.labels || []).map((t) => t.toLowerCase());
      return themes.some((t) => t.includes(targetTheme));
    });
  }

  // Search query filter
  if (options?.searchQuery) {
    const query = options.searchQuery.trim().toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.song.title.toLowerCase().includes(query) ||
        r.song.artist.toLowerCase().includes(query) ||
        (r.song.themes || []).some((t) => t.toLowerCase().includes(query))
    );
  }

  // Sort by finalScore descending, then dateAdded descending, then title ascending
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const dateA = a.song.dateAdded || '';
    const dateB = b.song.dateAdded || '';
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return a.song.title.localeCompare(b.song.title);
  });

  return filtered;
}
