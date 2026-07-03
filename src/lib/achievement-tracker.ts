/**
 * Public barrel for exercise achievement tracking.
 *
 * The implementation is split into single-responsibility modules; this file
 * re-exports the identical public API so existing import paths keep working:
 * - `./exercise-performance`    — history performance queries
 * - `./exercise-unlock-tracker` — unlock/retirement evaluation
 * - `./exercise-status`         — status + available-exercise whitelist
 * - `./ladder-advancement`      — ladder-rung advancement
 */
export { getBestPerformance, getWorkoutPerformance } from './exercise-performance';
export {
  isExerciseUnlocked,
  shouldRetireExercise,
  checkWorkoutAchievements,
} from './exercise-unlock-tracker';
export type { UnlockReason, RetirementReason } from './exercise-unlock-tracker';
export { getExerciseStatuses, getAvailableExercises } from './exercise-status';
export type { ExerciseStatus, ExerciseWithStatus } from './exercise-status';
export { checkLadderAdvancements } from './ladder-advancement';
export type { LadderAdvancement } from './ladder-advancement';
