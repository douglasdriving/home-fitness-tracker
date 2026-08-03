import { create } from 'zustand';
import { createWorkoutSessionSlice, WorkoutSessionSlice } from './workout-session-slice';
import { createWorkoutHistorySlice, WorkoutHistorySlice } from './workout-history-slice';

export type WorkoutStore = WorkoutSessionSlice & WorkoutHistorySlice;

export const useWorkoutStore = create<WorkoutStore>()((...a) => ({
  ...createWorkoutSessionSlice(...a),
  ...createWorkoutHistorySlice(...a),
}));
