import { Exercise } from '../types/exercise';
import exercisesJson from './exercises.json';

// NOTE (upper body rotation, issue #26): the 'vertical-pull' slot (3a) has NO
// no-equipment starter without a pull-up bar. `band-lat-pulldown-001`
// (requires elastic-band) is the only pre-bar vertical-pull exercise, so a
// brand-new user with no band has no starter for that slot. The follow-on
// rotation generator must handle this gap (e.g. fall back / skip slot 3a).

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

