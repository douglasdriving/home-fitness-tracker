import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkoutHistoryEntry } from '../types/workout';
import { useWorkoutStore } from '../store/workout-store';
import { useUserStore } from '../store/user-store';
import { totalStretchingDuration } from '../data/stretchingData';

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const workout = location.state?.workout as WorkoutHistoryEntry | undefined;
  const { loadWorkouts } = useWorkoutStore();
  const { profile } = useUserStore();

  const [showConfetti, setShowConfetti] = useState(true);
  const autoShowStretching = profile?.preferences?.autoShowStretching ?? true;

  useEffect(() => {
    if (!workout) {
      navigate('/');
      return;
    }

    // Hide confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [workout, navigate]);

  if (!workout) {
    return null;
  }

  // Calculate total sets, reps, and time (only from completed sets with actual values)
  const totalSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.completedSets.length,
    0
  );

  const totalReps = workout.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.completedSets.reduce(
        (exSum, set) => exSum + (set.actualReps || 0),
        0
      ),
    0
  );

  const totalTimedSeconds = workout.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.completedSets.reduce(
        (exSum, set) => exSum + (set.actualDuration || 0),
        0
      ),
    0
  );

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

      <div className="max-w-md w-full bg-gradient-to-br from-primary to-primary-dark text-white p-8 rounded-lg shadow-2xl space-y-6">
        {/* Success Icon & Message */}
        <div className="text-center">
          <h2 className="text-4xl font-display font-bold mb-2 tracking-wide">WORKOUT COMPLETE!</h2>
        </div>

        {/* Workout Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* Duration */}
            <div className="bg-white/10 rounded-lg p-4 text-center backdrop-blur">
              <div className="text-4xl font-display font-bold">{workout.totalDuration}</div>
              <div className="text-sm text-white/90 font-medium">minutes</div>
            </div>

            {/* Total Sets */}
            <div className="bg-white/10 rounded-lg p-4 text-center backdrop-blur">
              <div className="text-4xl font-display font-bold">{totalSets}</div>
              <div className="text-sm text-white/90 font-medium">sets</div>
            </div>

            {/* Total Reps */}
            {totalReps > 0 && (
              <div className="bg-white/10 rounded-lg p-4 text-center backdrop-blur">
                <div className="text-4xl font-display font-bold">{totalReps}</div>
                <div className="text-sm text-white/90 font-medium">total reps</div>
              </div>
            )}

            {/* Timed Duration */}
            {totalTimedSeconds > 0 && (
              <div className="bg-white/10 rounded-lg p-4 text-center backdrop-blur">
                <div className="text-4xl font-display font-bold">
                  {Math.round(totalTimedSeconds)}s
                </div>
                <div className="text-sm text-white/90 font-medium">time under tension</div>
              </div>
            )}
          </div>

        {/* Exercises Completed */}
          <div className="space-y-2">
            {workout.exercises.map((exercise, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-white/10 rounded px-3 py-2"
              >
                <span className="font-medium">{exercise.exerciseName}</span>
                <span className="text-white/80">
                  {exercise.completedSets.length} sets
                </span>
              </div>
            ))}
          </div>

        {/* Actions */}
        {autoShowStretching && (
          <div className="space-y-3">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur text-center">
              <h3 className="font-semibold mb-1">🧘 Post-Workout Stretching</h3>
              <p className="text-sm text-white/90">
                Complete a {Math.ceil(totalStretchingDuration / 60)}-minute stretching routine to improve flexibility and recovery
              </p>
            </div>

            <button
              onClick={() => {
                navigate('/stretching', { state: { workoutId: workout.id } });
              }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              🧘 Start Stretching Routine
            </button>

            <button
              onClick={async () => {
                await loadWorkouts();
                navigate('/');
              }}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Skip Stretching
            </button>
          </div>
        )}

        {!autoShowStretching && (
          <button
            onClick={async () => {
              await loadWorkouts();
              navigate('/');
            }}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            🎉 Done
          </button>
        )}
      </div>
    </div>
  );
}

