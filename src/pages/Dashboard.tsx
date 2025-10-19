import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { db } from '../db/db';
import Button from '../components/common/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { currentWorkout, loadWorkouts, generateNewWorkout, startWorkout, loadHistory, workoutHistory } =
    useWorkoutStore();
  const [newExerciseIds, setNewExerciseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load current workout and history
    loadWorkouts();
    loadHistory();
  }, [profile, loadWorkouts, loadHistory]);

  // Check which exercises in current workout are new
  useEffect(() => {
    const checkNewExercises = async () => {
      if (!currentWorkout) {
        setNewExerciseIds(new Set());
        return;
      }

      const history = await db.history.toArray();
      const newIds = new Set<string>();

      for (const exercise of currentWorkout.exercises) {
        const hasBeenDone = history.some(workout =>
          workout.exercises.some(ex => ex.exerciseId === exercise.exerciseId)
        );
        if (!hasBeenDone) {
          newIds.add(exercise.exerciseId);
        }
      }

      setNewExerciseIds(newIds);
    };

    checkNewExercises();
  }, [currentWorkout]);

  const handleGenerateWorkout = async () => {
    try {
      await generateNewWorkout();
    } catch (error) {
      console.error('Error generating workout:', error);
      alert('Failed to generate workout. Please try again.');
    }
  };

  const handleStartWorkout = async () => {
    if (!currentWorkout) return;

    try {
      await startWorkout(currentWorkout.id);
      navigate('/workout');
    } catch (error) {
      console.error('Error starting workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  };

  if (!profile) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  // Calculate workouts this week and month
  const now = new Date();
  const startOfWeek = new Date(now);
  // Start of week (Monday) - getDay() returns 0 for Sunday, 1 for Monday, etc.
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days to Monday
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfWeek
  ).length;

  const workoutsThisMonth = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfMonth
  ).length;

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="bg-background-light rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Workouts</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutHistory.length}</div>
              <div className="text-sm text-text-muted font-medium">Total</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutsThisWeek}</div>
              <div className="text-sm text-text-muted font-medium">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutsThisMonth}</div>
              <div className="text-sm text-text-muted font-medium">This Month</div>
            </div>
          </div>
        </div>

        {/* Next Workout */}
        {currentWorkout ? (
          <div className="bg-background-light rounded-lg shadow-lg p-6 border-l-4 border-primary">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-display font-bold text-text-bright">
                WORKOUT #{currentWorkout.workoutNumber}
              </h2>
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {currentWorkout.estimatedDuration} min
              </span>
            </div>

            {/* Exercise List */}
            <div className="space-y-3 mb-6">
              {currentWorkout.exercises.map((exercise, index) => {
                const firstSet = exercise.sets[0];
                const isNew = newExerciseIds.has(exercise.exerciseId);
                const targetValue = firstSet.targetReps
                  ? `${firstSet.targetReps} reps`
                  : `${firstSet.targetDuration}s`;

                return (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-background-lighter rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-text">{exercise.exerciseName}</div>
                        {isNew && (
                          <span className="text-xs bg-accent text-background px-2 py-0.5 rounded-full font-bold">
                            NEW!
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-muted">
                        {isNew
                          ? `${exercise.sets.length} sets`
                          : `${exercise.sets.length} sets × ${targetValue}`
                        }
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {exercise.muscleGroups.map((mg, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary text-background px-2 py-1 rounded-full uppercase"
                        >
                          {mg}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleStartWorkout} fullWidth>
              {currentWorkout.status === 'in-progress' ? 'Continue' : 'Start'}
            </Button>
          </div>
        ) : (
            <Button onClick={handleGenerateWorkout} fullWidth>
              New Workout
            </Button>
        )}
      </div>
    </div>
  );
}
