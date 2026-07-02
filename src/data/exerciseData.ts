import { Exercise } from '../types/exercise';
import exercisesJson from './exercises.json';

// NOTE (upper body pool, coaching session 2026-07-01): every upper-body
// exercise must be physically tested in a coaching session before entering
// this file. The current pool is exactly the three tested exercises
// (table row / incline push-up / pike push-up), each with a difficulty ladder.
// REJECTED — do NOT re-add without new equipment or a re-test:
//   - doorway rows (no sturdy doorway with a clean grip angle)
//   - band rows & band lat pulldown (loop bands are too short, ~62 cm —
//     tension spikes at full extension; pulldown also needs an overhead anchor)
//   - pull-ups/chin-ups (no compatible doorframe for a bar; pressure bars unsafe)
// Vertical pull is PARKED until the equipment situation changes, so Slot 3
// runs pike push-up (vertical push) every upper-body session.

// Load exercises from JSON
export const allExercises: Exercise[] = exercisesJson as Exercise[];

// Get exercise by ID
export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find(exercise => exercise.id === id);
}

// Get exercise emoji by ID
export function getExerciseEmoji(id: string): string {
  return allExercises.find(e => e.id === id)?.emoji ?? '';
}

