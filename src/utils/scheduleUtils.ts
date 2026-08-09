import { Schedule, ServiceType } from '../types';
import { getManilaTodayString, getManilaDateParts, addDaysToDateString, getManilaNowISO } from './dateUtils';

export interface RepeatedOccurrence {
  scheduleId: string;
  serviceDate: string;
  serviceType: string;
}

export interface RepeatedSongDetail {
  songTitle: string;
  usageCount: number;
  otherOccurrences: RepeatedOccurrence[];
}

export function getPreviousMonthString(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getLastRegularSchedulesOfPreviousMonth(
  currentMonthStr: string,
  allSchedules: Schedule[]
): Schedule[] {
  const prevMonthStr = getPreviousMonthString(currentMonthStr);

  const prevSchedules = allSchedules.filter(
    (s) => s.serviceDate && s.serviceDate.slice(0, 7) === prevMonthStr
  );

  const prevSundays = prevSchedules
    .filter((s) => s.serviceType === 'Sunday Service')
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  const prevMidweeks = prevSchedules
    .filter((s) => s.serviceType === 'Midweek Prayer Service')
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));

  const result: Schedule[] = [];
  if (prevSundays.length > 0) result.push(prevSundays[0]);
  if (prevMidweeks.length > 0) result.push(prevMidweeks[0]);
  return result;
}

export function isFirstRegularServiceOfMonth(
  targetServiceType: string,
  targetServiceDate: string,
  allSchedules: Schedule[]
): boolean {
  if (
    targetServiceType !== 'Sunday Service' &&
    targetServiceType !== 'Midweek Prayer Service'
  ) {
    return false;
  }

  const targetMonth = targetServiceDate.slice(0, 7);

  const sameTypeSchedules = allSchedules.filter(
    (s) =>
      s.serviceDate &&
      s.serviceDate.slice(0, 7) === targetMonth &&
      s.serviceType === targetServiceType
  );

  if (!sameTypeSchedules.some((s) => s.serviceDate === targetServiceDate)) {
    sameTypeSchedules.push({
      id: 'candidate',
      serviceType: targetServiceType as any,
      serviceDate: targetServiceDate,
      praiseSongs: [],
      worshipSongs: [],
      ministryAssignments: [],
      updatedAt: ''
    });
  }

  sameTypeSchedules.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));

  return sameTypeSchedules[0].serviceDate === targetServiceDate;
}

/**
 * First-Come, First-Serve Repeated Song Detection with Cross-Month Carry-Over.
 */
