import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../store/workout-store';
import { getExerciseById } from '../data/exerciseData';
import { db } from '../db/db';
import { useWakeLock } from '../hooks/useWakeLock';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Timer from '../components/workout/Timer';
import ExerciseModal from '../components/workout/ExerciseModal';

type WorkoutPhase = 'exercise' | 'rest' | 'exercise-rest';

export default function WorkoutExecution() {
  const navigate = useNavigate();
  const { currentWorkout, updateSet, completeWorkout, updateWorkoutPosition } = useWorkoutStore();

  // Keep screen awake during workout
  useWakeLock();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [inputValue, setInputValue] = useState('');
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [nextSetPreview, setNextSetPreview] = useState<{reps?: number, duration?: number} | null>(null);

  // Initialize position from saved state on mount
  useEffect(() => {
    if (!currentWorkout || isInitialized) {
      if (!currentWorkout) navigate('/');
      return;
    }

    // Restore saved position if it exists
    if (currentWorkout.currentExerciseIndex !== undefined) {
      setCurrentExerciseIndex(currentWorkout.currentExerciseIndex);
    }
    if (currentWorkout.currentSetIndex !== undefined) {
      setCurrentSetIndex(currentWorkout.currentSetIndex);
    }
    if (currentWorkout.currentPhase) {
      setPhase(currentWorkout.currentPhase);
    }

    setIsInitialized(true);
  }, [currentWorkout, navigate, isInitialized]);

  useEffect(() => {
    if (!currentWorkout || !isInitialized) {
      return;
    }

    // Initialize input value ONLY when changing sets (not when workout updates)
    const currentExercise = currentWorkout.exercises[currentExerciseIndex];
    const currentSet = currentExercise?.sets[currentSetIndex];

    if (currentSet && !currentSet.completed) {
      // For first-time exercises, leave input empty (except for Side Plank sets 2+)
      if (isFirstTime) {
        // For Side Plank sets 2+, pre-fill with target time per side
        if (currentExercise.exerciseId === 'side-plank-001' && currentSetIndex > 0) {
          const value = currentSet.targetDuration || '';
          setInputValue(value.toString());
        } else {
          setInputValue('');
        }
      } else {
        // For known exercises, use target value
        const value = currentSet.targetReps || currentSet.targetDuration || '';
        setInputValue(value.toString());
      }
    }
  }, [currentExerciseIndex, currentSetIndex, isInitialized, isFirstTime]);

  // Save position whenever it changes (but avoid infinite loop)
  useEffect(() => {
    if (!currentWorkout || !isInitialized) return;

    // Only update if position actually changed
    const positionChanged =
      currentWorkout.currentExerciseIndex !== currentExerciseIndex ||
      currentWorkout.currentSetIndex !== currentSetIndex ||
      currentWorkout.currentPhase !== phase;

    if (positionChanged) {
      updateWorkoutPosition(currentExerciseIndex, currentSetIndex, phase);
    }
  }, [currentExerciseIndex, currentSetIndex, phase, currentWorkout, isInitialized, updateWorkoutPosition]);

  // Check if this is the first time doing this exercise
  useEffect(() => {
    const checkFirstTime = async () => {
      if (!currentWorkout) return;

      const currentExercise = currentWorkout.exercises[currentExerciseIndex];
      const exerciseId = currentExercise.exerciseId;

      // Check workout history for this exercise
      const history = await db.history.toArray();
      const hasBeenDone = history.some(workout =>
        workout.exercises.some(ex => ex.exerciseId === exerciseId)
      );

      setIsFirstTime(!hasBeenDone);
    };

    checkFirstTime();
  }, [currentWorkout, currentExerciseIndex]);

  if (!currentWorkout) {
    return null;
  }

  const currentExercise = currentWorkout.exercises[currentExerciseIndex];
  const currentSet = currentExercise.sets[currentSetIndex];
  const exercise = getExerciseById(currentExercise.exerciseId);

  const totalSets = currentWorkout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = currentWorkout.exercises.reduce(
    (sum, ex, exIndex) =>
      sum +
      (exIndex < currentExerciseIndex
        ? ex.sets.length
        : exIndex === currentExerciseIndex
        ? currentSetIndex
        : 0),
    0
  );
  const progress = (completedSets / totalSets) * 100;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleCompleteSet = async () => {
    const value = parseInt(inputValue);

    if (!value || value <= 0) {
      alert('Please enter a valid number');
      return;
    }

    try {
      // Mark set as completed and update actual values
      const updates = {
        completed: true,
        ...(exercise?.type === 'reps'
          ? { actualReps: value }
          : { actualDuration: value }),
      };

      await updateSet(currentExerciseIndex, currentSetIndex, updates);

      // Check if this is the last set of the current exercise
      const isLastSetOfExercise = currentSetIndex === currentExercise.sets.length - 1;
      const isLastExercise = currentExerciseIndex === currentWorkout.exercises.length - 1;

      // For new exercises on first set, store preview value and update remaining sets
      if (isFirstTime && currentSetIndex === 0 && !isLastSetOfExercise) {
        // Store the value for preview display (prevents flickering)
        if (exercise?.type === 'reps') {
          setNextSetPreview({ reps: value });
        } else {
          setNextSetPreview({ duration: value });
        }

        // Update all remaining sets
        for (let i = 1; i < currentExercise.sets.length; i++) {
          if (exercise?.type === 'reps') {
            await updateSet(currentExerciseIndex, i, { targetReps: value });
          } else {
            await updateSet(currentExerciseIndex, i, { targetDuration: value });
          }
        }
      }

      // Move to next phase
      if (isLastSetOfExercise) {
        // Move to next exercise or complete workout
        if (isLastExercise) {
          // Complete the workout
          await handleCompleteWorkout();
        } else {
          // Rest between exercises before moving to next one
          setPhase('exercise-rest');
        }
      } else {
        // Move to rest phase between sets
        setPhase('rest');
      }
    } catch (error) {
      console.error('Error completing set:', error);
      alert('Failed to complete set. Please try again.');
    }
  };

  const handleRestComplete = () => {
    // Move to next set
    setCurrentSetIndex(currentSetIndex + 1);
    setInputValue('');
    setNextSetPreview(null); // Clear preview when moving to next set
    setPhase('exercise');
  };

  const handleExerciseRestComplete = () => {
    // Move to next exercise
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSetIndex(0);
    setInputValue('');
    setPhase('exercise');
  };

  const handleCompleteWorkout = async () => {
    try {
      const historyEntry = await completeWorkout();
      navigate('/workout-complete', { state: { workout: historyEntry } });
    } catch (error) {
      console.error('Error completing workout:', error);
      alert('Failed to complete workout. Please try again.');
    }
  };

  const handleQuit = () => {
    if (confirm('Are you sure you want to quit this workout? Your progress will be saved.')) {
      navigate('/');
    }
  };

  if (phase === 'rest' || phase === 'exercise-rest') {
    const isExerciseRest = phase === 'exercise-rest';
    const nextExercise = isExerciseRest
      ? currentWorkout.exercises[currentExerciseIndex + 1]
      : null;
    const nextExerciseInfo = nextExercise
      ? getExerciseById(nextExercise.exerciseId)
      : null;

    return (
      <div className="bg-background min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-dark text-background p-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-display font-bold tracking-wide">WORKOUT #{currentWorkout.workoutNumber}</h1>
            <button onClick={handleQuit} className="text-sm font-semibold underline hover:opacity-80 transition">
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
            duration={isExerciseRest ? 60 : currentExercise.restTime}
            onComplete={isExerciseRest ? handleExerciseRestComplete : handleRestComplete}
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
                    ? `Exercise ${currentExerciseIndex + 2} of ${currentWorkout.exercises.length}`
                    : `Set ${currentSetIndex + 2} of ${currentExercise.sets.length}`}
                </div>
              </div>
              <div className="text-lg font-bold text-primary">
                {isExerciseRest
                  ? (nextExerciseInfo?.type === 'reps'
                      ? `${nextExercise?.sets[0]?.targetReps} reps`
                      : `${nextExercise?.sets[0]?.targetDuration}s`)
                  : (exercise?.type === 'reps'
                      ? `${nextSetPreview?.reps || currentExercise.sets[currentSetIndex + 1]?.targetReps} reps`
                      : `${nextSetPreview?.duration || currentExercise.sets[currentSetIndex + 1]?.targetDuration}s`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-background p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-display font-bold tracking-wide">WORKOUT #{currentWorkout.workoutNumber}</h1>
          <button onClick={handleQuit} className="text-sm font-semibold underline hover:opacity-80 transition">
            Quit
          </button>
        </div>
        <div className="w-full bg-background/30 rounded-full h-2">
          <div
            className="bg-background h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm opacity-80 mt-2">
          {completedSets} of {totalSets} sets completed
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* First Time Exercise Banner */}
        {isFirstTime && currentSetIndex === 0 && (
          <div className="bg-accent/10 border-l-4 border-accent p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-accent mb-1">
                  First Time Doing This Exercise!
                </h3>
                <div className="text-sm text-text space-y-1">
                  <p>
                    {exercise?.type === 'reps'
                      ? 'Do as many reps as you can with proper form, then enter that number.'
                      : 'Hold the position for as long as you can with proper form, then enter the duration in seconds.'}
                  </p>
                  <p className="font-semibold">
                    💡 Important: Don't push yourself too hard on the first set! Stop at a comfortable level that you can repeat for multiple sets. The app will adjust future targets based on your performance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bilateral Exercise Banner */}
        {currentExercise.exerciseId === 'side-plank-001' && currentSetIndex === 0 && (
          <div className="bg-secondary/10 border-l-4 border-secondary p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">⏱️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-secondary mb-1">
                  Both Sides Required
                </h3>
                {isFirstTime ? (
                  <div className="text-sm text-text space-y-2">
                    <p><strong>Important:</strong> Do this exercise on BOTH sides (left and right).</p>
                    <p>• Don't push yourself too hard on the first set - stop at a comfortable level that you can repeat for multiple sets</p>
                    <p>• Use the timer for ONE side, then manually reset and do the other side</p>
                    <p>• Enter the <strong>time per side</strong> (not total time) when done</p>
                    <p>• Future sets will automatically run the timer twice</p>
                  </div>
                ) : (
                  <p className="text-sm text-text">
                    The timer will run twice - once for your left side, then once for your right side. There will be a 10-second break to switch positions.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Exercise Info */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-text mb-1">{currentExercise.exerciseName}</h2>
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
                {currentExerciseIndex + 1} / {currentWorkout.exercises.length}
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
                {exercise?.type === 'reps'
                  ? `${currentSet.targetReps} reps`
                  : `${currentSet.targetDuration}s`}
              </div>
            )}
          </div>

          {/* Timer for timed exercises */}
          {exercise?.type === 'timed' && (
            <div className="mb-4">
              <Timer
                key={`timer-${currentExerciseIndex}-${currentSetIndex}`}
                duration={currentSet.targetDuration || 30}
                countUp={isFirstTime && currentSetIndex === 0}
                showSecondsOnly={isFirstTime && currentSetIndex === 0}
                bilateral={currentExercise.exerciseId === 'side-plank-001' && !(isFirstTime && currentSetIndex === 0)}
              />
            </div>
          )}

          {/* Input for actual performance */}
          <div className="mb-4">
            <Input
              type="number"
              label={
                exercise?.type === 'reps'
                  ? 'How many reps did you complete?'
                  : currentExercise.exerciseId === 'side-plank-001'
                    ? 'How many seconds did you hold PER SIDE?'
                    : 'How many seconds did you hold?'
              }
              placeholder={
                isFirstTime
                  ? (exercise?.type === 'reps' ? 'Enter reps' : 'Enter seconds per side')
                  : (exercise?.type === 'reps'
                    ? `Target: ${currentSet.targetReps}`
                    : `Target: ${currentSet.targetDuration}s`)
              }
              value={inputValue}
              onChange={handleInputChange}
              min="1"
            />
          </div>

          <Button onClick={handleCompleteSet} fullWidth>
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
      </div>

      {/* Exercise Modal */}
      {showExerciseModal && exercise && (
        <ExerciseModal
          exercise={exercise}
          onClose={() => setShowExerciseModal(false)}
        />
      )}
    </div>
  );
}
