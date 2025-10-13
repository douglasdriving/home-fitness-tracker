import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import Button from '../components/common/Button';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { currentWorkout, loadWorkouts, generateNewWorkout, startWorkout, loadHistory, workoutHistory } =
    useWorkoutStore();

  useEffect(() => {
    // Load current workout and history
    loadWorkouts();
    loadHistory();
  }, [profile, loadWorkouts, loadHistory]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
  startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfWeek
  ).length;

  const workoutsThisMonth = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfMonth
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-6">
        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{workoutHistory.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{workoutsThisWeek}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{workoutsThisMonth}</div>
              <div className="text-sm text-gray-600">This Month</div>
            </div>
          </div>
        </div>

        {/* Next Workout */}
        {currentWorkout ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Workout #{currentWorkout.workoutNumber}
              </h2>
              <span className="text-sm text-gray-600">
                {currentWorkout.estimatedDuration} min
              </span>
            </div>

            {/* Exercise List */}
            <div className="space-y-3 mb-6">
              {currentWorkout.exercises.map((exercise, index) => {
                const firstSet = exercise.sets[0];
                const targetValue = firstSet.targetReps
                  ? `${firstSet.targetReps} reps`
                  : `${firstSet.targetDuration}s`;

                return (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-800">{exercise.exerciseName}</div>
                      <div className="text-sm text-gray-600">
                        {exercise.sets.length} sets × {targetValue}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {exercise.muscleGroups.map((mg, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary text-white px-2 py-1 rounded-full uppercase"
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
              {currentWorkout.status === 'in-progress' ? 'Continue Workout' : 'Start Workout'}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-6xl mb-4">{workoutHistory.length === 0 ? '👋' : '🏋️'}</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {workoutHistory.length === 0 ? 'Welcome to your Fitness Journey!' : 'Ready for your next workout?'}
            </h2>
            <p className="text-gray-600 mb-6">
              {workoutHistory.length === 0
                ? "Let's get started! We'll generate your first personalized workout with exercises tailored to your fitness level. The app will learn and adapt as you progress."
                : 'Generate a personalized workout based on your current strength levels.'}
            </p>
            <Button onClick={handleGenerateWorkout} fullWidth>
              {workoutHistory.length === 0 ? 'Start Your First Workout' : 'Generate New Workout'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
