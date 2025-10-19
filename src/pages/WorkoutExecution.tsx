import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../store/workout-store';
import { getExerciseById } from '../data/exerciseData';
import { db } from '../db/db';
import { useWakeLock } from '../hooks/useWakeLock';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Timer from '../components/workout/Timer';

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

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

    // Initialize input value when changing sets
    const currentExercise = currentWorkout.exercises[currentExerciseIndex];
    const currentSet = currentExercise?.sets[currentSetIndex];

    if (currentSet) {
      // Only pre-fill if there's an actual value, otherwise use target value
      const value = currentSet.actualReps || currentSet.actualDuration ||
                    currentSet.targetReps || currentSet.targetDuration || '';
      setInputValue(value.toString());
    }
  }, [currentExerciseIndex, currentSetIndex, isInitialized]); // Remove currentWorkout from dependencies

  // Save position whenever it changes
  useEffect(() => {
    if (!currentWorkout || !isInitialized) return;

    updateWorkoutPosition(currentExerciseIndex, currentSetIndex, phase);
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

  const handleInputBlur = async () => {
    const value = parseInt(inputValue);
    if (!value || value <= 0) return;

    try {
      if (exercise?.type === 'reps') {
        await updateSet(currentExerciseIndex, currentSetIndex, {
          actualReps: value,
        });
      } else {
        await updateSet(currentExerciseIndex, currentSetIndex, {
          actualDuration: value,
        });
      }
    } catch (error) {
      console.error('Error updating set:', error);
    }
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

      // Adjust remaining sets based on user's actual performance
      const target = exercise?.type === 'reps' ? currentSet.targetReps : currentSet.targetDuration;
      if (target) {
        // If user significantly exceeded target (>20%), adjust remaining sets upward
        // If user did less than target, adjust remaining sets downward
        const shouldAdjust = value < target || value > target * 1.2;

        if (shouldAdjust) {
          // Update all remaining sets in this exercise to match actual performance
          for (let i = currentSetIndex + 1; i < currentExercise.sets.length; i++) {
            if (exercise?.type === 'reps') {
              await updateSet(currentExerciseIndex, i, { targetReps: value });
            } else {
              await updateSet(currentExerciseIndex, i, { targetDuration: value });
            }
          }
        }
      }

      // Check if this is the last set of the current exercise
      const isLastSetOfExercise = currentSetIndex === currentExercise.sets.length - 1;
      const isLastExercise = currentExerciseIndex === currentWorkout.exercises.length - 1;

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
    setPhase('exercise');
  };

  const handleExerciseRestComplete = () => {
    // Move to next exercise
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSetIndex(0);
    setInputValue('');
    setPhase('exercise');
  };

  const handleSkipRest = () => {
    if (phase === 'exercise-rest') {
      handleExerciseRestComplete();
    } else {
      handleRestComplete();
    }
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
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold">Workout #{currentWorkout.workoutNumber}</h1>
            <button onClick={handleQuit} className="text-sm underline">
              Quit
            </button>
          </div>
          <div className="w-full bg-white/30 rounded-full h-2">
            <div
              className="bg-white h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Rest Timer */}
        <div className="p-4">
          <div className="bg-white rounded-lg shadow p-6 text-center mb-6">
            <div className="text-6xl mb-4">😌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Rest Time</h2>
            <p className="text-gray-600 mb-6">
              {isExerciseRest
                ? 'Great work! Take a break before the next exercise'
                : 'Take a break before your next set'}
            </p>
          </div>

          <Timer
            duration={isExerciseRest ? 60 : currentExercise.restTime}
            onComplete={isExerciseRest ? handleExerciseRestComplete : handleRestComplete}
            autoStart={true}
            hideControls={false}
          />

          <div className="mt-4">
            <Button onClick={handleSkipRest} variant="secondary" fullWidth>
              Skip Rest
            </Button>
          </div>

          {/* Next Set/Exercise Preview */}
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Up Next:</h3>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium text-gray-800">
                  {isExerciseRest ? nextExercise?.exerciseName : currentExercise.exerciseName}
                </div>
                <div className="text-sm text-gray-600">
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
                      ? `${currentExercise.sets[currentSetIndex + 1]?.targetReps} reps`
                      : `${currentExercise.sets[currentSetIndex + 1]?.targetDuration}s`)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white p-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-bold">Workout #{currentWorkout.workoutNumber}</h1>
          <button onClick={handleQuit} className="text-sm underline">
            Quit
          </button>
        </div>
        <div className="w-full bg-white/30 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-white/80 mt-2">
          {completedSets} of {totalSets} sets completed
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* First Time Exercise Banner */}
        {isFirstTime && currentSetIndex === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 mb-1">
                  First Time Doing This Exercise!
                </h3>
                <p className="text-sm text-blue-700">
                  {exercise?.type === 'reps'
                    ? 'Do as many reps as you can with proper form, then enter that number. The app will adjust future targets based on your performance.'
                    : 'Hold the position for as long as you can with proper form, then enter the duration in seconds. The app will adjust future targets based on your performance.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{currentExercise.exerciseName}</h2>
              <div className="flex gap-2">
                {currentExercise.muscleGroups.map((mg, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-primary text-white px-2 py-1 rounded-full uppercase"
                  >
                    {mg}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Exercise</div>
              <div className="text-lg font-bold text-primary">
                {currentExerciseIndex + 1} / {currentWorkout.exercises.length}
              </div>
            </div>
          </div>

        </div>

        {/* Current Set */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Set {currentSetIndex + 1} of {currentExercise.sets.length}
            </h3>
            <div className="text-sm text-gray-600">
              Target:{' '}
              {exercise?.type === 'reps'
                ? `${currentSet.targetReps} reps`
                : `${currentSet.targetDuration}s`}
            </div>
          </div>

          {/* Timer for timed exercises */}
          {exercise?.type === 'timed' && (
            <div className="mb-4">
              <Timer
                duration={currentSet.targetDuration || 30}
                countUp={isFirstTime}
                showSecondsOnly={isFirstTime}
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
                  : 'How many seconds did you hold?'
              }
              placeholder={
                exercise?.type === 'reps'
                  ? `Target: ${currentSet.targetReps}`
                  : `Target: ${currentSet.targetDuration}s`
              }
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              min="1"
            />
          </div>

          <Button onClick={handleCompleteSet} fullWidth>
            Complete Set
          </Button>
        </div>

        {/* All Sets Progress */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Set Progress</h3>
          <div className="flex gap-2">
            {currentExercise.sets.map((set, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  set.completed
                    ? 'bg-primary'
                    : index === currentSetIndex
                    ? 'bg-primary/50'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Exercise Instructions Toggle */}
        <div className="bg-white rounded-lg shadow p-4">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-medium text-gray-700">
              {showInstructions ? 'Hide' : 'Show'} Exercise Instructions
            </span>
            <span className="text-primary">{showInstructions ? '▼' : '▶'}</span>
          </button>

          {showInstructions && (
            <div className="mt-4 space-y-3">
              {exercise?.description && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{exercise.description}</p>
                </div>
              )}

              {exercise?.videoUrl && (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:text-primary-dark"
                >
                  <span className="mr-2">▶</span>
                  Watch video tutorial
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
