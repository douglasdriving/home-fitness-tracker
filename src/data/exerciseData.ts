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

// Get exercises by multiple muscle groups
export function getExercisesByMuscleGroups(muscleGroups: MuscleGroup[]): Exercise[] {
  return allExercises.filter(exercise =>
    exercise.muscleGroups.some(group => muscleGroups.includes(group))
  );
}

// Get random exercise from a muscle group
export function getRandomExercise(muscleGroup: MuscleGroup, exclude: string[] = []): Exercise | undefined {
  const exercises = getExercisesByMuscleGroup(muscleGroup)
    .filter(ex => !exclude.includes(ex.id));

  if (exercises.length === 0) return undefined;

  const randomIndex = Math.floor(Math.random() * exercises.length);
  return exercises[randomIndex];
}
