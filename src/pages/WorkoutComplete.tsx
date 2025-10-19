import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkoutHistoryEntry } from '../types/workout';
import { useWorkoutStore } from '../store/workout-store';

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const workout = location.state?.workout as WorkoutHistoryEntry | undefined;
  const { loadWorkouts } = useWorkoutStore();

  const [showConfetti, setShowConfetti] = useState(true);

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
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h2 className="text-4xl font-display font-bold mb-2 tracking-wide">WORKOUT COMPLETE!</h2>
          <p className="text-white/80 font-medium">Great job crushing it!</p>
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
          <h3 className="text-lg font-semibold mb-3">Exercises</h3>
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
        <button
          onClick={async () => {
            await loadWorkouts();
            navigate('/');
          }}
          className="w-full bg-white text-primary hover:bg-white/90 font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          🎉 Done
        </button>
      </div>
    </div>
  );
}

