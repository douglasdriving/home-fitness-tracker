import { useEffect, useState } from 'react';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { getExerciseStatuses, ExerciseWithStatus } from '../lib/achievement-tracker';
import { MuscleGroup } from '../types/exercise';

type FilterTab = 'active' | 'locked' | 'retired';

export default function ExerciseStatus() {
  const { profile, restoreRetiredExercise } = useUserStore();
  const { workoutHistory, loadWorkouts } = useWorkoutStore();
  const [exercises, setExercises] = useState<ExerciseWithStatus[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('active');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadWorkouts();
      setIsLoading(false);
    };
    loadData();
  }, [loadWorkouts]);

  useEffect(() => {
    if (!profile) return;

    const achievements = profile.exerciseAchievements ?? {
      unlockedExercises: [],
      retiredExercises: [],
    };

    const hasElasticBands = profile.equipment?.hasElasticBands ?? false;
    const statuses = getExerciseStatuses(workoutHistory, achievements, hasElasticBands);
    setExercises(statuses);
  }, [profile, workoutHistory]);

  const filteredExercises = exercises.filter(ex => ex.status === activeTab);

  const counts = {
    active: exercises.filter(ex => ex.status === 'active').length,
    locked: exercises.filter(ex => ex.status === 'locked').length,
    retired: exercises.filter(ex => ex.status === 'retired').length,
  };

  const formatMuscleGroups = (groups: MuscleGroup[]) => {
    return groups.map(g => {
      if (g === 'lowerBack') return 'Lower Back';
      return g.charAt(0).toUpperCase() + g.slice(1);
    }).join(', ');
  };

  const handleRestore = (exerciseId: string) => {
    restoreRetiredExercise(exerciseId);
  };

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center pb-20">
        <div className="text-text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-20">
      <div className="p-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-background-lighter mb-4">
          {(['active', 'locked', 'retired'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
            </button>
          ))}
        </div>

        {/* Exercise List */}
        <div className="space-y-2">
          {filteredExercises.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              {activeTab === 'locked' && 'No locked exercises'}
              {activeTab === 'retired' && 'No retired exercises yet'}
              {activeTab === 'active' && 'No active exercises'}
            </div>
          ) : (
            filteredExercises.map(exercise => (
              <div
                key={exercise.id}
                className="bg-background-light rounded-lg p-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-text">{exercise.emoji} {exercise.name}</div>
                    <div className="text-xs text-text-muted mt-1">
                      {formatMuscleGroups(exercise.muscleGroups)}
                    </div>

                    {/* Unlock progress for locked exercises */}
                    {exercise.status === 'locked' && exercise.unlockProgress && (
                      <div className="mt-2">
                        <div className="text-xs text-text-muted">
                          {exercise.unlockProgress.currentValue}/{exercise.unlockProgress.requiredValue}{' '}
                          {exercise.unlockRequirement?.type === 'timed' ? 's' : ' reps'}{' '}
                          {exercise.unlockProgress.requiredExerciseName}
                        </div>
                        <div className="w-full bg-background-lighter rounded-full h-1.5 mt-1">
                          <div
                            className="bg-primary rounded-full h-1.5 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (exercise.unlockProgress.currentValue / exercise.unlockProgress.requiredValue) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Restore button for retired exercises */}
                  {exercise.status === 'retired' && (
                    <button
                      onClick={() => handleRestore(exercise.id)}
                      className="text-xs text-primary hover:text-primary-dark ml-2"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
