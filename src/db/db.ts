import Dexie, { Table } from 'dexie';
import { Workout, WorkoutHistoryEntry } from '../types/workout';

export class FitnessTrackerDB extends Dexie {
  workouts!: Table<Workout, string>;
  history!: Table<WorkoutHistoryEntry, string>;

  constructor() {
    super('FitnessTrackerDB');

    this.version(1).stores({
      workouts: 'id, workoutNumber, status, generatedDate',
      history: 'id, workoutId, completedDate, workoutNumber'
    });
  }
}

// Create and export database instance
export const db = new FitnessTrackerDB();
