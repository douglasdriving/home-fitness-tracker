import { useUserStore } from '../../store/user-store';

export default function StreakTracker() {
  const profile = useUserStore((state) => state.profile);

  if (!profile?.calibrationCompleted) {
    return null;
  }

  const currentStreak = profile.streakData?.currentStreak || 0;
  const longestStreak = profile.streakData?.longestStreak || 0;
  const frequencyGoal = profile.workoutFrequencyGoal || 3;

  // Calculate days until streak expires
  const lastWorkoutDate = profile.streakData?.lastWorkoutDate;
  const daysPerWorkout = 7 / frequencyGoal;
  const allowedGapDays = Math.ceil(daysPerWorkout * 1.5);

  let daysRemaining = 0;
  let streakStatus: 'active' | 'expiring' | 'expired' = 'active';

  if (lastWorkoutDate && currentStreak > 0) {
    const daysSinceLastWorkout = (Date.now() - lastWorkoutDate) / (1000 * 60 * 60 * 24);
    daysRemaining = Math.max(0, Math.ceil(allowedGapDays - daysSinceLastWorkout));

    if (daysRemaining === 0) {
      streakStatus = 'expired';
    } else if (daysRemaining <= 2) {
      streakStatus = 'expiring';
    }
  }

  // Get motivational message
  const getStreakMessage = () => {
    if (currentStreak === 0) {
      return 'Complete a workout to start your streak!';
    }
    if (streakStatus === 'expired') {
      return 'Your streak has ended. Start a new one today!';
    }
    if (streakStatus === 'expiring') {
      return `Keep it going! ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left.`;
    }
    if (currentStreak === longestStreak && currentStreak >= 5) {
      return 'Personal record! Keep crushing it!';
    }
    return `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} to next workout.`;
  };

  const getStreakColor = () => {
    if (currentStreak === 0 || streakStatus === 'expired') {
      return 'text-gray-400';
    }
    if (streakStatus === 'expiring') {
      return 'text-orange-500';
    }
    if (currentStreak === longestStreak && currentStreak >= 5) {
      return 'text-purple-500';
    }
    return 'text-green-500';
  };

  const getFireEmoji = () => {
    if (currentStreak === 0) return '';
    if (currentStreak >= 20) return '🔥🔥🔥';
    if (currentStreak >= 10) return '🔥🔥';
    if (currentStreak >= 5) return '🔥';
    return '✨';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">Workout Streak</h3>
        <span className="text-2xl">{getFireEmoji()}</span>
      </div>

      <div className="flex items-center justify-around mb-3">
        <div className="text-center">
          <div className={`text-3xl font-bold ${getStreakColor()}`}>
            {currentStreak}
          </div>
          <div className="text-xs text-gray-500">Current</div>
        </div>

        <div className="h-12 w-px bg-gray-200"></div>

        <div className="text-center">
          <div className="text-3xl font-bold text-gray-700">
            {longestStreak}
          </div>
          <div className="text-xs text-gray-500">Best</div>
        </div>

        <div className="h-12 w-px bg-gray-200"></div>

        <div className="text-center">
          <div className="text-3xl font-bold text-blue-500">
            {frequencyGoal}x
          </div>
          <div className="text-xs text-gray-500">Per Week</div>
        </div>
      </div>

      <p className={`text-sm text-center ${getStreakColor()}`}>
        {getStreakMessage()}
      </p>
    </div>
  );
}
