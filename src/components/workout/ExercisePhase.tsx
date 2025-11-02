/**
 * ExercisePhase Component
 * Main exercise execution view with timer, input fields, and progress tracking
 */

import { useState, useEffect } from 'react';
import Timer from './Timer';
import Button from '../common/Button';
import Input from '../common/Input';
import FirstTimeExerciseBanner from './FirstTimeExerciseBanner';
import BilateralExerciseBanner from './BilateralExerciseBanner';
import ExerciseModal from './ExerciseModal';
import { WorkoutExercise, Set as WorkoutSet } from '../../types/workout';
import { Exercise } from '../../types/exercise';

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
  isFirstTime,
  previousNote,
  onCompleteSet,
}: ExercisePhaseProps) {
  // Get equipment from previous set to auto-fill
  const previousSetEquipment = currentSetIndex > 0
    ? currentExercise.sets[currentSetIndex - 1].equipmentUsed || ''
    : '';

  // Auto-fill rep/duration input based on previous set or target
  const getInitialInputValue = () => {
    if (currentSetIndex > 0) {
      // Use previous set's actual reps/duration
      const previousSet = currentExercise.sets[currentSetIndex - 1];
      if (exercise.type === 'reps' && previousSet.actualReps) {
        return previousSet.actualReps.toString();
      } else if (exercise.type === 'timed' && previousSet.actualDuration) {
        return previousSet.actualDuration.toString();
      }
    }

    // For first set, use target reps/duration
    if (exercise.type === 'reps' && currentSet.targetReps) {
      return currentSet.targetReps.toString();
    } else if (exercise.type === 'timed' && currentSet.targetDuration) {
      return currentSet.targetDuration.toString();
    }

    return '';
  };

  const [inputValue, setInputValue] = useState(getInitialInputValue());
  const [equipmentInput, setEquipmentInput] = useState(previousSetEquipment);
  const [exerciseNote, setExerciseNote] = useState(previousNote);
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  // Update input value when set changes (auto-fill for new sets)
  useEffect(() => {
    setInputValue(getInitialInputValue());
  }, [currentSetIndex, currentExerciseIndex]);

  // Update equipment when set changes
  useEffect(() => {
    setEquipmentInput(previousSetEquipment);
  }, [currentSetIndex, previousSetEquipment]);

  // Update note when exercise changes
  useEffect(() => {
    setExerciseNote(previousNote);
  }, [previousNote]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleCompleteClick = () => {
    const value = parseInt(inputValue);
    if (!value || value <= 0) {
      alert('Please enter a valid number');
      return;
    }
    onCompleteSet(value, equipmentInput, exerciseNote);
  };

  return (
    <div className="p-4 space-y-6">
      {/* First Time Exercise Banner */}
      {isFirstTime && currentSetIndex === 0 && (
        <FirstTimeExerciseBanner exerciseType={exercise.type} />
      )}

      {/* Bilateral Exercise Banner */}
      {exercise.countingMethod === 'per-side' && currentSetIndex === 0 && (
        <BilateralExerciseBanner exerciseType={exercise.type} isFirstTime={isFirstTime} />
      )}

      {/* Exercise Info */}
      <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text mb-1">
              {currentExercise.exerciseName}
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
          </div>
          <div className="text-right">
            <div className="text-sm text-text-muted">Exercise</div>
            <div className="text-lg font-bold text-primary">
              {currentExerciseIndex + 1} / {currentExercise.sets.length}
            </div>
          </div>
        </div>
      </div>

      {/* Current Set */}
      <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-text">
            Set {currentSetIndex + 1} of {currentExercise.sets.length}
          </h3>
          {!isFirstTime && (
            <div className="text-sm text-text-muted">
              Target:{' '}
              {exercise.type === 'reps'
                ? `${currentSet.targetReps} reps${exercise.countingMethod === 'per-side' ? ' per side' : ''}`
                : `${currentSet.targetDuration}s${exercise.countingMethod === 'per-side' ? ' per side' : ''}`}
            </div>
          )}
        </div>

        {/* Timer for timed exercises */}
        {exercise.type === 'timed' && (
          <div className="mb-4">
            <Timer
              key={`timer-${currentExerciseIndex}-${currentSetIndex}`}
              duration={currentSet.targetDuration || 30}
              countUp={isFirstTime && currentSetIndex === 0}
              showSecondsOnly={isFirstTime && currentSetIndex === 0}
              bilateral={exercise.countingMethod === 'per-side' && !(isFirstTime && currentSetIndex === 0)}
            />
          </div>
        )}

        {/* Input for actual performance */}
        <div className="mb-4">
          <Input
            type="number"
            label={
              exercise.type === 'reps'
                ? (exercise.countingMethod === 'per-side'
                    ? 'How many reps did you complete PER SIDE?'
                    : 'How many reps did you complete?')
                : (exercise.countingMethod === 'per-side'
                    ? 'How many seconds did you hold PER SIDE?'
                    : 'How many seconds did you hold?')
            }
            placeholder={
              isFirstTime
                ? (exercise.type === 'reps'
                    ? (exercise.countingMethod === 'per-side' ? 'Enter reps per side' : 'Enter reps')
                    : (exercise.countingMethod === 'per-side' ? 'Enter seconds per side' : 'Enter seconds'))
                : (exercise.type === 'reps'
                  ? `Target: ${currentSet.targetReps}${exercise.countingMethod === 'per-side' ? ' per side' : ''}`
                  : `Target: ${currentSet.targetDuration}s${exercise.countingMethod === 'per-side' ? ' per side' : ''}`)
            }
            value={inputValue}
            onChange={handleInputChange}
            min="1"
          />
        </div>

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
            Personal note about this exercise (optional)
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
        <ExerciseModal exercise={exercise} onClose={() => setShowExerciseModal(false)} />
      )}
    </div>
  );
}
