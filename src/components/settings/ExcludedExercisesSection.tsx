import { useUserStore } from '../../store/user-store';
import { allExercises } from '../../data/exerciseData';

/**
 * Lists exercises the user has excluded from generated workouts, allowing them
 * to re-include each one. Renders nothing when no exercises are excluded.
 */
export default function ExcludedExercisesSection() {
  const { profile, includeExercise } = useUserStore();

  if (!profile?.excludedExercises || profile.excludedExercises.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-background-lighter pb-6">
      <h2 className="text-lg font-semibold text-text mb-4">Excluded Exercises</h2>
      <p className="text-sm text-text-muted mb-4">
        These exercises won't appear in your workouts. Tap to include them again.
      </p>
      <div className="space-y-2">
        {profile.excludedExercises.map((exerciseId) => {
          const exercise = allExercises.find((ex) => ex.id === exerciseId);
          if (!exercise) return null;
          return (
            <div
              key={exerciseId}
              className="flex items-center justify-between p-3 bg-background-light rounded-lg"
            >
              <div>
                <div className="font-medium text-text">{exercise.emoji} {exercise.name}</div>
                <div className="text-xs text-text-muted capitalize">
                  {exercise.muscleGroups.join(', ')}
                </div>
              </div>
              <button
                onClick={() => includeExercise(exerciseId)}
                className="px-3 py-1 text-sm bg-primary text-background rounded hover:bg-primary-light transition-colors"
              >
                Include
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
