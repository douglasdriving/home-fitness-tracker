import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkoutDetailModal from './WorkoutDetailModal';
import { WorkoutHistoryEntry } from '../../types/workout';

// Mock date-fns
const formatMock = vi.fn(() => 'Jan 1, 2025 • 14:00');
vi.mock('date-fns', () => ({
  format: (...args: unknown[]) => formatMock(...args),
}));

// Mock Dexie database
vi.mock('../../db/db', () => ({
  db: {
    exerciseNotes: {
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock exerciseData
vi.mock('../../data/exerciseData', () => ({
  getExerciseById: (id: string) => {
    if (id === 'side-plank-001') {
      return {
        id: 'side-plank-001',
        name: 'Side Plank',
        emoji: '📏➡️',
        type: 'timed',
        countingMethod: 'per-side',
        structure: 'mcgill',
        mcgillDefaults: { rounds: [3, 2, 1], holdDuration: 10, restBetweenRounds: 5 },
        muscleGroups: ['abs', 'lowerBack'],
        primaryMuscleGroup: 'abs',
        heavinessScore: { abs: 6, glutes: 0, lowerBack: 4 },
      };
    }
    if (id === 'plank-001') {
      return {
        id: 'plank-001',
        name: 'Plank',
        emoji: '📏',
        type: 'timed',
        muscleGroups: ['abs'],
        primaryMuscleGroup: 'abs',
        heavinessScore: { abs: 5, glutes: 0, lowerBack: 0 },
      };
    }
    return undefined;
  },
}));

describe('WorkoutDetailModal', () => {
  const baseProps = {
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isDeleting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats the completed date/time using a 24-hour clock (no AM/PM)', () => {
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    const formatString = formatMock.mock.calls[0][1] as string;
    expect(formatString).toMatch(/HH:mm/);
    expect(formatString).not.toMatch(/h:mm a/i);
  });

  it('displays McGill format for sets with mcgillRounds and mcgillHoldDuration', () => {
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [
        {
          exerciseId: 'side-plank-001',
          exerciseName: 'Side Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, mcgillRounds: 3, mcgillHoldDuration: 10, actualDuration: 30 },
            { setNumber: 2, mcgillRounds: 2, mcgillHoldDuration: 10, actualDuration: 20 },
            { setNumber: 3, mcgillRounds: 1, mcgillHoldDuration: 10, actualDuration: 10 },
          ],
          intensityFeedback: 3,
        },
      ],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    // Should show McGill format: "3×10s per side", "2×10s per side", "1×10s per side"
    expect(screen.getByText(/Set 1: 3×10s per side/)).toBeInTheDocument();
    expect(screen.getByText(/Set 2: 2×10s per side/)).toBeInTheDocument();
    expect(screen.getByText(/Set 3: 1×10s per side/)).toBeInTheDocument();
  });

  it('displays intensity feedback alongside McGill sets', () => {
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [
        {
          exerciseId: 'side-plank-001',
          exerciseName: 'Side Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, mcgillRounds: 3, mcgillHoldDuration: 10, actualDuration: 30 },
          ],
          intensityFeedback: 3,
        },
      ],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    // Both sets and feedback should be visible
    expect(screen.getByText(/Set 1: 3×10s per side/)).toBeInTheDocument();
    expect(screen.getByText(/Just right/)).toBeInTheDocument();
  });

  it('displays standard timed format for sets without McGill data', () => {
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [
        {
          exerciseId: 'plank-001',
          exerciseName: 'Plank',
          muscleGroups: ['abs'],
          completedSets: [
            { setNumber: 1, actualDuration: 45 },
          ],
        },
      ],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    expect(screen.getByText(/Set 1: 45s/)).toBeInTheDocument();
  });

  it('shows correct number of sets for McGill exercises', () => {
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [
        {
          exerciseId: 'side-plank-001',
          exerciseName: 'Side Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, mcgillRounds: 3, mcgillHoldDuration: 10 },
            { setNumber: 2, mcgillRounds: 2, mcgillHoldDuration: 10 },
            { setNumber: 3, mcgillRounds: 1, mcgillHoldDuration: 10 },
          ],
        },
      ],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    // Should show "3 sets" (appears in both the summary and exercise header)
    expect(screen.getAllByText('3 sets')).toHaveLength(2);
  });

  it('displays legacy side plank data as plain duration', () => {
    // Legacy data: side plank completed before McGill protocol was added
    const workout: WorkoutHistoryEntry = {
      id: 'history-1',
      workoutId: 'workout-1',
      workoutNumber: 1,
      completedDate: Date.now(),
      totalDuration: 20,
      exercises: [
        {
          exerciseId: 'side-plank-001',
          exerciseName: 'Side Plank',
          muscleGroups: ['abs', 'lowerBack'],
          completedSets: [
            { setNumber: 1, actualDuration: 28 },
            { setNumber: 2, actualDuration: 28 },
          ],
        },
      ],
    };

    render(<WorkoutDetailModal {...baseProps} workout={workout} />);

    // Should fall through to duration display for legacy data
    expect(screen.getByText(/Set 1: 28s per side/)).toBeInTheDocument();
    expect(screen.getByText(/Set 2: 28s per side/)).toBeInTheDocument();
  });
});
