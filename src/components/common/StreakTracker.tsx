import { useUserStore } from '../../store/user-store';
import { useWorkoutStore } from '../../store/workout-store';
import { calculateStreak, getNextWorkoutMessage } from '../../utils/streakCalculator';

export default function StreakTracker() {
  const profile = useUserStore((state) => state.profile);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);

  if (!profile?.calibrationCompleted) {
    return null;
  }

  const streakInfo = calculateStreak(workoutHistory);

  return (
    <div className="mb-6">
      {/* Streak Display */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${
            streakInfo.currentStreak > 0 ? 'text-primary' : 'text-text-muted'
          }`}>
            {streakInfo.currentStreak}
          </span>
          <span className="text-sm text-text-muted">
            week{streakInfo.currentStreak !== 1 ? 's' : ''} streak
          </span>
          {streakInfo.workedOutThisWeek && (
            <span className="text-green-400 text-sm" title="Worked out this week">
              ✓
            </span>
          )}
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

      {/* Status Message */}
      <div className={`text-xs ${
        streakInfo.streakAtRisk ? 'text-yellow-400' : 'text-text-muted'
      }`}>
        {getNextWorkoutMessage(streakInfo)}
      </div>
    </div>
  );
}
