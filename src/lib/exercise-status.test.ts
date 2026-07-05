import { describe, it, expect } from 'vitest';
import {
  getAvailableExercises,
  getExerciseStatuses,
} from './achievement-tracker';
import { ExerciseAchievements } from '../types/user';
import { createHistoryEntry } from './achievement-fixtures';

describe('getAvailableExercises', () => {
  it('filters out locked exercises', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    // With no crunches history, flutter kicks should be locked
    const available = getAvailableExercises([], achievements);

    const flutterKicks = available.find(ex => ex.id === 'flutter-kicks-001');
    expect(flutterKicks).toBeUndefined();
  });

  it('filters out retired exercises', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: ['crunches-001'],
    };

    const available = getAvailableExercises([], achievements);

    const crunches = available.find(ex => ex.id === 'crunches-001');
    expect(crunches).toBeUndefined();
  });

  it('includes active exercises', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);

    // Crunches and Plank should be available (no unlock requirements)
    const crunches = available.find(ex => ex.id === 'crunches-001');
    const plank = available.find(ex => ex.id === 'plank-001');

    expect(crunches).toBeDefined();
    expect(plank).toBeDefined();
  });

  it('respects excluded exercise IDs', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements, ['crunches-001']);

    const crunches = available.find(ex => ex.id === 'crunches-001');
    expect(crunches).toBeUndefined();
  });

  it('includes exercises once unlocked via history', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    // Do 45 crunches - should unlock flutter kicks
    const history = [createHistoryEntry('crunches-001', 45)];
    const available = getAvailableExercises(history, achievements);

    const flutterKicks = available.find(ex => ex.id === 'flutter-kicks-001');
    expect(flutterKicks).toBeDefined();
  });

  it('always includes band exercises (equipment gate removed)', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);

    const bandClamshells = available.find(ex => ex.id === 'band-clamshells-001');
    expect(bandClamshells).toBeDefined();
  });
});

describe('unlock chains', () => {
  it('unlocking one exercise does not unlock chained exercises', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    // Do 45 crunches - unlocks flutter kicks, but NOT leg raises (needs 45s flutter kicks)
    const history = [createHistoryEntry('crunches-001', 45)];
    const available = getAvailableExercises(history, achievements);

    const flutterKicks = available.find(ex => ex.id === 'flutter-kicks-001');
    const legRaises = available.find(ex => ex.id === 'leg-raises-001');

    expect(flutterKicks).toBeDefined();
    expect(legRaises).toBeUndefined(); // Still locked
  });

  it('completing chain requirement unlocks next exercise', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: ['flutter-kicks-001'], // Already unlocked
      retiredExercises: [],
    };

    // Do 50s flutter kicks - should unlock leg raises
    const history = [createHistoryEntry('flutter-kicks-001', undefined, 50)];
    const available = getAvailableExercises(history, achievements);

    const legRaises = available.find(ex => ex.id === 'leg-raises-001');
    expect(legRaises).toBeDefined();
  });
});

describe('getExerciseStatuses', () => {
  it('shows band exercises as active when they have no unlock requirement', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const statuses = getExerciseStatuses([], achievements);

    // Band Clamshells is an elastic-band exercise with no unlock requirement,
    // so it is active now that the equipment gate is removed.
    const clamshells = statuses.find(ex => ex.id === 'band-clamshells-001');
    expect(clamshells).toBeDefined();
    expect(clamshells?.status).toBe('active');
  });

  it('still locks band exercises that have an unmet unlock requirement', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const statuses = getExerciseStatuses([], achievements);

    // Single-Leg RDL is a band exercise but has an unlock requirement, so it
    // remains locked for that reason (not equipment).
    const singleLegRdl = statuses.find(ex => ex.id === 'single-leg-rdl-001');
    expect(singleLegRdl).toBeDefined();
    expect(singleLegRdl?.status).toBe('locked');
  });

  it('includes band exercises with no unlock requirement in available exercises', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);

    // Band exercises are always available for workout generation now.
    const clamshells = available.find(ex => ex.id === 'band-clamshells-001');
    expect(clamshells).toBeDefined();
  });
});

describe('edge cases', () => {
  it('handles empty workout history', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);

    // Should have some exercises (the ones without unlock requirements)
    expect(available.length).toBeGreaterThan(0);
  });

  it('preserves exercise properties when filtering', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);
    const crunches = available.find(ex => ex.id === 'crunches-001');

    expect(crunches).toBeDefined();
    expect(crunches?.name).toBe('Crunches');
    expect(crunches?.muscleGroups).toContain('abs');
    expect(crunches?.type).toBe('reps');
    expect(crunches?.retirementThreshold).toBeDefined();
  });

  it('preserves the ladder config (field-by-field rebuild must not drop it)', () => {
    const achievements: ExerciseAchievements = {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const available = getAvailableExercises([], achievements);
    const tableRow = available.find(ex => ex.id === 'inverted-rows-001');

    expect(tableRow?.ladder).toBeDefined();
    expect(tableRow?.ladder?.startReps).toBe(8);
    expect(tableRow?.ladder?.advanceReps).toBe(15);
  });
});
