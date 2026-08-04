import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExercisePhase from './ExercisePhase';
import { WorkoutExercise, Set as WorkoutSet } from '../../types/workout';
import { Exercise } from '../../types/exercise';

// Mock the Timer component
vi.mock('./Timer', () => ({
  default: () => <div data-testid="timer">Mock Timer</div>,
}));

// Mock the McgillTimer component
vi.mock('./McgillTimer', () => ({
  default: () => <div data-testid="mcgill-timer">Mock McgillTimer</div>,
}));

// Mock the ExerciseModal component
vi.mock('./ExerciseModal', () => ({
  default: () => <div data-testid="exercise-modal">Mock Exercise Modal</div>,
}));

describe('ExercisePhase - Coaching Tips', () => {
  const baseExercise: Exercise = {
    id: 'test-exercise-001',
    name: 'Test Exercise',
    emoji: '🧪',
    primaryMuscleGroup: 'abs',
    muscleGroups: ['abs'],
    description: 'Test description',
    source: 'Test Source',
    heavinessScore: { abs: 5, glutes: 0, lowerBack: 0, upperBody: 0 },
    type: 'reps',
    defaultReps: 15,
  };

  const baseWorkoutExercise: WorkoutExercise = {
    exerciseId: 'test-exercise-001',
    exerciseName: 'Test Exercise',
    muscleGroups: ['abs'],
    sets: [
      { setNumber: 1, targetReps: 15, completed: false },
      { setNumber: 2, targetReps: 15, completed: false },
    ],
    restTime: 60,
  };

  const baseSet: WorkoutSet = {
    setNumber: 1,
    targetReps: 15,
    completed: false,
  };

  const baseProps = {
    currentExercise: baseWorkoutExercise,
    currentSet: baseSet,
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    totalExercises: 3,
    exercise: baseExercise,
    isFirstTime: false,
    previousNote: '',
    onCompleteSet: vi.fn(),
  };

  it('renders coaching tip when present', () => {
    const exerciseWithTip: Exercise = {
      ...baseExercise,
      coachingTip: 'Test coaching tip for proper form.',
    };

    render(<ExercisePhase {...baseProps} exercise={exerciseWithTip} />);

    expect(screen.getByText('Test coaching tip for proper form.')).toBeInTheDocument();
  });

  it('does not render coaching tip when absent', () => {
    render(<ExercisePhase {...baseProps} />);

    // Should not render the coaching tip icon
    expect(screen.queryByText('💡')).not.toBeInTheDocument();
    // Should not render the warning icon in coaching tip context
    expect(screen.queryByText(/SAFETY:/)).not.toBeInTheDocument();
  });

  it('renders safety styling for warning tips', () => {
    const exerciseWithSafetyTip: Exercise = {
      ...baseExercise,
      coachingTip: '⚠️ SAFETY: Lower back MUST stay on floor at all times.',
    };

    render(<ExercisePhase {...baseProps} exercise={exerciseWithSafetyTip} />);

    const tipText = screen.getByText(/SAFETY: Lower back MUST stay on floor at all times/);
    expect(tipText).toBeInTheDocument();

    // Check for warning icon
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();

    // Check that the parent container has red/warning styling (border-red-500)
    const tipContainer = tipText.closest('div');
    expect(tipContainer?.className).toMatch(/border-red-500/);
  });

  it('renders standard styling for non-warning tips', () => {
    const exerciseWithStandardTip: Exercise = {
      ...baseExercise,
      coachingTip: 'Focus on controlled movement and proper breathing.',
    };

    render(<ExercisePhase {...baseProps} exercise={exerciseWithStandardTip} />);

    const tipText = screen.getByText('Focus on controlled movement and proper breathing.');
    expect(tipText).toBeInTheDocument();

    // Check for lightbulb icon
    expect(screen.getByText('💡')).toBeInTheDocument();

    // Check that the parent container has secondary styling (border-secondary)
    const tipContainer = tipText.closest('div');
    expect(tipContainer?.className).toMatch(/border-secondary/);
  });

  it('shows coaching tip for all 4 target exercises', () => {
    const exercises: Array<{ id: string; tip: string }> = [
      {
        id: 'reverse-crunches-001',
        tip: 'Pelvic curl, not a leg lift. Curl tailbone toward ceiling, 3-second lowering count, maintain lower back contact with floor.',
      },
      {
        id: 'hollow-body-hold-001',
        tip: '⚠️ SAFETY: Lower back MUST stay on floor at all times. Stop set immediately when back lifts. Regress by: (1) bending knees more, (2) bringing arms to sides, (3) reducing hold time.',
      },
      {
        id: 'mountain-climbers-001',
        tip: 'Do NOT use yoga mat. Use socks on hard floor for sliding variation (harder core variation). Alternative: furniture sliders or paper plates.',
      },
      {
        id: 'fire-hydrants-001',
        tip: 'Reposition resistance band above the knee (lower thigh) instead of at knee crease to prevent blisters. Wearing pants also works.',
      },
    ];

    exercises.forEach(({ id, tip }) => {
      const exerciseWithTip: Exercise = {
        ...baseExercise,
        id,
        coachingTip: tip,
      };

      const { unmount } = render(<ExercisePhase {...baseProps} exercise={exerciseWithTip} />);

      expect(screen.getByText(new RegExp(tip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 30)))).toBeInTheDocument();

      unmount();
    });
  });
});
