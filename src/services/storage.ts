import { Member, Schedule } from '../types';
import { DEFAULT_LABELS, DEFAULT_MEMBERS, DEFAULT_SCHEDULES } from '../data/seedData';
import { dataRepository } from './data';
import { sortTags } from '../utils/tagUtils';

const STORAGE_KEYS = {
  MEMBERS: 'wwcf_members_v1',
  LABELS: 'wwcf_labels_v1',
  SCHEDULES: 'wwcf_schedules_v1',
  DARK_MODE: 'wwcf_dark_mode_v1',
  DRAFT: 'wwcf_draft_schedule_v1'
};

const DEMO_MEMBER_IDS = new Set(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']);
const DEMO_MEMBER_NAMES = new Set([
  'pastor david santos',
  'sarah santos',
  'mark cruz',
  'john reyes',
  'gabriel flores',
  'daniel lim',
  'hannah gomez',
  'micah tan'
]);

export function sanitizeMembers(members: Member[]): Member[] {
  const nonDemoMembers = (members || []).filter(
    (m) => !DEMO_MEMBER_IDS.has(m.id) && !DEMO_MEMBER_NAMES.has((m.name || '').trim().toLowerCase())
  );

  return nonDemoMembers.map((m) => {
    const updatedLabels = (m.labels || [])
      .map((lbl) => {
        if (lbl === 'Multimedia') return 'Lyricist';
        if (lbl === 'Song Lead') return 'Song Leader';
        return lbl;
      })
      .filter((lbl) => lbl !== 'Youth' && lbl !== 'Adult');
    return {
      ...m,
      labels: sortTags(updatedLabels)
    };
  });
}

export function sanitizeLabels(labelsList: string[]): string[] {
  const mapped = (labelsList || [])
    .map((lbl) => {
      if (lbl === 'Multimedia') return 'Lyricist';
      if (lbl === 'Song Lead') return 'Song Leader';
      return lbl;
    })
    .filter((lbl) => lbl !== 'Youth' && lbl !== 'Adult');
  DEFAULT_LABELS.forEach((defLabel) => {
    if (!mapped.includes(defLabel)) {
      mapped.push(defLabel);
    }
  });
  return sortTags(mapped);
}

export function sanitizeSchedules(schedules: Schedule[]): Schedule[] {
  const nonDemoSchedules = (schedules || []).filter((sch) => sch.id !== 'sch_sample_1');

  return nonDemoSchedules.map((sch) => {
    const updatedAssignments = (sch.ministryAssignments || []).map((assignment) => {
      let role = assignment.role;
      if (role === 'Song Lead') role = 'Song Leader';
      if (role === 'Multimedia') role = 'Lyricist';

      const filteredAssigned = (assignment.assignedMembers || []).filter(
        (am) =>
          !DEMO_MEMBER_IDS.has(am.memberId) &&
          !DEMO_MEMBER_NAMES.has((am.memberName || '').trim().toLowerCase())
      );

      return {
        ...assignment,
        role,
        assignedMembers: filteredAssigned
      };
    });
    return {
      ...sch,
      ministryAssignments: updatedAssignments
    };
  });
}

/**
 * StorageService Facade.
 * Bridges application requests to the active Data Repository (LocalStorage, Firebase, or Supabase).
 */
export class StorageService {
  // Sync fallback methods for immediate UI initializations
  static getMembersSync(): Member[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      const raw: Member[] = data ? JSON.parse(data) : DEFAULT_MEMBERS;
      const sanitized = sanitizeMembers(raw);
      if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
        try {
          localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(sanitized));
        } catch {}
      }
      return sanitized;
    } catch {
      return sanitizeMembers(DEFAULT_MEMBERS);
    }
  }

  static getMembers(): Member[] {
    return this.getMembersSync();
  }

  static async getMembersAsync(): Promise<Member[]> {
    const members = await dataRepository.getMembers();
    return sanitizeMembers(members);
  }

  static saveMembers(members: Member[]): void {
    try {
      const sanitized = sanitizeMembers(members);
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(sanitized));
      dataRepository.saveMembers(sanitized);
    } catch (e) {
      console.error('Failed to save members', e);
    }
  }

  static getLabelsSync(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LABELS);
      const raw: string[] = data ? JSON.parse(data) : DEFAULT_LABELS;
      const sanitized = sanitizeLabels(raw);
      if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
        try {
          localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(sanitized));
        } catch {}
      }
      return sanitized;
    } catch {
      return sanitizeLabels(DEFAULT_LABELS);
    }
  }

  static getLabels(): string[] {
    return this.getLabelsSync();
  }

  static async getLabelsAsync(): Promise<string[]> {
    const labels = await dataRepository.getLabels();
    return sanitizeLabels(labels);
  }

  static saveLabels(labels: string[]): void {
    try {
      const sanitized = sanitizeLabels(labels);
      localStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(sanitized));
      dataRepository.saveLabels(sanitized);
    } catch (e) {
      console.error('Failed to save labels', e);
    }
  }

  static getSchedulesSync(): Schedule[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      const raw: Schedule[] = data ? JSON.parse(data) : DEFAULT_SCHEDULES;
      const sanitized = sanitizeSchedules(raw);
      if (JSON.stringify(raw) !== JSON.stringify(sanitized)) {
        try {
          localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(sanitized));
        } catch {}
      }
      return sanitized;
    } catch {
      return sanitizeSchedules(DEFAULT_SCHEDULES);
    }
  }

  static getSchedules(): Schedule[] {
    return this.getSchedulesSync();
  }

  static async getSchedulesAsync(): Promise<Schedule[]> {
    const schedules = await dataRepository.getSchedules();
    return sanitizeSchedules(schedules);
  }

  static saveSchedules(schedules: Schedule[]): void {
    try {
      const sanitized = sanitizeSchedules(schedules);
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(sanitized));
      dataRepository.saveSchedules(sanitized);
    } catch (e) {
      console.error('Failed to save schedules', e);
    }
  }

  static getDarkModeSync(): boolean {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
      return data ? JSON.parse(data) : false;
    } catch {
      return false;
    }
  }

  static getDarkMode(): boolean {
    return this.getDarkModeSync();
  }

  static saveDarkMode(isDark: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDark));
      dataRepository.saveDarkMode(isDark);
    } catch (e) {
      console.error('Failed to save dark mode setting', e);
    }
  }

  static getDraftScheduleSync(): Partial<Schedule> | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRAFT);
      if (!data) return null;
      const draft: Partial<Schedule> = JSON.parse(data);
      if (draft.ministryAssignments) {
        draft.ministryAssignments = (draft.ministryAssignments || []).map((a) => {
          let role = a.role;
          if (role === 'Song Lead') role = 'Song Leader';
          if (role === 'Multimedia') role = 'Lyricist';
          return { ...a, role };
        });
      }
      return draft;
    } catch {
      return null;
    }
  }

  static getDraftSchedule(): Partial<Schedule> | null {
    return this.getDraftScheduleSync();
  }

  static saveDraftSchedule(draft: Partial<Schedule> | null): void {
    try {
      if (!draft) {
        localStorage.removeItem(STORAGE_KEYS.DRAFT);
      } else {
        localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
      }
      dataRepository.saveDraftSchedule(draft);
    } catch (e) {
      console.error('Failed to save draft schedule', e);
    }
  }
}
