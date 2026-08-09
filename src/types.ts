import { getManilaTodayString, addDaysToDateString } from './utils/dateUtils';

export type ServiceType = 
  | 'Sunday Service'
  | 'Midweek Prayer Service'
  | 'Youth Service'
  | 'Special Worship Event';

export type DisciplinaryDurationType = 'days' | 'weeks' | 'months' | 'years';

export interface DisciplinaryAction {
  status: 'active' | 'cleared';
  startDate: string; // YYYY-MM-DD
  durationValue: number;
  durationType: DisciplinaryDurationType;
  endDate: string; // YYYY-MM-DD
  reason?: string;
  updatedAt?: string;
}

export interface Member {
  id: string;
  name: string;
  labels: string[];
  disciplinaryAction?: DisciplinaryAction;
}

export function calculateDisciplinaryEndDate(
  startDateStr: string,
  value: number,
  type: DisciplinaryDurationType
): string {
  if (!startDateStr || isNaN(value) || value <= 0) {
    return startDateStr || getManilaTodayString();
  }
  
  if (type === 'days') {
    return addDaysToDateString(startDateStr, value);
  } else if (type === 'weeks') {
    return addDaysToDateString(startDateStr, value * 7);
  }

  const parts = startDateStr.split('-');
  if (parts.length < 3) return startDateStr;
  let year = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let day = parseInt(parts[2], 10);

  if (type === 'months') {
    month += value;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
  } else if (type === 'years') {
    year += value;
  }

  const mStr = String(month).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${year}-${mStr}-${dStr}`;
}

export function isMemberUnderDisciplinary(member: Member, referenceDateStr?: string): boolean {
  if (!member.disciplinaryAction || member.disciplinaryAction.status !== 'active') {
    return false;
  }
  const dateToCheck = referenceDateStr || getManilaTodayString();
  const { startDate, endDate } = member.disciplinaryAction;

  if (startDate && dateToCheck < startDate) {
    return false;
  }
  if (endDate && dateToCheck > endDate) {
    return false;
  }
  return true;
}

export interface AssignedMember {
  memberId: string;
  memberName: string;
}

export interface MinistryAssignment {
  id: string;
  role: string;
  assignedMembers?: AssignedMember[];
  memberId?: string;
  memberName?: string;
  notes?: string;
}

export function getAssignmentMembers(a: MinistryAssignment): AssignedMember[] {
  if (a.assignedMembers && Array.isArray(a.assignedMembers)) {
    return a.assignedMembers;
  }
  if (a.memberId || a.memberName) {
    return [{ memberId: a.memberId || '', memberName: a.memberName || '' }];
  }
  return [];
}

export function formatAssignmentMemberNames(a: MinistryAssignment): string {
  const members = getAssignmentMembers(a);
  if (members.length === 0) return 'N/A';
  const names = members.map(m => m.memberName).filter(Boolean);
  const cleanNames = names.filter(n => n !== 'Unassigned' && n !== '—');
  return cleanNames.length > 0 ? cleanNames.join(', ') : 'N/A';
}

export interface Schedule {
  id: string;
  serviceType: ServiceType;
  serviceDate: string;
  praiseSongs: string[];
  worshipSongs: string[];
  praiseSongKeys?: string[];
  worshipSongKeys?: string[];
  ministryAssignments: MinistryAssignment[];
  notes?: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'scheduler' | 'schedules' | 'members' | 'songs';

export type SongCategory = 'praise' | 'worship' | 'both';

export interface ServiceUsageHistory {
  date: string;
  serviceType: string;
  scheduleId?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  key?: string;
  originalKey?: string;
  bpm?: number;
  timeSignature?: string;
  duration?: string;
  releaseYear?: number | string;
  language: string;
  ccliNumber?: string;
  youtubeUrl?: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  coverArtUrl?: string;
  isrc?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  qobuzUrl?: string;
  tidalUrl?: string;
  geniusUrl?: string;
  dateAdded: string;
  lastUsedDate?: string;
  timesUsed: number;
  serviceHistory: ServiceUsageHistory[];
  notes?: string;
  category: SongCategory;
  labels?: string[];
  themes?: string[];
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'danger' | 'info';
  text: string;
}
