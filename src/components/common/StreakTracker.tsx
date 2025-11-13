import { useUserStore } from '../../store/user-store';

export default function StreakTracker() {
  const profile = useUserStore((state) => state.profile);

  if (!profile?.calibrationCompleted) {
    return null;
  }

  const frequencyGoal = profile.workoutFrequencyGoal || 3;
  const streakData = profile.streakData || {
    currentStreakWeeks: 0,
    longestStreakWeeks: 0,
    thisWeekWorkouts: 0,
    lastWeekStart: Date.now(),
    lastWeekMeetGoal: false,
  };

  const thisWeekWorkouts = streakData.thisWeekWorkouts;
  const currentStreakWeeks = streakData.currentStreakWeeks;
  const longestStreakWeeks = streakData.longestStreakWeeks;

  // Calculate progress percentage
  const progressPercentage = Math.min((thisWeekWorkouts / frequencyGoal) * 100, 100);
  const goalMet = thisWeekWorkouts >= frequencyGoal;

  // Get motivational message
  const getMessage = () => {
    if (goalMet) {
      return `Goal complete! ${thisWeekWorkouts}/${frequencyGoal} workouts this week 🎉`;
    }
    const remaining = frequencyGoal - thisWeekWorkouts;
    if (remaining === 1) {
      return `One more workout to reach your weekly goal!`;
    }
    return `${remaining} workouts left this week`;
  };

  // Get fire emoji based on streak
  const getFireEmoji = () => {
    if (currentStreakWeeks === 0) return '💪';
    if (currentStreakWeeks >= 12) return '🔥🔥🔥';
    if (currentStreakWeeks >= 6) return '🔥🔥';
    if (currentStreakWeeks >= 2) return '🔥';
    return '✨';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Weekly Goal</h3>
        <span className="text-2xl">{getFireEmoji()}</span>
      </div>

      {/* This Week Progress */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">This Week</span>
          <span className={`text-sm font-bold ${goalMet ? 'text-green-500' : 'text-blue-500'}`}>
            {thisWeekWorkouts} / {frequencyGoal} workouts
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              goalMet ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <p className={`text-xs mt-2 ${goalMet ? 'text-green-600' : 'text-gray-600'}`}>
          {getMessage()}
        </p>
      </div>

      {/* Streak Stats */}
      <div className="flex items-center justify-around pt-3 border-t border-gray-200">
        <div className="text-center">
          <div className={`text-3xl font-bold ${currentStreakWeeks > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
            {currentStreakWeeks}
          </div>
          <div className="text-xs text-gray-500">Week Streak</div>
        </div>

        <div className="h-12 w-px bg-gray-200"></div>

        <div className="text-center">
          <div className="text-3xl font-bold text-purple-500">
            {longestStreakWeeks}
          </div>
          <div className="text-xs text-gray-500">Best Streak</div>
        </div>
      </div>
    </div>
  );
}
