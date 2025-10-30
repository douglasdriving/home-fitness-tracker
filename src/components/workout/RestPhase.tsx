/**
 * RestPhase Component
 * Displays rest timer and preview of next set/exercise during rest periods
 */

import Timer from './Timer';
import { WorkoutExercise } from '../../types/workout';
import { Exercise } from '../../types/exercise';

interface RestPhaseProps {
  workoutNumber: number;
  progress: number;
  isExerciseRest: boolean;
  restDuration: number;
  currentExercise: WorkoutExercise;
  currentExerciseIndex: number;
  currentSetIndex: number;
  totalExercises: number;
  nextExercise?: WorkoutExercise | null;
  nextExerciseInfo?: Exercise | null;
  nextSetPreview?: { reps?: number; duration?: number } | null;
  exerciseData?: Exercise;
  onRestComplete: () => void;
  onQuit: () => void;
}

export default function RestPhase({
  workoutNumber,
  progress,
  isExerciseRest,
  restDuration,
  currentExercise,
  currentExerciseIndex,
  currentSetIndex,
  totalExercises,
  nextExercise,
  nextExerciseInfo,
  nextSetPreview,
  exerciseData,
  onRestComplete,
  onQuit,
}: RestPhaseProps) {
  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-background p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-display font-bold tracking-wide">
            WORKOUT #{workoutNumber}
          </h1>
          <button
            onClick={onQuit}
            className="text-sm font-semibold underline hover:opacity-80 transition"
          >
            Quit
          </button>
        </div>
        <div className="w-full bg-background/30 rounded-full h-2">
          <div
            className="bg-background h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Rest Timer */}
      <div className="p-4">
        <div className="bg-background-light rounded-lg shadow-lg p-6 text-center mb-6 border border-background-lighter">
          <div className="text-6xl mb-4">😌</div>
          <h2 className="text-2xl font-bold text-text mb-2">Rest Time</h2>
          <p className="text-text-muted mb-6">
            {isExerciseRest
              ? 'Great work! Take a break before the next exercise'
              : 'Take a break before your next set'}
          </p>
        </div>

        <Timer
          key={`rest-${currentExerciseIndex}-${currentSetIndex}`}
          duration={restDuration}
          onComplete={onRestComplete}
          autoStart={true}
        />

        {/* Next Set/Exercise Preview */}
        <div className="mt-6 bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter">
          <h3 className="text-sm font-medium text-text-muted mb-2">Up Next:</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-medium text-text">
                {isExerciseRest ? nextExercise?.exerciseName : currentExercise.exerciseName}
              </div>
              <div className="text-sm text-text-muted">
                {isExerciseRest
                  ? `Exercise ${currentExerciseIndex + 2} of ${totalExercises}`
                  : `Set ${currentSetIndex + 2} of ${currentExercise.sets.length}`}
              </div>
            </div>
            <div className="text-lg font-bold text-primary">
              {isExerciseRest
                ? (nextExerciseInfo?.type === 'reps'
                    ? `${nextExercise?.sets[0]?.targetReps} reps`
                    : `${nextExercise?.sets[0]?.targetDuration}s`)
                : (exerciseData?.type === 'reps'
                    ? `${nextSetPreview?.reps || currentExercise.sets[currentSetIndex + 1]?.targetReps} reps`
                    : `${nextSetPreview?.duration || currentExercise.sets[currentSetIndex + 1]?.targetDuration}s`)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
