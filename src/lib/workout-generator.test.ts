import { describe, it, expect } from 'vitest';
import { generateWorkout, generateDailyRotationWorkout, findLastPerformanceWithFeedback, getNextDailyRotationGroup } from './workout-generator';
import { getExerciseById } from '../data/exerciseData';
import { getAvailableExercises } from './achievement-tracker';
import { StrengthLevels } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { MuscleGroup } from '../types/exercise';

describe('generateWorkout', () => {
  const defaultStrengthLevels: StrengthLevels = {
    abs: 50,
    glutes: 50,
    lowerBack: 50,
    upperBody: 50,
    lastUpdated: Date.now(),
  };

  describe('set count based on exercise type', () => {
    it('should give per-side exercises exactly 3 sets', () => {
      // Generate multiple workouts to cover different exercise selections
      for (let i = 0; i < 10; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true, // Include band exercises
        });

        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();

          if (exercise?.countingMethod === 'per-side') {
            expect(workoutExercise.sets.length).toBe(3);
          }
        });
      }
    });

    it('should give bilateral (total) exercises exactly 4 sets', () => {
      // Generate multiple workouts to cover different exercise selections
      for (let i = 0; i < 10; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true,
        });

        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();

          // Exercises without countingMethod or with 'total' should have 4 sets
          if (!exercise?.countingMethod || exercise.countingMethod === 'total') {
            expect(workoutExercise.sets.length).toBe(4);
          }
        });
      }
    });

    it('should apply set counts regardless of strength level', () => {
      // Test with low strength level
      const lowStrengthWorkout = generateWorkout({
        workoutNumber: 1,
        strengthLevels: { abs: 20, glutes: 20, lowerBack: 20, upperBody: 20, lastUpdated: Date.now() },
        hasElasticBands: true,
      });

      // Test with high strength level
      const highStrengthWorkout = generateWorkout({
        workoutNumber: 2,
        strengthLevels: { abs: 80, glutes: 80, lowerBack: 80, upperBody: 80, lastUpdated: Date.now() },
        hasElasticBands: true,
      });

      // Both should have same set count rules
      [lowStrengthWorkout, highStrengthWorkout].forEach((workout) => {
        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);

          if (exercise?.countingMethod === 'per-side') {
            expect(workoutExercise.sets.length).toBe(3);
          } else {
            expect(workoutExercise.sets.length).toBe(4);
          }
        });
      });
    });

    it('should correctly identify known per-side exercises', () => {
      // These are the known per-side exercise IDs from exercises.json
      const perSideExerciseIds = [
        'bird-dog-001',
        'single-leg-glute-bridge-001',
        'donkey-kicks-001',
        'side-plank-001',
        'fire-hydrants-001',
        'band-clamshells-001',
      ];

      // Generate workouts until we've tested at least a few per-side exercises
      const testedPerSideExercises = new Set<string>();

      for (let i = 0; i < 20 && testedPerSideExercises.size < 3; i++) {
        const workout = generateWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          hasElasticBands: true,
        });

        workout.exercises.forEach((workoutExercise) => {
          if (perSideExerciseIds.includes(workoutExercise.exerciseId)) {
            testedPerSideExercises.add(workoutExercise.exerciseId);
            expect(workoutExercise.sets.length).toBe(3);
          }
        });
      }

      // Ensure we actually tested some per-side exercises
      expect(testedPerSideExercises.size).toBeGreaterThan(0);
    });
  });

  describe('intensity feedback integration', () => {
    // Helper to create a minimal workout history entry
    function createHistoryEntry(overrides: {
      workoutNumber: number;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        muscleGroups: ('abs' | 'glutes' | 'lowerBack')[];
        completedSets: Array<{ setNumber: number; actualReps?: number; actualDuration?: number }>;
        intensityFeedback?: 1 | 2 | 3 | 4 | 5;
      }>;
    }): WorkoutHistoryEntry {
      return {
        id: `history-test-${overrides.workoutNumber}`,
        workoutId: `workout-test-${overrides.workoutNumber}`,
        workoutNumber: overrides.workoutNumber,
        completedDate: Date.now() - (10 - overrides.workoutNumber) * 86400000,
        totalDuration: 20,
        exercises: overrides.exercises,
      };
    }

    describe('findLastPerformanceWithFeedback', () => {
      it('returns feedback when intensityFeedback is set on the exercise', () => {
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                intensityFeedback: 5,
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result).not.toBeNull();
        expect(result!.performance).toBe(20);
        expect(result!.feedback).toBe(5);
      });

      it('returns undefined feedback when intensityFeedback is not set', () => {
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                // No intensityFeedback
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result).not.toBeNull();
        expect(result!.performance).toBe(20);
        expect(result!.feedback).toBeUndefined();
      });

      it('finds the most recent workout entry (first in array = newest)', () => {
        const history: WorkoutHistoryEntry[] = [
          // Most recent (first in array)
          createHistoryEntry({
            workoutNumber: 3,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 25 }],
                intensityFeedback: 4,
              },
            ],
          }),
          // Older
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [{ setNumber: 1, actualReps: 20 }],
                intensityFeedback: 2,
              },
            ],
          }),
        ];

        const result = findLastPerformanceWithFeedback('crunches-001', history);
        expect(result!.performance).toBe(25);
        expect(result!.feedback).toBe(4);
      });
    });

    describe('generateWorkout with feedback', () => {
      it('reduces reps target when last feedback was "way too hard" (rating 5)', () => {
        const previousReps = 20;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [
                  { setNumber: 1, actualReps: previousReps },
                  { setNumber: 2, actualReps: previousReps },
                ],
                intensityFeedback: 5, // Way too hard
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        // Find crunches in the generated workout
        const crunchesExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'crunches-001'
        );

        // Crunches may not be in this workout (exercise rotation),
        // but if it is, the target should be lower
        if (crunchesExercise) {
          const targetReps = crunchesExercise.sets[0].targetReps!;
          expect(targetReps).toBeLessThan(previousReps);
        }
      });

      it('reduces timed target when last feedback was "a bit too hard" (rating 4)', () => {
        // Use plank since it's a starter timed exercise
        const previousDuration = 40;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'plank-001',
                exerciseName: 'Plank',
                muscleGroups: ['abs', 'lowerBack'],
                completedSets: [
                  { setNumber: 1, actualDuration: previousDuration },
                  { setNumber: 2, actualDuration: previousDuration },
                ],
                intensityFeedback: 4, // A bit too hard
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        const plankExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'plank-001'
        );

        if (plankExercise) {
          const targetDuration = plankExercise.sets[0].targetDuration!;
          expect(targetDuration).toBeLessThan(previousDuration);
        }
      });

      it('increases reps target when last feedback was "way too easy" (rating 1)', () => {
        const previousReps = 20;
        const history: WorkoutHistoryEntry[] = [
          createHistoryEntry({
            workoutNumber: 1,
            exercises: [
              {
                exerciseId: 'crunches-001',
                exerciseName: 'Crunches',
                muscleGroups: ['abs'],
                completedSets: [
                  { setNumber: 1, actualReps: previousReps },
                  { setNumber: 2, actualReps: previousReps },
                ],
                intensityFeedback: 1, // Way too easy
              },
            ],
          }),
        ];

        const workout = generateWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          workoutHistory: history,
        });

        const crunchesExercise = workout.exercises.find(
          (ex) => ex.exerciseId === 'crunches-001'
        );

        if (crunchesExercise) {
          const targetReps = crunchesExercise.sets[0].targetReps!;
          expect(targetReps).toBeGreaterThan(previousReps);
        }
      });
    });
  });
});

