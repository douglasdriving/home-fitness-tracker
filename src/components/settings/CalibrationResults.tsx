import { format } from 'date-fns';
import { useUserStore } from '../../store/user-store';
import { getExerciseById } from '../../data/exerciseData';

/**
 * Read-only display of the user's most recent calibration results. Renders
 * nothing until calibration has been completed and data exists.
 */
export default function CalibrationResults() {
  const { profile } = useUserStore();

  if (!profile?.calibrationData || !profile.calibrationCompleted) {
    return null;
  }

  return (
    <div className="border-b border-background-lighter pb-6">
      <h2 className="text-lg font-semibold text-text mb-4">Calibration Results</h2>
      <div className="mb-4 text-sm text-text-muted">
        Completed on {format(new Date(profile.calibrationData.calibrationDate), 'MMM d, yyyy')}
      </div>
      <div className="space-y-3">
        {profile.calibrationData.exercises.map((exercise, idx) => {
          const exerciseData = getExerciseById(exercise.exerciseId);
          return (
            <div key={idx} className="bg-background-light rounded-lg p-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-text">{exerciseData?.name}</div>
                  <div className="text-xs text-text-muted capitalize">{exercise.muscleGroup}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {exercise.achievedReps
                      ? `${exercise.achievedReps} reps`
                      : `${exercise.achievedDuration}s`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
