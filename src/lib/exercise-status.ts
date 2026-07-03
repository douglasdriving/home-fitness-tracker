import { Exercise } from '../types/exercise';
import { ExerciseAchievements } from '../types/user';
import { WorkoutHistoryEntry } from '../types/workout';
import { allExercises, getExerciseById } from '../data/exerciseData';
import { getBestPerformance } from './exercise-performance';
import { isExerciseUnlocked } from './exercise-unlock-tracker';

export type ExerciseStatus = 'active' | 'locked' | 'retired';

export interface ExerciseWithStatus extends Exercise {
  status: ExerciseStatus;
  unlockProgress?: {
    currentValue: number;
    requiredValue: number;
    requiredExerciseName: string;
  };
  needsEquipment?: boolean; // true when exercise requires equipment the user doesn't have
}

/**
 * Get the status of all exercises based on user achievements and history
 */
export function getExerciseStatuses(
  workoutHistory: WorkoutHistoryEntry[],
  achievements: ExerciseAchievements,
  hasElasticBands: boolean
): ExerciseWithStatus[] {
  return allExercises
    .map(exercise => {
      // Check if exercise requires equipment the user doesn't have
      if (exercise.equipment === 'elastic-band' && !hasElasticBands) {
        return { ...exercise, status: 'locked' as const, needsEquipment: true };
      }

      // Check if retired
      if (achievements.retiredExercises.includes(exercise.id)) {
        return { ...exercise, status: 'retired' as const };
      }

      // Check if locked
      if (exercise.unlockRequirement) {
        const isUnlocked = isExerciseUnlocked(
          exercise,
          workoutHistory,
          achievements.unlockedExercises
        );

        if (!isUnlocked) {
          // Calculate progress toward unlock
          const reqExercise = getExerciseById(exercise.unlockRequirement.exerciseId);
          const bestPerf = getBestPerformance(exercise.unlockRequirement.exerciseId, workoutHistory);

          let currentValue = 0;
          if (bestPerf) {
            currentValue = exercise.unlockRequirement.type === 'reps'
              ? (bestPerf.reps ?? 0)
              : (bestPerf.duration ?? 0);
          }

          return {
            ...exercise,
            status: 'locked' as const,
            unlockProgress: {
              currentValue,
              requiredValue: exercise.unlockRequirement.value,
              requiredExerciseName: reqExercise?.name ?? 'Unknown',
            },
          };
        }
      }

      // Otherwise active
      return { ...exercise, status: 'active' as const };
    });
}

/**
 * Get exercises available for workout generation
 * Filters out locked and retired exercises
 */
export function getAvailableExercises(
  workoutHistory: WorkoutHistoryEntry[],
  achievements: ExerciseAchievements,
  hasElasticBands: boolean,
  excludedExerciseIds: string[] = []
): Exercise[] {
  const statuses = getExerciseStatuses(workoutHistory, achievements, hasElasticBands);

  return statuses
    .filter(ex => ex.status === 'active')
    .filter(ex => !excludedExerciseIds.includes(ex.id))
    .map((ex): Exercise => ({
      id: ex.id,
      name: ex.name,
      emoji: ex.emoji,
      primaryMuscleGroup: ex.primaryMuscleGroup,
      muscleGroups: ex.muscleGroups,
      upperBodySlot: ex.upperBodySlot,
      posteriorChainSlot: ex.posteriorChainSlot,
      description: ex.description,
      videoUrl: ex.videoUrl,
      imageUrl: ex.imageUrl,
      source: ex.source,
      heavinessScore: ex.heavinessScore,
      type: ex.type,
      defaultReps: ex.defaultReps,
      defaultDuration: ex.defaultDuration,
      equipment: ex.equipment,
      countingMethod: ex.countingMethod,
      unlockRequirement: ex.unlockRequirement,
      retirementThreshold: ex.retirementThreshold,
      coachingTip: ex.coachingTip,
      structure: ex.structure,
      mcgillDefaults: ex.mcgillDefaults,
      ladder: ex.ladder,
    }));
}