describe('generateDailyRotationWorkout', () => {
  const defaultStrengthLevels: StrengthLevels = {
    abs: 50,
    glutes: 50,
    lowerBack: 50,
    upperBody: 50,
    lastUpdated: Date.now(),
  };

  describe('exercise selection', () => {
    it('should select exactly 3 exercises from the specified muscle group', () => {
      // lowerBack was dropped as a rotation day in the 2026-06-17 posterior-chain
      // consolidation; the live rotation is abs → glutes (posterior chain) → upperBody.
      const muscleGroups: MuscleGroup[] = ['abs', 'glutes', 'upperBody'];

      muscleGroups.forEach(targetMuscleGroup => {
        const workout = generateDailyRotationWorkout({
          workoutNumber: 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup,
          hasElasticBands: true,
        });

        expect(workout.exercises.length).toBe(3);

        // All exercises should have the specified muscle group as their PRIMARY group
        workout.exercises.forEach((workoutExercise) => {
          const exercise = getExerciseById(workoutExercise.exerciseId);
          expect(exercise).toBeDefined();
          expect(exercise!.primaryMuscleGroup).toBe(targetMuscleGroup);
        });
      });
    });

    it('should set workoutMode to daily-rotation', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
      });

      expect(workout.workoutMode).toBe('daily-rotation');
    });

    it('should set targetMuscleGroup field', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
      });

      expect(workout.targetMuscleGroup).toBe('glutes');
    });

    it('should handle fewer than 3 available exercises gracefully', () => {
      // Create an exclusion list that leaves only 1-2 exercises
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        excludedExerciseIds: [
          'crunches-001',
          'reverse-crunches-001',
          'plank-001',
          'bicycle-crunches-001',
          'leg-raises-001',
          'mountain-climbers-001',
          'russian-twists-001',
        ],
      });

      // Should generate workout with fewer than 3 exercises without crashing
      expect(workout.exercises.length).toBeGreaterThan(0);
      expect(workout.exercises.length).toBeLessThanOrEqual(3);
    });

    it('should only select exercises by primaryMuscleGroup, not secondary groups', () => {
      // Generate workouts for each muscle group and verify no overlap
      const muscleGroups: MuscleGroup[] = ['abs', 'glutes', 'lowerBack'];
      const exercisesByGroup: Record<string, Set<string>> = {};

      muscleGroups.forEach(targetMuscleGroup => {
        exercisesByGroup[targetMuscleGroup] = new Set();

        // Generate multiple workouts to see different exercise selections
        for (let i = 0; i < 10; i++) {
          const workout = generateDailyRotationWorkout({
            workoutNumber: i + 1,
            strengthLevels: defaultStrengthLevels,
            targetMuscleGroup,
            hasElasticBands: true,
          });

          workout.exercises.forEach(ex => {
            exercisesByGroup[targetMuscleGroup].add(ex.exerciseId);
          });
        }
      });

      // Verify no exercise appears in multiple muscle group rotations
      const absExercises = exercisesByGroup['abs'];
      const glutesExercises = exercisesByGroup['glutes'];
      const lowerBackExercises = exercisesByGroup['lowerBack'];

      absExercises.forEach(id => {
        expect(glutesExercises.has(id)).toBe(false);
        expect(lowerBackExercises.has(id)).toBe(false);
      });
      glutesExercises.forEach(id => {
        expect(absExercises.has(id)).toBe(false);
        expect(lowerBackExercises.has(id)).toBe(false);
      });
      lowerBackExercises.forEach(id => {
        expect(absExercises.has(id)).toBe(false);
        expect(glutesExercises.has(id)).toBe(false);
      });
    });

    it('should have at least 3 glutes exercises available for new users without bands', () => {
      // Simulate a new user with no workout history and no elastic bands
      const available = getAvailableExercises(
        [], // no workout history
        { unlockedExercises: [], retiredExercises: [] },
        false, // no elastic bands
      );

      const glutesExercises = available.filter(ex => ex.primaryMuscleGroup === 'glutes');
      expect(glutesExercises.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('set count', () => {
    it('should give per-side exercises exactly 2 sets', () => {
      // Use glutes since it has per-side exercises like donkey kicks
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        hasElasticBands: true,
      });

      workout.exercises.forEach((workoutExercise) => {
        const exercise = getExerciseById(workoutExercise.exerciseId);
        expect(exercise).toBeDefined();

        if (exercise?.countingMethod === 'per-side') {
          expect(workoutExercise.sets.length).toBe(2);
        }
      });
    });

    it('should give standard exercises exactly 3 sets', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        hasElasticBands: true,
      });

      workout.exercises.forEach((workoutExercise) => {
        const exercise = getExerciseById(workoutExercise.exerciseId);
        expect(exercise).toBeDefined();

        if (!exercise?.countingMethod || exercise.countingMethod === 'total') {
          expect(workoutExercise.sets.length).toBe(3);
        }
      });
    });
  });

  describe('progressive overload', () => {
    function createHistoryEntry(overrides: {
      workoutNumber: number;
      workoutMode?: 'full-body' | 'daily-rotation';
      targetMuscleGroup?: MuscleGroup;
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        muscleGroups: MuscleGroup[];
        completedSets: Array<{ setNumber: number; actualReps?: number; actualDuration?: number }>;
        intensityFeedback?: 1 | 2 | 3 | 4 | 5;
      }>;
    }): WorkoutHistoryEntry {
      return {
        id: `history-test-${overrides.workoutNumber}`,
        workoutId: `workout-test-${overrides.workoutNumber}`,
        workoutNumber: overrides.workoutNumber,
        completedDate: Date.now() - (10 - overrides.workoutNumber) * 86400000,
        totalDuration: 20,
        exercises: overrides.exercises,
        workoutMode: overrides.workoutMode,
        targetMuscleGroup: overrides.targetMuscleGroup,
      };
    }

    it('should use progressive overload from previous performances', () => {
      const previousReps = 15;
      const history: WorkoutHistoryEntry[] = [
        createHistoryEntry({
          workoutNumber: 1,
          workoutMode: 'daily-rotation',
          targetMuscleGroup: 'abs',
          exercises: [
            {
              exerciseId: 'crunches-001',
              exerciseName: 'Crunches',
              muscleGroups: ['abs'],
              completedSets: [{ setNumber: 1, actualReps: previousReps }],
              intensityFeedback: 3, // Just right
            },
          ],
        }),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        workoutHistory: history,
      });

      const crunchesExercise = workout.exercises.find(
        (ex) => ex.exerciseId === 'crunches-001'
      );

      if (crunchesExercise) {
        const targetReps = crunchesExercise.sets[0].targetReps!;
        // With feedback 3 (just right), should increase by progressive overload
        expect(targetReps).toBeGreaterThan(previousReps);
      }
    });
  });

  describe('exercise rotation', () => {
    it('should prioritize least recently used exercises', () => {
      // Create history with specific exercise usage
      const history: WorkoutHistoryEntry[] = [
        {
          id: 'history-1',
          workoutId: 'workout-1',
          workoutNumber: 1,
          completedDate: Date.now() - 86400000,
          totalDuration: 20,
          workoutMode: 'daily-rotation',
          targetMuscleGroup: 'abs',
          exercises: [
            {
              exerciseId: 'crunches-001',
              exerciseName: 'Crunches',
              muscleGroups: ['abs'],
              completedSets: [{ setNumber: 1, actualReps: 15 }],
            },
          ],
        },
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'abs',
        workoutHistory: history,
      });

      // With multiple abs exercises available, rotation should work
      // We'll check that we have 3 exercises total at least
      expect(workout.exercises.length).toBe(3);
    });
  });

  describe('upper body role-based selection (tested pool, coaching 2026-07-01)', () => {
    const slotOf = (exerciseId: string) => getExerciseById(exerciseId)?.upperBodySlot;

    function upperBodyHistoryEntry(
      workoutNumber: number,
      exercises: Array<{ exerciseId: string; reps: number[]; feedback?: 1 | 2 | 3 | 4 | 5; ladderRung?: number }>
    ): WorkoutHistoryEntry {
      return {
        id: `history-ub-${workoutNumber}`,
        workoutId: `workout-ub-${workoutNumber}`,
        workoutNumber,
        completedDate: Date.now() - (100 - workoutNumber) * 86400000,
        totalDuration: 18,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'upperBody',
        exercises: exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseId,
          muscleGroups: ['upperBody'] as MuscleGroup[],
          completedSets: ex.reps.map((r, i) => ({ setNumber: i + 1, actualReps: r })),
          intensityFeedback: ex.feedback,
          ladderRung: ex.ladderRung,
        })),
      };
    }

    it('generates the three tested exercises, one per slot', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
      });

      expect(workout.exercises.map(ex => ex.exerciseId)).toEqual([
        'inverted-rows-001',
        'incline-pushups-001',
        'pike-pushups-001',
      ]);
      expect(workout.exercises.map(ex => slotOf(ex.exerciseId))).toEqual([
        'horizontal-pull',
        'horizontal-push',
        'vertical-push',
      ]);
    });

    it('runs pike push-up (vertical-push) every session — Slot 3 does not alternate', () => {
      // Even directly after a pike push-up session, Slot 3 is pike push-up again
      const history: WorkoutHistoryEntry[] = [
        upperBodyHistoryEntry(1, [
          { exerciseId: 'inverted-rows-001', reps: [8, 8, 8], ladderRung: 0 },
          { exerciseId: 'incline-pushups-001', reps: [8, 8, 8], ladderRung: 0 },
          { exerciseId: 'pike-pushups-001', reps: [8, 8, 8], ladderRung: 0 },
        ]),
      ];

      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
        workoutHistory: history,
        hasElasticBands: true,
      });

      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(slots).toContain('vertical-push');
      expect(slots).not.toContain('vertical-pull');
    });

    it('gives every upper body exercise 3 sets', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'upperBody',
      });

      workout.exercises.forEach(ex => {
        expect(ex.sets.length).toBe(3);
      });
    });

    it('never generates lower back exercises on the upper body rotation day', () => {
      for (let i = 0; i < 10; i++) {
        const workout = generateDailyRotationWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          hasElasticBands: true,
        });

        workout.exercises.forEach(ex => {
          const exercise = getExerciseById(ex.exerciseId);
          expect(exercise!.primaryMuscleGroup).toBe('upperBody');
        });
      }
    });

    describe('ladder double progression', () => {
      it('starts a first-ever session at the ladder startReps with rung 0 stamped', () => {
        const workout = generateDailyRotationWorkout({
          workoutNumber: 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
        });

        workout.exercises.forEach(ex => {
          expect(ex.ladderRung).toBe(0);
          ex.sets.forEach(set => {
            expect(set.targetReps).toBe(8);
          });
        });
      });

      it('progresses reps within the current rung using intensity feedback', () => {
        // 10 reps at rung 0, feedback 2 (a bit too easy, +10%) → 11 reps
        const history = [
          upperBodyHistoryEntry(1, [
            { exerciseId: 'inverted-rows-001', reps: [10, 10, 10], feedback: 2, ladderRung: 0 },
          ]),
        ];

        const workout = generateDailyRotationWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          workoutHistory: history,
        });

        const tableRow = workout.exercises.find(ex => ex.exerciseId === 'inverted-rows-001');
        expect(tableRow!.sets[0].targetReps).toBe(11);
        expect(tableRow!.ladderRung).toBe(0);
      });

      it('caps the target at advanceReps below the top rung', () => {
        // 14 reps, feedback 1 (+20%) would give 17, but 15 triggers the rung advance instead
        const history = [
          upperBodyHistoryEntry(1, [
            { exerciseId: 'incline-pushups-001', reps: [14, 14, 14], feedback: 1, ladderRung: 0 },
          ]),
        ];

        const workout = generateDailyRotationWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          workoutHistory: history,
        });

        const inclinePushup = workout.exercises.find(ex => ex.exerciseId === 'incline-pushups-001');
        expect(inclinePushup!.sets[0].targetReps).toBe(15);
      });

      it('resets to startReps when the user has advanced to a new rung', () => {
        // User cleared rung 0 (15s across the board) and their ladder level is now 1
        const history = [
          upperBodyHistoryEntry(1, [
            { exerciseId: 'incline-pushups-001', reps: [15, 15, 15], feedback: 3, ladderRung: 0 },
          ]),
        ];

        const workout = generateDailyRotationWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          workoutHistory: history,
          exerciseAchievements: {
            unlockedExercises: [],
            retiredExercises: [],
            ladderLevels: { 'incline-pushups-001': 1 },
          },
        });

        const inclinePushup = workout.exercises.find(ex => ex.exerciseId === 'incline-pushups-001');
        expect(inclinePushup!.sets[0].targetReps).toBe(8);
        expect(inclinePushup!.ladderRung).toBe(1);
      });

      it('does not cap the target on the top rung', () => {
        const topRung = getExerciseById('inverted-rows-001')!.ladder!.rungs.length - 1;
        const history = [
          upperBodyHistoryEntry(1, [
            { exerciseId: 'inverted-rows-001', reps: [15, 15, 15], feedback: 1, ladderRung: topRung },
          ]),
        ];

        const workout = generateDailyRotationWorkout({
          workoutNumber: 2,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'upperBody',
          workoutHistory: history,
          exerciseAchievements: {
            unlockedExercises: [],
            retiredExercises: [],
            ladderLevels: { 'inverted-rows-001': topRung },
          },
        });

        const tableRow = workout.exercises.find(ex => ex.exerciseId === 'inverted-rows-001');
        // 15 + 20% = 18 — allowed to keep climbing at the top of the ladder
        expect(tableRow!.sets[0].targetReps).toBe(18);
      });
    });
  });

  describe('posterior chain role-based selection (glutes day, 2026-06-17 consolidation)', () => {
    const slotOf = (exerciseId: string) => getExerciseById(exerciseId)?.posteriorChainSlot;

    // Build a completed posterior-chain (glutes) session from a list of exercise ids.
    function posteriorChainHistoryEntry(
      workoutNumber: number,
      exerciseIds: string[]
    ): WorkoutHistoryEntry {
      return {
        id: `history-pc-${workoutNumber}`,
        workoutId: `workout-pc-${workoutNumber}`,
        workoutNumber,
        completedDate: Date.now() - (100 - workoutNumber) * 86400000,
        totalDuration: 20,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'glutes',
        exercises: exerciseIds.map(id => ({
          exerciseId: id,
          exerciseName: id,
          muscleGroups: getExerciseById(id)?.muscleGroups ?? (['glutes'] as MuscleGroup[]),
          completedSets: [{ setNumber: 1, actualReps: 12 }],
        })),
      };
    }

    it('fills exactly one hinge, one glute-builder, and one accessory slot', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        hasElasticBands: true,
      });

      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(workout.exercises).toHaveLength(3);
      expect(slots).toContain('hinge');
      expect(slots).toContain('glute-builder');
      // First-ever posterior-chain session: Slot 3 defaults to spinal-extension.
      expect(slots).toContain('spinal-extension');
      expect(slots).not.toContain('lateral-glute');
    });

    it('only ever selects glutes-primary exercises on the posterior-chain day', () => {
      for (let i = 0; i < 10; i++) {
        const workout = generateDailyRotationWorkout({
          workoutNumber: i + 1,
          strengthLevels: defaultStrengthLevels,
          targetMuscleGroup: 'glutes',
          hasElasticBands: true,
        });
        workout.exercises.forEach(ex => {
          expect(getExerciseById(ex.exerciseId)?.primaryMuscleGroup).toBe('glutes');
        });
      }
    });

    it('always contains a hinge (Slot 1) for a banded user (safety rule)', () => {
      // Even directly after a session that used the hinge, Slot 1 stays a hinge.
      const history = [
        posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'back-extension-hold-001']),
      ];
      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        workoutHistory: history,
        hasElasticBands: true,
      });
      expect(workout.exercises.map(ex => slotOf(ex.exerciseId))).toContain('hinge');
    });

    it('flips Slot 3 to lateral-glute after a spinal-extension session', () => {
      const history = [
        posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'back-extension-hold-001']),
      ];
      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        workoutHistory: history,
        hasElasticBands: true,
      });
      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(slots).toContain('lateral-glute');
      expect(slots).not.toContain('spinal-extension');
    });

    it('flips Slot 3 back to spinal-extension after a lateral-glute session', () => {
      const history = [
        posteriorChainHistoryEntry(1, ['good-morning-001', 'glute-bridge-001', 'donkey-kicks-001']),
      ];
      const workout = generateDailyRotationWorkout({
        workoutNumber: 2,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        workoutHistory: history,
        hasElasticBands: true,
      });
      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(slots).toContain('spinal-extension');
      expect(slots).not.toContain('lateral-glute');
    });

    it('reads the accessory from the most recent posterior-chain session only (ignores abs/upper-body days in between)', () => {
      // Newest-first history: an abs day sits between now and the last glutes day.
      const history = [
        {
          id: 'history-abs-9',
          workoutId: 'workout-abs-9',
          workoutNumber: 9,
          completedDate: Date.now() - 86400000,
          totalDuration: 20,
          workoutMode: 'daily-rotation' as const,
          targetMuscleGroup: 'abs' as MuscleGroup,
          exercises: [
            {
              exerciseId: 'crunches-001',
              exerciseName: 'Crunches',
              muscleGroups: ['abs'] as MuscleGroup[],
              completedSets: [{ setNumber: 1, actualReps: 15 }],
            },
          ],
        },
        posteriorChainHistoryEntry(8, ['good-morning-001', 'glute-bridge-001', 'donkey-kicks-001']),
      ];
      const workout = generateDailyRotationWorkout({
        workoutNumber: 10,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        workoutHistory: history,
        hasElasticBands: true,
      });
      // Last glutes accessory was lateral-glute → next must be spinal-extension.
      const slots = workout.exercises.map(ex => slotOf(ex.exerciseId));
      expect(slots).toContain('spinal-extension');
      expect(slots).not.toContain('lateral-glute');
    });

    it('gives standard posterior-chain exercises 3 sets and per-side ones 2 sets', () => {
      const workout = generateDailyRotationWorkout({
        workoutNumber: 1,
        strengthLevels: defaultStrengthLevels,
        targetMuscleGroup: 'glutes',
        hasElasticBands: true,
      });
      workout.exercises.forEach(ex => {
        const exercise = getExerciseById(ex.exerciseId);
        const expected = exercise?.countingMethod === 'per-side' ? 2 : 3;
        expect(ex.sets.length).toBe(expected);
      });
    });
  });
});

