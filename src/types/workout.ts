import { MuscleGroup } from './exercise';

export interface Workout {
  id: string;
  workoutNumber: number;
  generatedDate: number; // timestamp
  startedDate?: number; // timestamp when workout was actually started
  completedDate?: number; // timestamp
  status: 'pending' | 'in-progress' | 'completed';
  estimatedDuration: number; // minutes
  totalDuration?: number; // actual minutes (set when completed)
  exercises: WorkoutExercise[];
  currentExerciseIndex?: number; // Track position for persistence
  currentSetIndex?: number; // Track position for persistence
  currentPhase?: 'exercise' | 'rest' | 'exercise-rest'; // Track phase for persistence
}

export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  sets: Set[];
  restTime: number; // seconds between sets
}

export interface Set {
  setNumber: number;
  targetReps?: number;
  targetDuration?: number; // seconds
  completed: boolean;
  actualReps?: number;
  actualDuration?: number; // seconds
}

export interface WorkoutHistoryEntry {
  id: string;
  workoutId: string;
  workoutNumber: number;
  completedDate: number; // timestamp
  totalDuration: number; // actual minutes
  exercises: CompletedExercise[];
}

export interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  completedSets: CompletedSet[];
}

export interface CompletedSet {
  setNumber: number;
  actualReps?: number;
  actualDuration?: number;
}
