import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkoutHistoryEntry } from '../types/workout';
import { useWorkoutStore } from '../store/workout-store';
import { useUserStore } from '../store/user-store';
import {
  getBestPerformance,
  getExerciseStatuses,
  UnlockReason,
  RetirementReason,
} from '../lib/achievement-tracker';
import { allExercises, getExerciseEmoji } from '../data/exerciseData';
import { formatMcgillSet } from '../utils/mcgill-formatter';

interface WorkoutCompleteState {
  workout: WorkoutHistoryEntry;
  unlockReasons?: UnlockReason[];
  retirementReasons?: RetirementReason[];
}

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as WorkoutCompleteState | undefined;
  const workout = state?.workout;
  const unlockReasons = state?.unlockReasons ?? [];
  const retirementReasons = state?.retirementReasons ?? [];
  const { loadWorkouts, workoutHistory } = useWorkoutStore();
  const { profile } = useUserStore();

  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (!workout) {
      navigate('/');
      return;
    }

    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [workout, navigate]);

  if (!workout) {
    return null;
  }

  const achievements = profile?.exerciseAchievements ?? {
    unlockedExercises: [],
    retiredExercises: [],
  };
  const hasElasticBands = profile?.equipment?.hasElasticBands ?? false;

  // Get exercise statuses for unlock progress display
  const exerciseStatuses = getExerciseStatuses(workoutHistory, achievements, hasElasticBands);

  // Find locked exercises that are close to being unlocked (>=80% progress)
  // and related to exercises in this workout
  const exercisesInWorkout = new Set(workout.exercises.map(ex => ex.exerciseId));
  const nearUnlocks = exerciseStatuses.filter(ex => {
    if (ex.status !== 'locked' || !ex.unlockProgress) return false;
    // Only show if the prerequisite exercise was in this workout
    const prereqExercise = allExercises.find(
      e => e.id === ex.id && e.unlockRequirement
    );
    if (!prereqExercise?.unlockRequirement) return false;
    if (!exercisesInWorkout.has(prereqExercise.unlockRequirement.exerciseId)) return false;
    const progress = ex.unlockProgress.currentValue / ex.unlockProgress.requiredValue;
    return progress >= 0.5; // Show if at least 50% progress
  });

  const handleDone = async () => {
    await loadWorkouts();
    navigate('/');
  };

  return (
    <div className="bg-background min-h-screen p-4 pt-6 flex items-center justify-center">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              {['🎉', '✨', '🎊', '⭐', '💪', '🔥'][Math.floor(Math.random() * 6)]}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-md w-full space-y-4">
        {/* Header Card */}
        <div className="bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-lg shadow-2xl text-center">
          <h2 className="text-3xl font-display font-bold mb-1 tracking-wide">WORKOUT COMPLETE!</h2>
          <p className="text-white/80 text-sm">Workout #{workout.workoutNumber}</p>
        </div>

        {/* Milestones: Unlocked Exercises */}
        {unlockReasons.length > 0 && (
          <div className="bg-background-light rounded-lg p-4 shadow-lg border border-background-lighter">
            <h3 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
              <span>🔓</span> Unlocked
            </h3>
            <div className="space-y-2">
              {unlockReasons.map(reason => (
                <div
                  key={reason.unlockedExerciseId}
                  className="bg-background rounded px-3 py-2"
                >
                  <div className="text-text font-medium">{getExerciseEmoji(reason.unlockedExerciseId)} {reason.unlockedExerciseName}</div>
                  <div className="text-text-muted text-sm">
                    {reason.performanceType === 'reps'
                      ? `${reason.performanceValue} reps`
                      : `${reason.performanceValue}s`}{' '}
                    of {reason.prereqExerciseName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones: Retired/Mastered Exercises */}
        {retirementReasons.length > 0 && (
          <div className="bg-background-light rounded-lg p-4 shadow-lg border border-background-lighter">
            <h3 className="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
              <span>🏆</span> Mastered
            </h3>
            <div className="space-y-2">
              {retirementReasons.map(reason => (
                <div
                  key={reason.exerciseId}
                  className="bg-background rounded px-3 py-2"
                >
                  <div className="text-text font-medium">{getExerciseEmoji(reason.exerciseId)} {reason.exerciseName}</div>
                  <div className="text-text-muted text-sm">
                    Reached {reason.performanceType === 'reps'
                      ? `${reason.performanceValue} reps`
                      : `${reason.performanceValue}s`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per-Exercise Progression */}
        <div className="bg-background-light rounded-lg p-4 shadow-lg border border-background-lighter">
          <h3 className="text-sm font-semibold text-text-muted mb-3">Exercise Performance</h3>
          <div className="space-y-4">
            {workout.exercises.map((exercise) => {
              const bestPerf = getBestPerformance(exercise.exerciseId, workoutHistory);
              const isRepsExercise = exercise.completedSets.some(s => s.actualReps !== undefined);
              const bestValue = isRepsExercise ? bestPerf?.reps : bestPerf?.duration;
              const currentBest = isRepsExercise
                ? Math.max(...exercise.completedSets.map(s => s.actualReps ?? 0))
                : Math.max(...exercise.completedSets.map(s => s.actualDuration ?? 0));
              const isNewPB = bestValue !== undefined && currentBest > bestValue;

              return (
                <div key={exercise.exerciseId} className="bg-background rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-text font-medium">{getExerciseEmoji(exercise.exerciseId)} {exercise.exerciseName}</span>
                    {isNewPB && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
                        New PB!
                      </span>
                    )}
                  </div>

                  {/* Set-by-set results */}
                  <div className="flex gap-2 mb-2">
                    {exercise.completedSets.map((set) => {
                      let displayValue: string;
                      if (set.mcgillRounds && set.mcgillHoldDuration) {
                        displayValue = formatMcgillSet(set.mcgillRounds, set.mcgillHoldDuration);
                      } else {
                        const value = isRepsExercise ? set.actualReps : set.actualDuration;
                        displayValue = `${value}${isRepsExercise ? '' : 's'}`;
                      }
                      const value = isRepsExercise ? set.actualReps : set.actualDuration;
                      const isBestSet = value === currentBest && isNewPB;
                      return (
                        <div
                          key={set.setNumber}
                          className={`flex-1 text-center rounded py-1 text-sm ${
                            isBestSet
                              ? 'bg-primary/20 text-primary font-semibold'
                              : 'bg-background-lighter text-text-muted'
                          }`}
                        >
                          {displayValue}
                        </div>
                      );
                    })}
                  </div>

                  {/* Personal best comparison */}
                  {bestValue === undefined ? (
                    <div className="text-xs text-secondary">
                      First time completing this exercise!
                    </div>
                  ) : isNewPB ? (
                    <div className="text-xs text-primary">
                      Improved from previous best: {bestValue}{isRepsExercise ? ' reps' : 's'}
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted">
                      Personal best: {bestValue}{isRepsExercise ? ' reps' : 's'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Unlock Progress */}
        {nearUnlocks.length > 0 && (
          <div className="bg-background-light rounded-lg p-4 shadow-lg border border-background-lighter">
            <h3 className="text-sm font-semibold text-text-muted mb-3">Unlock Progress</h3>
            <div className="space-y-3">
              {nearUnlocks.map(ex => (
                <div key={ex.id} className="bg-background rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-text font-medium text-sm">{ex.emoji} {ex.name}</span>
                    <span className="text-xs text-text-muted">
                      {ex.unlockProgress!.currentValue}/{ex.unlockProgress!.requiredValue}
                    </span>
                  </div>
                  <div className="w-full bg-background-lighter rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (ex.unlockProgress!.currentValue / ex.unlockProgress!.requiredValue) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {ex.unlockProgress!.requiredExerciseName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={handleDone}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
