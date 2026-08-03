/**
 * Full-data backup export/import: profile (localStorage) + all Dexie tables.
 * Kept separate from BackupRestoreSection.tsx so the format can be unit tested
 * independently of the file-picker/confirm-dialog UI.
 */
import { db, ExerciseNote, StrengthLevelSnapshot } from '../db/db';
import { Workout, WorkoutHistoryEntry } from '../types/workout';
import { UserProfile } from '../types/user';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile';

export const BACKUP_VERSION = '1.1';
const LAST_BACKUP_KEY = 'fitness-tracker-last-backup-date';

export interface BackupData {
  version: string;
  exportDate: number;
  userProfile: UserProfile;
  workouts: Workout[];
  history: WorkoutHistoryEntry[];
  // Absent on backups made before v1.1; treated as "nothing to restore" on import.
  exerciseNotes?: ExerciseNote[];
  strengthHistory?: StrengthLevelSnapshot[];
}

export async function buildBackupData(): Promise<BackupData> {
  const userProfile = loadUserProfile();
  if (!userProfile) {
    throw new Error('No user profile found to back up');
  }

  const [workouts, history, exerciseNotes, strengthHistory] = await Promise.all([
    db.workouts.toArray(),
    db.history.toArray(),
    db.exerciseNotes.toArray(),
    db.strengthHistory.toArray(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportDate: Date.now(),
    userProfile,
    workouts,
    history,
    exerciseNotes,
    strengthHistory,
  };
}

export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Record<string, unknown>;

  return (
    typeof candidate.version === 'string' &&
    !!candidate.userProfile &&
    typeof candidate.userProfile === 'object' &&
    Array.isArray(candidate.workouts) &&
    Array.isArray(candidate.history)
  );
}

/** Replaces all local data with the given backup. Throws with a specific message on failure. */
export async function restoreBackupData(data: BackupData): Promise<void> {
  await db.workouts.clear();
  await db.history.clear();
  await db.exerciseNotes.clear();
  await db.strengthHistory.clear();

  saveUserProfile(data.userProfile);

  if (data.workouts.length > 0) {
    await db.workouts.bulkAdd(data.workouts);
  }
  if (data.history.length > 0) {
    await db.history.bulkAdd(data.history);
  }
  if (data.exerciseNotes && data.exerciseNotes.length > 0) {
    await db.exerciseNotes.bulkAdd(data.exerciseNotes);
  }
  if (data.strengthHistory && data.strengthHistory.length > 0) {
    await db.strengthHistory.bulkAdd(data.strengthHistory);
  }
}

export function downloadBackupFile(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fitness-tracker-backup-${data.exportDate}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function recordBackupExported(timestamp: number): void {
  localStorage.setItem(LAST_BACKUP_KEY, String(timestamp));
}

export function getLastBackupDate(): number | null {
  const stored = localStorage.getItem(LAST_BACKUP_KEY);
  if (!stored) return null;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : null;
}

const REMINDER_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/** True once it's been >=14 days since the last export, or no export has ever been made. */
export function isBackupReminderDue(now: number): boolean {
  const last = getLastBackupDate();
  if (last === null) return true;
  return now - last >= REMINDER_THRESHOLD_MS;
}