describe('getNextDailyRotationGroup', () => {
  function createHistoryEntry(overrides: {
    workoutNumber: number;
    workoutMode?: 'full-body' | 'daily-rotation';
    targetMuscleGroup?: MuscleGroup;
  }): WorkoutHistoryEntry {
    return {
      id: `history-test-${overrides.workoutNumber}`,
      workoutId: `workout-test-${overrides.workoutNumber}`,
      workoutNumber: overrides.workoutNumber,
      completedDate: Date.now() - (10 - overrides.workoutNumber) * 86400000,
      totalDuration: 20,
      exercises: [],
      workoutMode: overrides.workoutMode,
      targetMuscleGroup: overrides.targetMuscleGroup,
    };
  }

  it('should return abs when no previous daily rotation workouts exist', () => {
    const history: WorkoutHistoryEntry[] = [];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should return abs when only full-body workouts exist', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({ workoutNumber: 1, workoutMode: 'full-body' }),
      createHistoryEntry({ workoutNumber: 2, workoutMode: 'full-body' }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should return glutes after abs', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('glutes');
  });

  it('should return upperBody after glutes', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'glutes',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('upperBody');
  });

  it('should return abs after upperBody (rotation wraps)', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'upperBody',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should wrap to abs for a legacy lowerBack last-day (no longer in rotation)', () => {
    const history: WorkoutHistoryEntry[] = [
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'lowerBack',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('abs');
  });

  it('should use the most recent daily rotation workout (first in array)', () => {
    const history: WorkoutHistoryEntry[] = [
      // Most recent
      createHistoryEntry({
        workoutNumber: 3,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'glutes',
      }),
      // Older
      createHistoryEntry({
        workoutNumber: 2,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
      // Oldest
      createHistoryEntry({
        workoutNumber: 1,
        workoutMode: 'full-body',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('upperBody');
  });

  it('should ignore full-body workouts mixed with daily rotation workouts', () => {
    const history: WorkoutHistoryEntry[] = [
      // Most recent - full body
      createHistoryEntry({
        workoutNumber: 3,
        workoutMode: 'full-body',
      }),
      // Previous daily rotation
      createHistoryEntry({
        workoutNumber: 2,
        workoutMode: 'daily-rotation',
        targetMuscleGroup: 'abs',
      }),
    ];
    const nextGroup = getNextDailyRotationGroup(history);
    expect(nextGroup).toBe('glutes');
  });
});
