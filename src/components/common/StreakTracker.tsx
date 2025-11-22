import { useUserStore } from '../../store/user-store';
import { useWorkoutStore } from '../../store/workout-store';
import { calculateStreak, getNextWorkoutMessage } from '../../utils/streakCalculator';

export default function StreakTracker() {
  const profile = useUserStore((state) => state.profile);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);

  if (!profile?.calibrationCompleted) {
    return null;
  }

  const frequencyDays = profile.workoutFrequencyDays || 2; // Default: work out every 2 days
  const streakInfo = calculateStreak(workoutHistory, frequencyDays);

  // Get friendly time message
  const getLastWorkoutText = () => {
    if (streakInfo.daysSinceLastWorkout === null) {
      return 'No workouts yet';
    }
    if (streakInfo.daysSinceLastWorkout === 0) {
      return 'Today';
    }
    if (streakInfo.daysSinceLastWorkout === 1) {
      return '1 day ago';
    }
    return `${streakInfo.daysSinceLastWorkout} days ago`;
  };

  return (
    <div className="mb-6">
      {/* Last Workout */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">Last workout</span>
        <span className={`text-sm font-medium ${
          streakInfo.streakAtRisk ? 'text-yellow-400' : 'text-text'
        }`}>
          {getLastWorkoutText()}
        </span>
      </div>

      {/* Streak Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${
            streakInfo.currentStreak > 0 ? 'text-primary' : 'text-text-muted'
          }`}>
            {streakInfo.currentStreak}
          </span>
          <span className="text-sm text-text-muted">workout streak</span>
        </div>

        {streakInfo.longestStreak > streakInfo.currentStreak && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-secondary">
              {streakInfo.longestStreak}
            </span>
            <span className="text-xs text-text-muted">best</span>
          </div>
        )}
      </div>

      {/* Next Workout Message */}
      {streakInfo.currentStreak > 0 && (
        <div className={`text-xs ${
          streakInfo.streakAtRisk ? 'text-yellow-400' : 'text-text-muted'
        }`}>
          {getNextWorkoutMessage(streakInfo, frequencyDays)}
          {streakInfo.streakAtRisk && ' 🔥'}
        </div>
      )}
    </div>
  );
}
