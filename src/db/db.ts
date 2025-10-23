import Dexie, { Table } from 'dexie';
import { Workout, WorkoutHistoryEntry } from '../types/workout';

export interface ExerciseNote {
  exerciseId: string;
  note: string;
  lastUpdated: number; // timestamp
}

export class FitnessTrackerDB extends Dexie {
  workouts!: Table<Workout, string>;
  history!: Table<WorkoutHistoryEntry, string>;
  exerciseNotes!: Table<ExerciseNote, string>;

  constructor() {
    super('FitnessTrackerDB');

    this.version(1).stores({
      workouts: 'id, workoutNumber, status, generatedDate',
      history: 'id, workoutId, completedDate, workoutNumber'
    });

    // Version 2: Add exerciseNotes table
    // Note: equipmentUsed field is added to Set/CompletedSet types but doesn't require schema change
    this.version(2).stores({
      workouts: 'id, workoutNumber, status, generatedDate',
      history: 'id, workoutId, completedDate, workoutNumber',
      exerciseNotes: 'exerciseId, lastUpdated'
    });
  }
}

// Create and export database instance
export const db = new FitnessTrackerDB();
