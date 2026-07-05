import { describe, it, expect } from 'vitest';
import {
  getBestPerformance,
  getWorkoutPerformance,
  isExerciseUnlocked,
  shouldRetireExercise,
  checkWorkoutAchievements,
  getExerciseStatuses,
  getAvailableExercises,
  checkLadderAdvancements,
} from './achievement-tracker';

// The achievement-tracker barrel re-exports the public API from the four
// single-responsibility modules (exercise-performance, exercise-unlock-tracker,
// exercise-status, ladder-advancement). The behavioral tests live alongside
// those modules in their own `*.test.ts` files. This suite just guards that the
// barrel keeps re-exporting the full public surface.
describe('achievement-tracker barrel', () => {
  it('re-exports every public function', () => {
    const api = {
      getBestPerformance,
      getWorkoutPerformance,
      isExerciseUnlocked,
      shouldRetireExercise,
      checkWorkoutAchievements,
      getExerciseStatuses,
      getAvailableExercises,
      checkLadderAdvancements,
    };

    for (const [name, fn] of Object.entries(api)) {
      expect(fn, name).toBeTypeOf('function');
    }
  });
});
