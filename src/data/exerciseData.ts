import { Exercise, MuscleGroup } from '../types/exercise';
import exercisesJson from './exercises.json';

// Load exercises from JSON
export const allExercises: Exercise[] = exercisesJson as Exercise[];

// Get all exercises for a specific muscle group
export function getExercisesByMuscleGroup(muscleGroup: MuscleGroup): Exercise[] {
  return allExercises.filter(exercise =>
    exercise.muscleGroups.includes(muscleGroup)
  );
}

// Get exercise by ID
export function getExerciseById(id: string): Exercise | undefined {
  return allExercises.find(exercise => exercise.id === id);
}