export function getScheduleRepeatedSongs(
  targetSchedule: Schedule,
  allSchedules: Schedule[]
): RepeatedSongDetail[] {
  if (!targetSchedule.serviceDate) return [];
  const targetMonth = targetSchedule.serviceDate.slice(0, 7); // "YYYY-MM"

  // Collect all songs in target schedule
  const targetSongs = [
    ...(targetSchedule.praiseSongs || []),
    ...(targetSchedule.worshipSongs || []),
  ]
    .map((s) => s.trim())
    .filter(Boolean);

  if (targetSongs.length === 0) return [];

  // Deduplicate target songs by lowercase key, preserving original casing
  const songTitleMap = new Map<string, string>();
  for (const song of targetSongs) {
    const key = song.toLowerCase();
    if (!songTitleMap.has(key)) {
      songTitleMap.set(key, song);
    }
  }

  // Get all saved schedules in the same month that have a serviceDate
  const monthSchedules = allSchedules.filter(
    (s) => s.serviceDate && s.serviceDate.slice(0, 7) === targetMonth
  );

  // Check if targetSchedule is the first regular service of its month (Sunday or Midweek)
  let extraCrossMonthSchedules: Schedule[] = [];
  if (
    isFirstRegularServiceOfMonth(
      targetSchedule.serviceType,
      targetSchedule.serviceDate,
      allSchedules
    )
  ) {
    extraCrossMonthSchedules = getLastRegularSchedulesOfPreviousMonth(
      targetMonth,
      allSchedules
    );
  }

  // Combine monthSchedules with extraCrossMonthSchedules
  const fullListToEvaluate = monthSchedules.some((s) => s.id === targetSchedule.id)
    ? [...monthSchedules]
    : [...monthSchedules, targetSchedule];

  for (const extraSch of extraCrossMonthSchedules) {
    if (!fullListToEvaluate.some((s) => s.id === extraSch.id)) {
      fullListToEvaluate.push(extraSch);
    }
  }

  const repeatedDetails: RepeatedSongDetail[] = [];

  for (const [lowerKey, originalTitle] of songTitleMap.entries()) {
    // Find all schedules in evaluation list containing this song
    const containingSchedules = fullListToEvaluate.filter((s) => {
      const songs = [
        ...(s.praiseSongs || []),
        ...(s.worshipSongs || []),
      ].map((song) => song.trim().toLowerCase());
      return songs.includes(lowerKey);
    });

    if (containingSchedules.length <= 1) {
      continue;
    }

    // Sort containing schedules chronologically (First-Come, First-Serve):
    // 1) Scheduled service date
    // 2) Creation / update timestamp or ID (only if two line-ups share the same scheduled date)
    containingSchedules.sort((a, b) => {
      if (a.serviceDate !== b.serviceDate) {
        return a.serviceDate.localeCompare(b.serviceDate);
      }
      const timeA = a.updatedAt || a.id || '';
      const timeB = b.updatedAt || b.id || '';
      return timeA.localeCompare(timeB);
    });

    // If targetSchedule is the FIRST occurrence, it's the original usage -> NO warning
    const firstSchedule = containingSchedules[0];
    if (firstSchedule.id === targetSchedule.id) {
      continue;
    }

    // Target schedule is a later occurrence -> mark as repeated
    const otherOccurrences: RepeatedOccurrence[] = containingSchedules
      .filter((s) => s.id !== targetSchedule.id)
      .map((s) => ({
        scheduleId: s.id,
        serviceDate: s.serviceDate,
        serviceType: s.serviceType,
      }));

    repeatedDetails.push({
      songTitle: originalTitle,
      usageCount: otherOccurrences.length,
      otherOccurrences,
    });
  }

  return repeatedDetails;
}

/**
 * Finds the earliest Empty Line-up for a specific service type.
 * Prioritizes upcoming dates (>= today), sorted ascending by date.
 */
export function getEarliestEmptySchedule(
  serviceType: ServiceType,
  schedules: Schedule[],
  referenceDateStr?: string
): Schedule | null {
  const todayStr = referenceDateStr || getManilaTodayString();

  const emptySchedules = schedules.filter(
    (s) => s.serviceType === serviceType && isScheduleEmpty(s)
  );

  if (emptySchedules.length === 0) return null;

  // Filter for upcoming or today
  const upcomingEmpty = emptySchedules.filter((s) => s.serviceDate >= todayStr);

  if (upcomingEmpty.length > 0) {
    upcomingEmpty.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
    return upcomingEmpty[0];
  }

  // Fallback to any empty schedule sorted ascending
  emptySchedules.sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  return emptySchedules[0];
}

/**
 * Calculates the next available date for a specific service type,
 * reusing the earliest Empty Line-up if available,
 * or skipping dates that already have a saved schedule.
 */
export function getNextAvailableServiceDate(
  serviceType: ServiceType,
  schedules: Schedule[],
  referenceDateStr?: string
): string {
  const earliestEmpty = getEarliestEmptySchedule(serviceType, schedules, referenceDateStr);
  if (earliestEmpty) {
    return earliestEmpty.serviceDate;
  }

  const todayStr = referenceDateStr || getManilaTodayString();
  const { dayOfWeek } = getManilaDateParts(todayStr);

  let targetDay = 0; // Default to Sunday (0)
  if (serviceType === 'Midweek Prayer Service') {
    targetDay = 3; // Wednesday (3)
  } else if (serviceType === 'Sunday Service') {
    targetDay = 0; // Sunday (0)
  } else {
    targetDay = dayOfWeek;
  }

  // Calculate days to next target day of week
  let diff = (targetDay - dayOfWeek + 7) % 7;
  let candidateStr = addDaysToDateString(todayStr, diff);

  // Skip dates that already have a non-empty schedule
  while (
    schedules.some(
      (s) => s.serviceType === serviceType && s.serviceDate === candidateStr && !isScheduleEmpty(s)
    )
  ) {
    candidateStr = addDaysToDateString(candidateStr, 7);
  }

  return candidateStr;
}

