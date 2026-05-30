/**
 * WorkoutExecution Page
 * Manages the workout execution flow including exercise progression,
 * rest periods, intensity feedback, and workout completion.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../store/workout-store';
import { useUserStore } from '../store/user-store';
import { getExerciseById } from '../data/exerciseData';
import { db } from '../db/db';
import { useWakeLock } from '../hooks/useWakeLock';
import { IntensityRating } from '../types/workout';
import { checkWorkoutAchievements } from '../lib/achievement-tracker';
import WorkoutHeader from '../components/workout/WorkoutHeader';
import RestPhase from '../components/workout/RestPhase';
import ExercisePhase from '../components/workout/ExercisePhase';
import IntensityFeedback from '../components/workout/IntensityFeedback';

type WorkoutPhase = 'exercise' | 'rest' | 'exercise-rest' | 'intensity-feedback';

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

  // Store intensity feedback for each exercise (keyed by exercise ID)
  const [intensityFeedbackMap, setIntensityFeedbackMap] = useState<Record<string, IntensityRating>>({});

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
      // Handle legacy phases that don't include intensity-feedback
      const savedPhase = currentWorkout.currentPhase as WorkoutPhase;
      setPhase(savedPhase);
    }

    setIsInitialized(true);
  }, [currentWorkout, navigate, isInitialized]);

  // Save position whenever it changes (but avoid infinite loop)
  useEffect(() => {
    if (!currentWorkout || !isInitialized) return;

    // Only save standard phases to workout position (not intensity-feedback)
    const phaseToSave = phase === 'intensity-feedback' ? 'exercise-rest' : phase;

    // Only update if position actually changed
    const positionChanged =
      currentWorkout.currentExerciseIndex !== currentExerciseIndex ||
      currentWorkout.currentSetIndex !== currentSetIndex ||
      currentWorkout.currentPhase !== phaseToSave;

    if (positionChanged) {
      updateWorkoutPosition(currentExerciseIndex, currentSetIndex, phaseToSave as 'exercise' | 'rest' | 'exercise-rest');
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

      // Move to next phase
      if (isLastSetOfExercise) {
        // Show intensity feedback after completing all sets of an exercise
        setPhase('intensity-feedback');
      } else {
        // Move to rest phase between sets
        setPhase('rest');
      }
    } catch (error) {
      console.error('Error completing set:', error);
      alert('Failed to complete set. Please try again.');
    }
  };

  const handleIntensityFeedback = (rating: IntensityRating) => {
    const exerciseId = currentExercise.exerciseId;

    // Store the feedback for this exercise (keyed by exercise ID for robustness)
    setIntensityFeedbackMap(prev => ({
      ...prev,
      [exerciseId]: rating,
    }));

    const isLastExercise = currentExerciseIndex === currentWorkout.exercises.length - 1;

    if (isLastExercise) {
      // Complete the workout with all feedback
      handleCompleteWorkout({
        ...intensityFeedbackMap,
        [exerciseId]: rating,
      });
    } else {
      // Move to rest between exercises
      setPhase('exercise-rest');
    }
  };

  const handleRestComplete = () => {
    // Move to next set
    setCurrentSetIndex(currentSetIndex + 1);
    setNextSetPreview(null);
    setPhase('exercise');
  };

  const handleExerciseRestComplete = () => {
    // Move to next exercise
    setCurrentExerciseIndex(currentExerciseIndex + 1);
    setCurrentSetIndex(0);
    setPhase('exercise');
  };

  const handleCompleteWorkout = async (feedbackMap: Record<string, IntensityRating>) => {
    try {
      const historyEntry = await completeWorkout(feedbackMap);

      // Check for new achievements (unlocks/retirements)
      const { profile, addUnlockedExercises, addRetiredExercises } = useUserStore.getState();
      const achievements = profile?.exerciseAchievements ?? {
        unlockedExercises: [],
        retiredExercises: [],
      };

      // Get full workout history for achievement checking
      const fullHistory = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      const { newUnlocks, newRetirements, unlockReasons, retirementReasons } = checkWorkoutAchievements(
        historyEntry,
        fullHistory.filter(h => h.id !== historyEntry.id), // Exclude the one we just added
        achievements
      );

      // Save achievements
      if (newUnlocks.length > 0) {
        addUnlockedExercises(newUnlocks);
      }
      if (newRetirements.length > 0) {
        addRetiredExercises(newRetirements);
      }

      // Build state to pass through the completion flow
      const completionState = {
        workout: historyEntry,
        unlockReasons: unlockReasons.length > 0 ? unlockReasons : undefined,
        retirementReasons: retirementReasons.length > 0 ? retirementReasons : undefined,
      };

      // New flow: stretching first (if enabled), then workout complete
      const autoShowStretching = profile?.preferences?.autoShowStretching ?? true;
      if (autoShowStretching) {
        navigate('/stretching', {
          state: {
            workoutId: historyEntry.workoutId,
            completionState,
            targetMuscleGroup: currentWorkout.targetMuscleGroup,
          },
        });
      } else {
        navigate('/workout-complete', { state: completionState });
      }
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

  // Intensity Feedback Phase
  if (phase === 'intensity-feedback') {
    return (
      <IntensityFeedback
        exerciseName={currentExercise.exerciseName}
        emoji={exercise?.emoji}
        onSubmit={handleIntensityFeedback}
      />
    );
  }

  // Rest Phase (between sets or exercises)
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

  // Exercise Phase
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
