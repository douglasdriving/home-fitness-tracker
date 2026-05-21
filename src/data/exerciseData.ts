import { Exercise } from '../types/exercise';
import exercisesJson from './exercises.json';

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