/**
 * Automatically chooses the next service type and date that still needs a schedule,
 * prioritizing existing Empty Line-ups.
 */
export function getSmartInitialServiceDetails(
  schedules: Schedule[],
  referenceDateStr?: string
): { serviceType: ServiceType; serviceDate: string; existingSchedule?: Schedule } {
  const todayStr = referenceDateStr || getManilaTodayString();

  const emptySunday = getEarliestEmptySchedule('Sunday Service', schedules, todayStr);
  const emptyMidweek = getEarliestEmptySchedule('Midweek Prayer Service', schedules, todayStr);

  if (emptySunday && emptyMidweek) {
    if (emptyMidweek.serviceDate < emptySunday.serviceDate) {
      return {
        serviceType: 'Midweek Prayer Service',
        serviceDate: emptyMidweek.serviceDate,
        existingSchedule: emptyMidweek
      };
    }
    return {
      serviceType: 'Sunday Service',
      serviceDate: emptySunday.serviceDate,
      existingSchedule: emptySunday
    };
  }

  if (emptyMidweek) {
    return {
      serviceType: 'Midweek Prayer Service',
      serviceDate: emptyMidweek.serviceDate,
      existingSchedule: emptyMidweek
    };
  }

  if (emptySunday) {
    return {
      serviceType: 'Sunday Service',
      serviceDate: emptySunday.serviceDate,
      existingSchedule: emptySunday
    };
  }

  const nextSunday = getNextAvailableServiceDate('Sunday Service', schedules, todayStr);
  const nextMidweek = getNextAvailableServiceDate('Midweek Prayer Service', schedules, todayStr);

  if (nextMidweek < nextSunday) {
    return {
      serviceType: 'Midweek Prayer Service',
      serviceDate: nextMidweek
    };
  }

  return {
    serviceType: 'Sunday Service',
    serviceDate: nextSunday
  };
}

/**
 * Checks whether a schedule contains 0 songs.
 */
export function isScheduleEmpty(schedule: Schedule): boolean {
  const praiseCount = (schedule.praiseSongs || []).filter((s) => Boolean(s.trim())).length;
  const worshipCount = (schedule.worshipSongs || []).filter((s) => Boolean(s.trim())).length;
  return praiseCount + worshipCount === 0;
}

/**
 * Ensures empty placeholder line-ups exist for all Sundays and Wednesdays
 * in the given month (YYYY-MM).
 * Uses Asia/Manila (UTC+8) for all date calculations.
 */
export function ensureMonthlyPlaceholders(
  yearMonthStr: string,
  existingSchedules: Schedule[]
): Schedule[] {
  if (!yearMonthStr || !/^\d{4}-\d{2}$/.test(yearMonthStr)) {
    return existingSchedules;
  }

  const [yearStr, monthStr] = yearMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return existingSchedules;
  }

  // Days in target month using Date.UTC
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const newPlaceholders: Schedule[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

    // Day of week: 0 = Sunday, 3 = Wednesday
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    let serviceTypeToCreate: ServiceType | null = null;
    if (dayOfWeek === 0) {
      serviceTypeToCreate = 'Sunday Service';
    } else if (dayOfWeek === 3) {
      serviceTypeToCreate = 'Midweek Prayer Service';
    }

    if (serviceTypeToCreate) {
      // Check if a schedule for this serviceType and date ALREADY exists
      const exists = existingSchedules.some(
        (s) => s.serviceType === serviceTypeToCreate && s.serviceDate === dateStr
      );

      if (!exists) {
        newPlaceholders.push({
          id: `placeholder_${serviceTypeToCreate === 'Sunday Service' ? 'sun' : 'wed'}_${dateStr}`,
          serviceType: serviceTypeToCreate,
          serviceDate: dateStr,
          praiseSongs: [],
          worshipSongs: [],
          praiseSongKeys: [],
          worshipSongKeys: [],
          ministryAssignments: [],
          notes: '',
          updatedAt: getManilaNowISO()
        });
      }
    }
  }

  if (newPlaceholders.length === 0) {
    return existingSchedules;
  }

  // Append new placeholders and sort chronologically descending by date
  const combined = [...existingSchedules, ...newPlaceholders];
  combined.sort((a, b) => (b.serviceDate || '').localeCompare(a.serviceDate || ''));
  return combined;
}
