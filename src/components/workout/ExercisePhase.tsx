/**
 * ExercisePhase Component
 * Main exercise execution view with timer, target display, and progress tracking.
 * Users see the target and click Complete when done (no manual input needed).
 */

import { useState, useEffect } from 'react';
import Timer from './Timer';
import McgillTimer from './McgillTimer';
import Button from '../common/Button';
import Input from '../common/Input';
import ExerciseModal from './ExerciseModal';
import { WorkoutExercise, Set as WorkoutSet } from '../../types/workout';
import { Exercise } from '../../types/exercise';
import { formatMcgillSet } from '../../utils/mcgill-formatter';

interface ExercisePhaseProps {
  currentExercise: WorkoutExercise;
  currentSet: WorkoutSet;
  currentExerciseIndex: number;
  currentSetIndex: number;
  totalExercises: number;
  exercise: Exercise;
  isFirstTime: boolean;
  previousNote: string;
  onCompleteSet: (value: number, equipment: string, note: string) => void;
}

export default function ExercisePhase({
  currentExercise,
  currentSet,
  currentExerciseIndex,
  currentSetIndex,
  exercise,
  previousNote,
  onCompleteSet,
}: ExercisePhaseProps) {
  // Get equipment from previous set to auto-fill
  const previousSetEquipment = currentSetIndex > 0
    ? currentExercise.sets[currentSetIndex - 1].equipmentUsed || ''
    : '';

  const [equipmentInput, setEquipmentInput] = useState(previousSetEquipment);
  const [exerciseNote, setExerciseNote] = useState(previousNote);
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  // Update equipment when set changes
  useEffect(() => {
    setEquipmentInput(previousSetEquipment);
  }, [currentSetIndex, previousSetEquipment]);

  // Update note when exercise changes
  useEffect(() => {
    setExerciseNote(previousNote);
  }, [previousNote]);

  // Get the target value (reps or duration)
  // For McGill exercises, compute total work time from rounds × holdDuration if targetDuration isn't set
  const targetValue = exercise.type === 'reps'
    ? currentSet.targetReps
    : currentSet.targetDuration
      || (currentSet.mcgillRounds && currentSet.mcgillHoldDuration
        ? currentSet.mcgillRounds * currentSet.mcgillHoldDuration
        : undefined);

  const handleCompleteClick = () => {
    // Auto-fill actual value from target (user aims for target)
    const value = targetValue || 0;
    onCompleteSet(value, equipmentInput, exerciseNote);
  };

  // Format the target display
  const formatTarget = () => {
    // Check for McGill protocol
    if (currentSet.mcgillRounds && currentSet.mcgillHoldDuration) {
      return formatMcgillSet(
        currentSet.mcgillRounds,
        currentSet.mcgillHoldDuration,
        exercise.countingMethod === 'per-side'
      );
    }

    if (exercise.type === 'reps') {
      const suffix = exercise.countingMethod === 'per-side' ? ' per side' : '';
      return `${currentSet.targetReps}${suffix}`;
    } else {
      const suffix = exercise.countingMethod === 'per-side' ? ' per side' : '';
      return `${currentSet.targetDuration}s${suffix}`;
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Bilateral Exercise Info */}
      {exercise.countingMethod === 'per-side' && currentSetIndex === 0 && (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <p className="text-sm text-text">
            <span className="font-semibold">🔄 Bilateral exercise:</span>{' '}
            {exercise.type === 'reps'
              ? 'Complete the shown reps on each side before marking as complete.'
              : 'Hold for the shown time on each side before marking as complete.'}
          </p>
        </div>
      )}

      {/* Exercise Info */}
      <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">
              {exercise.emoji} {currentExercise.exerciseName}
            </h2>
            <div className="flex gap-2">
              {currentExercise.muscleGroups.map((mg, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-primary text-background px-2 py-1 rounded-full uppercase font-semibold"
                >
                  {mg}
                </span>
              ))}
            </div>

            {/* Current Ladder Rung */}
            {exercise.ladder && (
              <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-text">
                  <span className="font-semibold">
                    📶 Rung {(currentExercise.ladderRung ?? 0) + 1}/{exercise.ladder.rungs.length}:{' '}
                    {exercise.ladder.rungs[currentExercise.ladderRung ?? 0].name}
                  </span>
                  <span className="block text-xs text-text-muted mt-0.5">
                    {exercise.ladder.rungs[currentExercise.ladderRung ?? 0].description}{' '}
                    Reach {exercise.ladder.advanceReps} reps on all sets to advance.
                  </span>
                </p>
              </div>
            )}

            {/* Coaching Tip */}
            {exercise.coachingTip && (
              <div
                className={`mt-3 p-3 rounded-lg ${
                  exercise.coachingTip.includes('⚠️')
                    ? 'bg-red-500/10 border border-red-500/30'
                    : 'bg-secondary/10 border border-secondary/30'
                }`}
              >
                <p className="text-sm text-text">
                  {exercise.coachingTip.includes('⚠️') ? (
                    exercise.coachingTip
                  ) : (
                    <>
                      <span className="mr-1">💡</span>
                      {exercise.coachingTip}
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted">Exercise</div>
            <div className="text-lg font-bold text-primary">
              {currentExerciseIndex + 1} / {currentExercise.sets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Current Set - Main Target Display */}
      <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        <div className="text-center mb-6">
          <div className="text-sm text-text-muted mb-2">
            Set {currentSetIndex + 1} of {currentExercise.sets.length}
          </div>

          {/* Large Target Display */}
          <div className="text-6xl font-display font-bold text-primary mb-2">
            {formatTarget()}
          </div>
          <div className="text-lg text-text-muted">
            {exercise.type === 'reps' ? 'reps' : ''}
          </div>
        </div>

        {/* Timer for timed exercises */}
        {exercise.type === 'timed' && (
          <div className="mb-6">
            {currentSet.mcgillRounds && currentSet.mcgillHoldDuration ? (
              <McgillTimer
                key={`mcgill-timer-${currentExerciseIndex}-${currentSetIndex}`}
                rounds={currentSet.mcgillRounds}
                holdDuration={currentSet.mcgillHoldDuration}
                restBetweenRounds={exercise.mcgillDefaults?.restBetweenRounds || 5}
                perSide={exercise.countingMethod === 'per-side'}
              />
            ) : (
              <Timer
                key={`timer-${currentExerciseIndex}-${currentSetIndex}`}
                duration={currentSet.targetDuration || 30}
                bilateral={exercise.countingMethod === 'per-side'}
              />
            )}
          </div>
        )}

        {/* Equipment input for elastic band exercises */}
        {exercise.equipment === 'elastic-band' && (
          <div className="mb-4">
            <Input
              type="text"
              label="Equipment used (optional)"
              placeholder="e.g., Red band, Blue + Green bands"
              value={equipmentInput}
              onChange={(e) => setEquipmentInput(e.target.value)}
            />
          </div>
        )}

        {/* Exercise note section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Personal note (optional)
          </label>
          {previousNote && previousNote !== exerciseNote && (
            <div className="mb-2 p-2 bg-secondary/10 border-l-2 border-secondary rounded text-sm text-text-muted">
              <div className="font-medium text-xs text-secondary mb-1">Previous note:</div>
              {previousNote}
            </div>
          )}
          <textarea
            className="w-full px-4 py-3 bg-background-light border border-background-lighter text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted resize-none"
            placeholder="Add a note about form, difficulty, tips..."
            value={exerciseNote}
            onChange={(e) => setExerciseNote(e.target.value)}
            rows={2}
          />
        </div>

        <Button onClick={handleCompleteClick} fullWidth>
          Complete Set
        </Button>
      </div>

      {/* All Sets Progress */}
      <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        <h3 className="text-sm font-medium text-text-muted mb-3">Set Progress</h3>
        <div className="flex gap-2">
          {currentExercise.sets.map((set, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded-full transition-colors ${
                set.completed
                  ? 'bg-primary'
                  : index === currentSetIndex
                  ? 'bg-primary/50'
                  : 'bg-background-lighter'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Exercise Help Button */}
      <div className="bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter">
        <button
          onClick={() => setShowExerciseModal(true)}
          className="w-full flex items-center justify-center gap-2 text-primary hover:text-primary-light transition-colors"
        >
          <span className="text-xl">❓</span>
          <span className="text-sm font-medium">How to do this exercise</span>
        </button>
      </div>

      {/* Exercise Modal */}
      {showExerciseModal && (
        <ExerciseModal
          exercise={exercise}
          currentLadderRung={currentExercise.ladderRung}
          onClose={() => setShowExerciseModal(false)}
        />
      )}
    </div>
  );
}
