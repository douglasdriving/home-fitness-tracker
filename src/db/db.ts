import Dexie, { Table } from 'dexie';
import { Workout, WorkoutHistoryEntry } from '../types/workout';

export interface ExerciseNote {
  exerciseId: string;
  note: string;
  lastUpdated: number; // timestamp
}

export interface StrengthLevelSnapshot {
  id?: number; // Auto-incremented primary key
  timestamp: number; // timestamp when snapshot was taken
  workoutNumber: number; // which workout this snapshot is associated with
  abs: number;
  glutes: number;
  lowerBack: number;
}

export class FitnessTrackerDB extends Dexie {
  workouts!: Table<Workout, string>;
  history!: Table<WorkoutHistoryEntry, string>;
  exerciseNotes!: Table<ExerciseNote, string>;
  strengthHistory!: Table<StrengthLevelSnapshot, number>;

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

    // Version 3: Add strengthHistory table for tracking strength level progression
    this.version(3).stores({
      workouts: 'id, workoutNumber, status, generatedDate',
      history: 'id, workoutId, completedDate, workoutNumber',
      exerciseNotes: 'exerciseId, lastUpdated',
      strengthHistory: '++id, timestamp, workoutNumber'
    });
  }
}

// Create and export database instance
export const db = new FitnessTrackerDB();
