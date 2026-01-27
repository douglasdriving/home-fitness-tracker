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
  equipmentUsed?: string; // free text for tracking equipment (e.g., "Red band", "Blue + Green bands")
}

export interface WorkoutHistoryEntry {
  id: string;
  workoutId: string;
  workoutNumber: number;
  completedDate: number; // timestamp
  totalDuration: number; // actual minutes
  exercises: CompletedExercise[];
  stretchingCompleted?: boolean; // Optional: tracks if post-workout stretching was done
  intensityScore?: number; // Score representing workout difficulty/intensity (0-100)
}

// Intensity feedback scale: 1-5
// 1 = Way too easy, 2 = A bit too easy, 3 = Just right, 4 = A bit too hard, 5 = Way too hard
export type IntensityRating = 1 | 2 | 3 | 4 | 5;

export interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: MuscleGroup[];
  completedSets: CompletedSet[];
  intensityFeedback?: IntensityRating; // User's feedback on exercise difficulty
}

export interface CompletedSet {
  setNumber: number;
  actualReps?: number;
  actualDuration?: number;
  equipmentUsed?: string; // free text for tracking equipment (e.g., "Red band", "Blue + Green bands")
}
