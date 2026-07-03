/**
 * Public barrel for workout generation.
 *
 * The generation logic is split by concern across sibling modules (see
 * `.claude/rules/frontend.md`); this file re-exports the stable public API so
 * every existing call site can keep importing from `./workout-generator`.
 */
export { generateWorkout } from './full-body-generator';
export {
  generateDailyRotationWorkout,
  getNextDailyRotationGroup,
} from './daily-rotation-generator';
export { calculateEstimatedDuration } from './workout-duration';
export { findLastPerformanceWithFeedback } from './workout-history-helpers';
