/**
 * WorkoutExecution Page
 * Manages the workout execution flow including exercise progression,
 * rest periods, and workout completion. Orchestrates state and delegates
 * rendering to specialized phase components.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../store/workout-store';
import { getExerciseById } from '../data/exerciseData';
import { db } from '../db/db';
import { useWakeLock } from '../hooks/useWakeLock';
import WorkoutHeader from '../components/workout/WorkoutHeader';
import RestPhase from '../components/workout/RestPhase';
import ExercisePhase from '../components/workout/ExercisePhase';

type WorkoutPhase = 'exercise' | 'rest' | 'exercise-rest';

export default function WorkoutExecution() {
  const navigate = useNavigate();
  const { currentWorkout, updateSet, completeWorkout, updateWorkoutPosition } = useWorkoutStore();

  // Keep screen awake during workout
  useWakeLock();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [phase, setPhase] = useState<WorkoutPhase>('exercise');
  const [previousNote, setPreviousNote] = useState('');
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

  // Check if this is the first time doing this exercise and load previous note
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

      // Load previous note for this exercise
      const noteRecord = await db.exerciseNotes.get(exerciseId);
      if (noteRecord) {
        setPreviousNote(noteRecord.note);
      } else {
        setPreviousNote('');
      }
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

  const handleCompleteSet = async (value: number, equipment: string, note: string) => {
    try {
      // Save exercise note if it has been updated
      if (note.trim() && note !== previousNote) {
        await db.exerciseNotes.put({
          exerciseId: currentExercise.exerciseId,
          note: note.trim(),
          lastUpdated: Date.now()
        });
        setPreviousNote(note.trim());
      }

      // Mark set as completed and update actual values
      const updates = {
        completed: true,
        ...(exercise?.type === 'reps'
          ? { actualReps: value }
          : { actualDuration: value }),
        ...(equipment.trim() && { equipmentUsed: equipment.trim() }),
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
    setNextSetPreview(null); // Clear preview when moving to next set
    setPhase('exercise');
  };

  const handleExerciseRestComplete = () => {
    // Move to next exercise
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSetIndex(0);
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
      <RestPhase
        workoutNumber={currentWorkout.workoutNumber}
        progress={progress}
        isExerciseRest={isExerciseRest}
        restDuration={isExerciseRest ? 60 : currentExercise.restTime}
        currentExercise={currentExercise}
        currentExerciseIndex={currentExerciseIndex}
        currentSetIndex={currentSetIndex}
        totalExercises={currentWorkout.exercises.length}
        nextExercise={nextExercise}
        nextExerciseInfo={nextExerciseInfo}
        nextSetPreview={nextSetPreview}
        exerciseData={exercise}
        onRestComplete={isExerciseRest ? handleExerciseRestComplete : handleRestComplete}
        onQuit={handleQuit}
      />
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <WorkoutHeader
        workoutNumber={currentWorkout.workoutNumber}
        progress={progress}
        completedSets={completedSets}
        totalSets={totalSets}
        onQuit={handleQuit}
      />

      <ExercisePhase
        currentExercise={currentExercise}
        currentSet={currentSet}
        currentExerciseIndex={currentExerciseIndex}
        currentSetIndex={currentSetIndex}
        totalExercises={currentWorkout.exercises.length}
        exercise={exercise!}
        isFirstTime={isFirstTime}
        previousNote={previousNote}
        onCompleteSet={handleCompleteSet}
      />
    </div>
  );
}
