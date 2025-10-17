import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/common/Button';
import { WorkoutHistoryEntry } from '../types/workout';

export default function WorkoutComplete() {
  const navigate = useNavigate();
  const location = useLocation();
  const workout = location.state?.workout as WorkoutHistoryEntry | undefined;

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

  // Calculate total sets and reps
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
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark text-white p-4 flex items-center justify-center">
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

      <div className="max-w-md w-full space-y-6">
        {/* Success Icon & Message */}
        <div className="text-center">
          <div className="text-8xl mb-4 animate-bounce">🏆</div>
          <h1 className="text-3xl font-bold mb-2">Workout Complete!</h1>
          <p className="text-white/80">
            Amazing work! You crushed workout #{workout.workoutNumber}
          </p>
        </div>

        {/* Workout Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Workout Summary</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{workout.totalDuration}</div>
              <div className="text-sm text-white/80">minutes</div>
            </div>

            {/* Total Sets */}
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{totalSets}</div>
              <div className="text-sm text-white/80">sets</div>
            </div>

            {/* Total Reps */}
            {totalReps > 0 && (
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">{totalReps}</div>
                <div className="text-sm text-white/80">total reps</div>
              </div>
            )}

            {/* Timed Duration */}
            {totalTimedSeconds > 0 && (
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold">
                  {Math.round(totalTimedSeconds)}s
                </div>
                <div className="text-sm text-white/80">time under tension</div>
              </div>
            )}
          </div>
        </div>

        {/* Exercises Completed */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">Exercises Completed</h3>
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
        </div>

        {/* Motivational Message */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
          <p className="text-lg font-medium">
            {getMotivationalMessage(workout.workoutNumber)}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/')}
            fullWidth
            className="bg-white text-primary hover:bg-white/90"
          >
            Back to Dashboard
          </Button>
          <Button
            onClick={() => navigate('/history')}
            variant="secondary"
            fullWidth
            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          >
            View History
          </Button>
        </div>
      </div>
    </div>
  );
}

function getMotivationalMessage(workoutNumber: number): string {
  const messages = [
    "You're building stronger habits every day!",
    "Consistency is key - keep it up!",
    "Your body is getting stronger with each workout!",
    "Progress over perfection - well done!",
    "You showed up and did the work - that's what matters!",
    "Every rep brings you closer to your goals!",
    "You're investing in your health - amazing!",
    "Keep pushing forward, you've got this!",
  ];

  // Rotate through messages based on workout number
  return messages[workoutNumber % messages.length];
}
