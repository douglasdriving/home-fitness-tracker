import { describe, it, expect, beforeEach } from 'vitest';
import { db, ExerciseNote, StrengthLevelSnapshot } from '../db/db';
import { Workout, WorkoutHistoryEntry } from '../types/workout';
import { UserProfile } from '../types/user';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile';
import {
  buildBackupData,
  validateBackupData,
  restoreBackupData,
  recordBackupExported,
  getLastBackupDate,
  isBackupReminderDue,
  parseBackupFile,
  BackupData,
} from './backup-restore';

const PROFILE: UserProfile = {
  userId: 'user-1',
  createdDate: 1000,
  calibrationCompleted: true,
  strengthLevels: { abs: 50, glutes: 50, lowerBack: 50, upperBody: 50, lastUpdated: 1000 },
};

const WORKOUT: Workout = {
  id: 'workout-1',
  workoutNumber: 1,
  generatedDate: 1000,
  status: 'completed',
  estimatedDuration: 15,
  exercises: [],
};

const HISTORY_ENTRY: WorkoutHistoryEntry = {
  id: 'history-1',
  workoutId: 'workout-1',
  workoutNumber: 1,
  completedDate: 2000,
  totalDuration: 20,
  exercises: [],
};

const NOTE: ExerciseNote = {
  exerciseId: 'plank-001',
  note: 'felt easy',
  lastUpdated: 3000,
};

const SNAPSHOT: StrengthLevelSnapshot = {
  timestamp: 1000,
  workoutNumber: 0,
  abs: 50,
  glutes: 50,
  lowerBack: 50,
};

async function seedFullDataset() {
  saveUserProfile(PROFILE);
  await db.workouts.bulkAdd([WORKOUT]);
  await db.history.bulkAdd([HISTORY_ENTRY]);
  await db.exerciseNotes.bulkAdd([NOTE]);
  await db.strengthHistory.bulkAdd([SNAPSHOT]);
}

async function clearAllTables() {
  await db.workouts.clear();
  await db.history.clear();
  await db.exerciseNotes.clear();
  await db.strengthHistory.clear();
}

describe('backup-restore', () => {
  beforeEach(async () => {
    await clearAllTables();
    localStorage.clear();
  });

  describe('buildBackupData', () => {
    it('throws when there is no user profile to back up', async () => {
      await expect(buildBackupData()).rejects.toThrow('No user profile found');
    });

    it('captures the profile and all four tables', async () => {
      await seedFullDataset();

      const backup = await buildBackupData();

      expect(backup.userProfile).toEqual(PROFILE);
      expect(backup.workouts).toEqual([WORKOUT]);
      expect(backup.history).toEqual([HISTORY_ENTRY]);
      expect(backup.exerciseNotes).toEqual([NOTE]);
      // strengthHistory has an auto-incremented id assigned on insert.
      expect(backup.strengthHistory).toEqual([{ ...SNAPSHOT, id: expect.any(Number) }]);
      expect(typeof backup.exportDate).toBe('number');
    });
  });

  describe('validateBackupData', () => {
    it('accepts a well-formed backup', () => {
      const data: BackupData = {
        version: '1.1',
        exportDate: 1,
        userProfile: PROFILE,
        workouts: [],
        history: [],
      };
      expect(validateBackupData(data)).toBe(true);
    });

    it.each([
      ['null', null],
      ['a string', 'not an object'],
      ['missing version', { userProfile: PROFILE, workouts: [], history: [] }],
      ['missing userProfile', { version: '1.0', workouts: [], history: [] }],
      ['workouts not an array', { version: '1.0', userProfile: PROFILE, workouts: {}, history: [] }],
      ['history not an array', { version: '1.0', userProfile: PROFILE, workouts: [], history: {} }],
    ])('rejects %s', (_label, candidate) => {
      expect(validateBackupData(candidate)).toBe(false);
    });
  });

  describe('restoreBackupData', () => {
    it('round-trips a full export back into an empty database', async () => {
      await seedFullDataset();
      const backup = await buildBackupData();
      await clearAllTables();

      await restoreBackupData(backup);

      expect(await db.workouts.toArray()).toEqual([WORKOUT]);
      expect(await db.history.toArray()).toEqual([HISTORY_ENTRY]);
      expect(await db.exerciseNotes.toArray()).toEqual([NOTE]);
      expect(await db.strengthHistory.toArray()).toEqual([{ ...SNAPSHOT, id: expect.any(Number) }]);
      expect(loadUserProfile()).toEqual(PROFILE);
    });

    it('restores an old-format backup missing exerciseNotes/strengthHistory without throwing', async () => {
      // Shape of backups exported before exerciseNotes/strengthHistory were included.
      const oldBackup: BackupData = {
        version: '1.0',
        exportDate: 1,
        userProfile: PROFILE,
        workouts: [WORKOUT],
        history: [HISTORY_ENTRY],
      };

      await seedFullDataset(); // simulate pre-existing local data, including notes/snapshots

      await restoreBackupData(oldBackup);

      expect(await db.workouts.toArray()).toEqual([WORKOUT]);
      expect(await db.history.toArray()).toEqual([HISTORY_ENTRY]);
      // Old backup carried no notes/strength history, so those tables end up empty
      // rather than silently keeping whatever was there before the restore.
      expect(await db.exerciseNotes.toArray()).toEqual([]);
      expect(await db.strengthHistory.toArray()).toEqual([]);
    });

    it('clears existing data even when the backup has empty arrays', async () => {
      await seedFullDataset();

      await restoreBackupData({
        version: '1.1',
        exportDate: 1,
        userProfile: PROFILE,
        workouts: [],
        history: [],
        exerciseNotes: [],
        strengthHistory: [],
      });

      expect(await db.workouts.count()).toBe(0);
      expect(await db.history.count()).toBe(0);
    });
  });

  describe('backup reminder', () => {
    it('is due when a backup has never been made', () => {
      expect(getLastBackupDate()).toBeNull();
      expect(isBackupReminderDue(Date.now())).toBe(true);
    });

    it('is not due shortly after a backup', () => {
      const exportedAt = 1_000_000;
      recordBackupExported(exportedAt);

      const oneDayLater = exportedAt + 24 * 60 * 60 * 1000;
      expect(isBackupReminderDue(oneDayLater)).toBe(false);
    });

    it('becomes due again after 14+ days', () => {
      const exportedAt = 1_000_000;
      recordBackupExported(exportedAt);

      const fifteenDaysLater = exportedAt + 15 * 24 * 60 * 60 * 1000;
      expect(isBackupReminderDue(fifteenDaysLater)).toBe(true);
    });
  });

  describe('parseBackupFile', () => {
    it('reads, parses, and validates a well-formed backup file', async () => {
      const data: BackupData = {
        version: '1.1',
        exportDate: 1,
        userProfile: PROFILE,
        workouts: [WORKOUT],
        history: [HISTORY_ENTRY],
      };
      const file = new File([JSON.stringify(data)], 'backup.json', { type: 'application/json' });

      const parsed = await parseBackupFile(file);

      expect(parsed).toEqual(data);
    });

    it('rejects a file that is not valid JSON', async () => {
      const file = new File(['not json'], 'backup.json', { type: 'application/json' });

      await expect(parseBackupFile(file)).rejects.toThrow('not valid JSON');
    });

    it('rejects valid JSON that is not a valid backup shape', async () => {
      const file = new File([JSON.stringify({ foo: 'bar' })], 'backup.json', {
        type: 'application/json',
      });

      await expect(parseBackupFile(file)).rejects.toThrow('not a valid fitness tracker backup');
    });
  });
});
