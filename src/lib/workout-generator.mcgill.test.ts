import { describe, it, expect } from 'vitest';
import { generateWorkout, generateDailyRotationWorkout } from './workout-generator';
import { WorkoutHistoryEntry } from '../types/workout';
import { StrengthLevels } from '../types/user';

const mockStrengthLevels: StrengthLevels = {
  abs: 10,
  glutes: 10,
  lowerBack: 10,
  upperBody: 10,
  lastUpdated: Date.now(),
};

describe('McGill protocol workout generation', () => {
  describe('new user (no history)', () => {
    it('generates side plank with default McGill structure [3,2,1] × 10s', () => {
      // Create a simple workout with just side plank
      // Need to manually include dead-bug as unlocked since side-plank requires it
      const workout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: mockStrengthLevels,
        workoutHistory: [],
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'], // dead-bug needed for side-plank unlock
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();
      expect(sidePlankExercise?.sets).toHaveLength(3);

      // First set: 3 rounds × 10s
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(3);
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(10);
      expect(sidePlankExercise?.sets[0].targetDuration).toBe(30); // 3 × 10

      // Second set: 2 rounds × 10s
      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(10);
      expect(sidePlankExercise?.sets[1].targetDuration).toBe(20); // 2 × 10

      // Third set: 1 round × 10s
      expect(sidePlankExercise?.sets[2].mcgillRounds).toBe(1);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(10);
      expect(sidePlankExercise?.sets[2].targetDuration).toBe(10); // 1 × 10
    });
  });

  describe('user with McGill history', () => {
    it('progresses hold duration when feedback is "too easy"', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 30,
                  mcgillRounds: 3,
                  mcgillHoldDuration: 10,
                },
                {
                  setNumber: 2,
                  actualDuration: 20,
                  mcgillRounds: 2,
                  mcgillHoldDuration: 10,
                },
                {
                  setNumber: 3,
                  actualDuration: 10,
                  mcgillRounds: 1,
                  mcgillHoldDuration: 10,
                },
              ],
              intensityFeedback: 1, // Way too easy
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // Should increase hold duration from 10s to 15s
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(3);
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(15);
      expect(sidePlankExercise?.sets[0].targetDuration).toBe(45); // 3 × 15

      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(15);
      expect(sidePlankExercise?.sets[1].targetDuration).toBe(30); // 2 × 15

      expect(sidePlankExercise?.sets[2].mcgillRounds).toBe(1);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(15);
      expect(sidePlankExercise?.sets[2].targetDuration).toBe(15); // 1 × 15
    });

    it('increases first set rounds when hold duration reaches 30s and feedback is "too easy"', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 90,
                  mcgillRounds: 3,
                  mcgillHoldDuration: 30,
                },
                {
                  setNumber: 2,
                  actualDuration: 60,
                  mcgillRounds: 2,
                  mcgillHoldDuration: 30,
                },
                {
                  setNumber: 3,
                  actualDuration: 30,
                  mcgillRounds: 1,
                  mcgillHoldDuration: 30,
                },
              ],
              intensityFeedback: 1, // Way too easy
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // Should increase first set rounds from 3 to 4
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(4);
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(30);
      expect(sidePlankExercise?.sets[0].targetDuration).toBe(120); // 4 × 30

      // Other sets stay the same
      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(30);

      expect(sidePlankExercise?.sets[2].mcgillRounds).toBe(1);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(30);
    });

    it('progresses hold duration when feedback is "just right" and duration below 25s', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 30,
                  mcgillRounds: 3,
                  mcgillHoldDuration: 10,
                },
                {
                  setNumber: 2,
                  actualDuration: 20,
                  mcgillRounds: 2,
                  mcgillHoldDuration: 10,
                },
              ],
              intensityFeedback: 3, // Just right
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // "Just right" with 10s hold should increase to 15s (below 25s threshold)
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(15);
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(3);
      expect(sidePlankExercise?.sets[0].targetDuration).toBe(45); // 3 × 15

      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(15);
      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].targetDuration).toBe(30); // 2 × 15
    });

    it('decreases hold duration when feedback is "too hard"', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 45,
                  mcgillRounds: 3,
                  mcgillHoldDuration: 15,
                },
                {
                  setNumber: 2,
                  actualDuration: 30,
                  mcgillRounds: 2,
                  mcgillHoldDuration: 15,
                },
                {
                  setNumber: 3,
                  actualDuration: 15,
                  mcgillRounds: 1,
                  mcgillHoldDuration: 15,
                },
              ],
              intensityFeedback: 5, // Way too hard
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // Should decrease hold duration from 15s to 10s
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(10);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(10);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(10);
    });
  });

  describe('backwards compatibility (legacy single-hold history)', () => {
    it('converts legacy 30s single hold to McGill protocol', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 30, // Legacy: single 30s hold
                  // No mcgillRounds or mcgillHoldDuration
                },
                {
                  setNumber: 2,
                  actualDuration: 30,
                },
                {
                  setNumber: 3,
                  actualDuration: 30,
                },
              ],
              intensityFeedback: 3, // Just right
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // Should convert 30s to McGill: 30 / 6 = 5, rounds to 5, clamped to min 10
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(3);
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(10);

      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(10);

      expect(sidePlankExercise?.sets[2].mcgillRounds).toBe(1);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(10);
    });

    it('converts legacy 90s single hold to McGill protocol', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 30,
          exercises: [
            {
              exerciseId: 'side-plank-001',
              exerciseName: 'Side Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                {
                  setNumber: 1,
                  actualDuration: 90, // Legacy: single 90s hold
                },
              ],
              intensityFeedback: 3,
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001', 'glute-bridge-001', 'donkey-kicks-001', 'bulgarian-split-squat-001', 'single-leg-glute-bridge-001', 'superman-001', 'reverse-hyperextension-001', 'frog-pumps-001', 'good-morning-001', 'back-extension-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      expect(sidePlankExercise).toBeDefined();

      // Should convert 90s to McGill: 90 / 6 = 15
      expect(sidePlankExercise?.sets[0].mcgillRounds).toBe(3);
      expect(sidePlankExercise?.sets[0].mcgillHoldDuration).toBe(15);

      expect(sidePlankExercise?.sets[1].mcgillRounds).toBe(2);
      expect(sidePlankExercise?.sets[1].mcgillHoldDuration).toBe(15);

      expect(sidePlankExercise?.sets[2].mcgillRounds).toBe(1);
      expect(sidePlankExercise?.sets[2].mcgillHoldDuration).toBe(15);
    });
  });

  describe('Plank (single-sided ceiling-based McGill protocol)', () => {
    // Exclude every abs exercise except plank-001 so it is the selected abs exercise.
    const ABS_EXCLUDE_EXCEPT_PLANK = [
      'crunches-001', 'toe-touches-001', 'dead-bug-001', 'reverse-crunches-001',
      'flutter-kicks-001', 'bicycle-crunches-001', 'plank-shoulder-taps-001',
      'side-plank-001', 'mountain-climbers-001', 'leg-raises-001', 'v-ups-001',
      'hollow-body-hold-001', 'dragon-flag-tuck-001',
    ];

    it('generates Plank with default McGill structure [3,2,1] × 15s', () => {
      const workout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: mockStrengthLevels,
        workoutHistory: [],
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_PLANK,
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const plank = workout.exercises.find(ex => ex.exerciseId === 'plank-001');
      expect(plank).toBeDefined();
      expect(plank?.sets).toHaveLength(3);

      expect(plank?.sets[0].mcgillRounds).toBe(3);
      expect(plank?.sets[0].mcgillHoldDuration).toBe(15);
      expect(plank?.sets[0].targetDuration).toBe(45); // 3 × 15

      expect(plank?.sets[1].mcgillRounds).toBe(2);
      expect(plank?.sets[1].mcgillHoldDuration).toBe(15);
      expect(plank?.sets[1].targetDuration).toBe(30); // 2 × 15

      expect(plank?.sets[2].mcgillRounds).toBe(1);
      expect(plank?.sets[2].mcgillHoldDuration).toBe(15);
      expect(plank?.sets[2].targetDuration).toBe(15); // 1 × 15
    });

    it('migrates legacy single-hold plank history (75s) to the interval format', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'plank-001',
              exerciseName: 'Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                { setNumber: 1, actualDuration: 75 }, // legacy single hold, no McGill fields
                { setNumber: 2, actualDuration: 75 },
              ],
              intensityFeedback: 3, // Just right
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_PLANK,
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const plank = workout.exercises.find(ex => ex.exerciseId === 'plank-001');
      expect(plank).toBeDefined();
      // 75 / 6 = 12.5 → rounds to 15 (under the 30s ceiling, no clamp)
      expect(plank?.sets[0].mcgillRounds).toBe(3);
      expect(plank?.sets[0].mcgillHoldDuration).toBe(15);
      expect(plank?.sets[1].mcgillRounds).toBe(2);
      expect(plank?.sets[1].mcgillHoldDuration).toBe(15);
      expect(plank?.sets[2].mcgillRounds).toBe(1);
      expect(plank?.sets[2].mcgillHoldDuration).toBe(15);
    });

    it('adds a rep instead of seconds once the 30s ceiling is hit (too easy)', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'plank-001',
              exerciseName: 'Plank',
              muscleGroups: ['abs', 'lowerBack'],
              completedSets: [
                { setNumber: 1, actualDuration: 90, mcgillRounds: 3, mcgillHoldDuration: 30 },
                { setNumber: 2, actualDuration: 60, mcgillRounds: 2, mcgillHoldDuration: 30 },
                { setNumber: 3, actualDuration: 30, mcgillRounds: 1, mcgillHoldDuration: 30 },
              ],
              intensityFeedback: 1, // Way too easy
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_PLANK,
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const plank = workout.exercises.find(ex => ex.exerciseId === 'plank-001');
      expect(plank).toBeDefined();
      // At ceiling (30s) + too easy → add a rep to the first set, hold stays at 30s
      expect(plank?.sets[0].mcgillRounds).toBe(4);
      expect(plank?.sets[0].mcgillHoldDuration).toBe(30);
      expect(plank?.sets[0].targetDuration).toBe(120); // 4 × 30
      expect(plank?.sets[1].mcgillRounds).toBe(2);
      expect(plank?.sets[1].mcgillHoldDuration).toBe(30);
    });
  });

  describe('Hollow Body Hold (single-sided ceiling-based McGill protocol)', () => {
    // Exclude every abs exercise except hollow-body-hold-001 so it is the selected abs exercise.
    const ABS_EXCLUDE_EXCEPT_HOLLOW = [
      'crunches-001', 'toe-touches-001', 'dead-bug-001', 'plank-001',
      'reverse-crunches-001', 'flutter-kicks-001', 'bicycle-crunches-001',
      'plank-shoulder-taps-001', 'side-plank-001', 'mountain-climbers-001',
      'leg-raises-001', 'v-ups-001', 'dragon-flag-tuck-001',
    ];

    it('generates Hollow Body Hold with default McGill structure [3,2,1] × 10s', () => {
      const workout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: mockStrengthLevels,
        workoutHistory: [],
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_HOLLOW,
        // hollow-body-hold-001 has an unlock requirement, so it must be unlocked
        exerciseAchievements: { unlockedExercises: ['hollow-body-hold-001'], retiredExercises: [] },
      });

      const hollow = workout.exercises.find(ex => ex.exerciseId === 'hollow-body-hold-001');
      expect(hollow).toBeDefined();
      expect(hollow?.sets).toHaveLength(3);

      expect(hollow?.sets[0].mcgillRounds).toBe(3);
      expect(hollow?.sets[0].mcgillHoldDuration).toBe(10);
      expect(hollow?.sets[0].targetDuration).toBe(30); // 3 × 10

      expect(hollow?.sets[1].mcgillRounds).toBe(2);
      expect(hollow?.sets[1].mcgillHoldDuration).toBe(10);
      expect(hollow?.sets[1].targetDuration).toBe(20); // 2 × 10

      expect(hollow?.sets[2].mcgillRounds).toBe(1);
      expect(hollow?.sets[2].mcgillHoldDuration).toBe(10);
      expect(hollow?.sets[2].targetDuration).toBe(10); // 1 × 10
    });

    it('migrates legacy single-hold history (90s) to the interval format clamped to [10, 30]', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'hollow-body-hold-001',
              exerciseName: 'Hollow Body Hold',
              muscleGroups: ['abs'],
              completedSets: [
                { setNumber: 1, actualDuration: 90 }, // legacy single hold, no McGill fields
                { setNumber: 2, actualDuration: 90 },
              ],
              intensityFeedback: 3, // Just right
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_HOLLOW,
        exerciseAchievements: { unlockedExercises: ['hollow-body-hold-001'], retiredExercises: [] },
      });

      const hollow = workout.exercises.find(ex => ex.exerciseId === 'hollow-body-hold-001');
      expect(hollow).toBeDefined();
      // 90 / 6 = 15 → within [10, 30], no clamp
      expect(hollow?.sets[0].mcgillRounds).toBe(3);
      expect(hollow?.sets[0].mcgillHoldDuration).toBe(15);
      expect(hollow?.sets[1].mcgillRounds).toBe(2);
      expect(hollow?.sets[1].mcgillHoldDuration).toBe(15);
      expect(hollow?.sets[2].mcgillRounds).toBe(1);
      expect(hollow?.sets[2].mcgillHoldDuration).toBe(15);
    });

    it('adds a rep instead of seconds once the 30s ceiling is hit (too easy)', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'hollow-body-hold-001',
              exerciseName: 'Hollow Body Hold',
              muscleGroups: ['abs'],
              completedSets: [
                { setNumber: 1, actualDuration: 90, mcgillRounds: 3, mcgillHoldDuration: 30 },
                { setNumber: 2, actualDuration: 60, mcgillRounds: 2, mcgillHoldDuration: 30 },
                { setNumber: 3, actualDuration: 30, mcgillRounds: 1, mcgillHoldDuration: 30 },
              ],
              intensityFeedback: 1, // Way too easy
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: ABS_EXCLUDE_EXCEPT_HOLLOW,
        exerciseAchievements: { unlockedExercises: ['hollow-body-hold-001'], retiredExercises: [] },
      });

      const hollow = workout.exercises.find(ex => ex.exerciseId === 'hollow-body-hold-001');
      expect(hollow).toBeDefined();
      // At ceiling (30s) + too easy → add a rep to the first set, hold stays at 30s
      expect(hollow?.sets[0].mcgillRounds).toBe(4);
      expect(hollow?.sets[0].mcgillHoldDuration).toBe(30);
      expect(hollow?.sets[0].targetDuration).toBe(120); // 4 × 30
      expect(hollow?.sets[1].mcgillRounds).toBe(2);
      expect(hollow?.sets[1].mcgillHoldDuration).toBe(30);
    });
  });

  describe('Back Extension Hold (single-sided ceiling-based McGill protocol)', () => {
    // The lowerBack slot draws from any exercise whose muscleGroups include
    // lowerBack (including abs/glutes exercises that list it as secondary), so
    // exclude every lowerBack-containing exercise except back-extension-hold-001.
    const LOWERBACK_EXCLUDE_EXCEPT_BACKEXT = [
      'dead-bug-001', 'plank-001', 'plank-shoulder-taps-001', 'side-plank-001',
      'dragon-flag-tuck-001', 'glute-bridge-001', 'single-leg-glute-bridge-001',
      'band-glute-bridge-001', 'single-leg-rdl-001', 'hip-thrust-001',
      'nordic-curl-assisted-001', 'bird-dog-001', 'good-morning-001',
      'superman-001', 'reverse-hyperextension-001',
    ];

    it('generates Back Extension Hold with default McGill structure [3,2,1] × 10s', () => {
      const workout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: mockStrengthLevels,
        workoutHistory: [],
        excludedExerciseIds: LOWERBACK_EXCLUDE_EXCEPT_BACKEXT,
        // back-extension-hold-001 has no unlock requirement, available by default
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const backExt = workout.exercises.find(ex => ex.exerciseId === 'back-extension-hold-001');
      expect(backExt).toBeDefined();
      expect(backExt?.sets).toHaveLength(3);

      expect(backExt?.sets[0].mcgillRounds).toBe(3);
      expect(backExt?.sets[0].mcgillHoldDuration).toBe(10);
      expect(backExt?.sets[0].targetDuration).toBe(30); // 3 × 10

      expect(backExt?.sets[1].mcgillRounds).toBe(2);
      expect(backExt?.sets[1].mcgillHoldDuration).toBe(10);
      expect(backExt?.sets[1].targetDuration).toBe(20); // 2 × 10

      expect(backExt?.sets[2].mcgillRounds).toBe(1);
      expect(backExt?.sets[2].mcgillHoldDuration).toBe(10);
      expect(backExt?.sets[2].targetDuration).toBe(10); // 1 × 10
    });

    it('migrates legacy single-hold history (90s) to the interval format clamped to [10, 30]', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'back-extension-hold-001',
              exerciseName: 'Back Extension Hold',
              muscleGroups: ['lowerBack', 'glutes'],
              completedSets: [
                { setNumber: 1, actualDuration: 90 }, // legacy single hold, no McGill fields
                { setNumber: 2, actualDuration: 90 },
              ],
              intensityFeedback: 3, // Just right
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: LOWERBACK_EXCLUDE_EXCEPT_BACKEXT,
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const backExt = workout.exercises.find(ex => ex.exerciseId === 'back-extension-hold-001');
      expect(backExt).toBeDefined();
      // 90 / 6 = 15 → within [10, 30], no clamp
      expect(backExt?.sets[0].mcgillRounds).toBe(3);
      expect(backExt?.sets[0].mcgillHoldDuration).toBe(15);
      expect(backExt?.sets[1].mcgillRounds).toBe(2);
      expect(backExt?.sets[1].mcgillHoldDuration).toBe(15);
      expect(backExt?.sets[2].mcgillRounds).toBe(1);
      expect(backExt?.sets[2].mcgillHoldDuration).toBe(15);
    });

    it('adds a rep instead of seconds once the 30s ceiling is hit (too easy)', () => {
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'w1',
          workoutId: 'w1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 300,
          exercises: [
            {
              exerciseId: 'back-extension-hold-001',
              exerciseName: 'Back Extension Hold',
              muscleGroups: ['lowerBack', 'glutes'],
              completedSets: [
                { setNumber: 1, actualDuration: 90, mcgillRounds: 3, mcgillHoldDuration: 30 },
                { setNumber: 2, actualDuration: 60, mcgillRounds: 2, mcgillHoldDuration: 30 },
                { setNumber: 3, actualDuration: 30, mcgillRounds: 1, mcgillHoldDuration: 30 },
              ],
              intensityFeedback: 1, // Way too easy
            },
          ],
        },
      ];

      const workout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: mockStrengthLevels,
        workoutHistory: history,
        excludedExerciseIds: LOWERBACK_EXCLUDE_EXCEPT_BACKEXT,
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      });

      const backExt = workout.exercises.find(ex => ex.exerciseId === 'back-extension-hold-001');
      expect(backExt).toBeDefined();
      // At ceiling (30s) + too easy → add a rep to the first set, hold stays at 30s
      expect(backExt?.sets[0].mcgillRounds).toBe(4);
      expect(backExt?.sets[0].mcgillHoldDuration).toBe(30);
      expect(backExt?.sets[0].targetDuration).toBe(120); // 4 × 30
      expect(backExt?.sets[1].mcgillRounds).toBe(2);
      expect(backExt?.sets[1].mcgillHoldDuration).toBe(30);
    });
  });

  describe('daily rotation mode', () => {
    it('generates McGill protocol in daily rotation mode', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: mockStrengthLevels,
        targetMuscleGroup: 'abs',
        workoutHistory: [],
        excludedExerciseIds: ['crunches-001', 'toe-touches-001', 'bicycle-crunches-001', 'leg-raises-001', 'plank-001', 'bird-dog-001', 'hollow-body-hold-001'],
        exerciseAchievements: {
          unlockedExercises: ['dead-bug-001', 'side-plank-001'],
          retiredExercises: [],
        },
      });

      const sidePlankExercise = workout.exercises.find(
        ex => ex.exerciseId === 'side-plank-001'
      );

      if (sidePlankExercise) {
        expect(sidePlankExercise.sets).toHaveLength(3);
        expect(sidePlankExercise.sets[0].mcgillRounds).toBe(3);
        expect(sidePlankExercise.sets[0].mcgillHoldDuration).toBe(10);
      }
    });
  });
});
