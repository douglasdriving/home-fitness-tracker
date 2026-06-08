/**
 * MeditationTimer Page
 * Progressive post-workout meditation timer that appears after stretching.
 * Duration increases every 5 completions, from 1 min to 15 min cap.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import Timer from '../components/workout/Timer';
import { useWakeLock } from '../hooks/useWakeLock';

export default function MeditationTimer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, completeMeditation } = useUserStore();

  const completionState = location.state?.completionState;

  // Keep screen awake during meditation
  useWakeLock();

  // Redirect to home if no completion state (direct URL access)
  useEffect(() => {
    if (!completionState) {
      navigate('/');
    }
  }, [completionState, navigate]);

  // Get meditation state with defaults
  const meditationState = profile?.meditationState ?? {
    completionCount: 0,
    currentDurationSeconds: 60,
  };

  const sessionNumber = meditationState.completionCount + 1;
  const duration = meditationState.currentDurationSeconds;

  const handleComplete = () => {
    // Increment completion count and update duration for next session
    completeMeditation();

    // Navigate to workout complete with completion state
    navigate('/workout-complete', { state: completionState });
  };

  const handleSkip = () => {
    // Skip directly to workout complete without incrementing count
    navigate('/workout-complete', { state: completionState });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  };

  if (!completionState) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">🧘‍♀️ Meditation</h1>
          <button
            onClick={handleSkip}
            className="text-sm underline opacity-80 hover:opacity-100"
          >
            Skip
          </button>
        </div>
        <p className="text-sm opacity-90">Take a moment to breathe and reflect</p>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 pb-20">
        {/* Session Info Card */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 mb-4 border border-background-lighter">
          <div className="text-center mb-4">
            <div className="text-sm text-gray-600 mb-1">Session #{sessionNumber}</div>
            <div className="text-2xl font-bold text-teal-700">{formatDuration(duration)}</div>
            <p className="text-sm text-gray-600 mt-2">
              Close your eyes, focus on your breath, and let your mind settle.
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className="mb-4">
          <Timer
            duration={duration}
            countUp={true}
            autoStart={false}
            hideControls={false}
            onComplete={handleComplete}
          />
        </div>

        {/* Tips */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-gray-700">
          <p className="font-medium text-teal-900 mb-2">Meditation Tips:</p>
          <ul className="space-y-1 list-disc list-inside text-gray-700">
            <li>Find a comfortable seated position</li>
            <li>Breathe naturally and notice each breath</li>
            <li>When your mind wanders, gently return focus to breathing</li>
            <li>There's no "perfect" meditation - just be present</li>
          </ul>
        </div>

        {/* Progress Note */}
        {sessionNumber % 5 === 0 && sessionNumber < 30 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium text-yellow-900">
              🎉 Next session your meditation time will increase!
            </p>
          </div>
        )}
        {sessionNumber === 30 && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-gray-700">
            <p className="font-medium text-green-900">
              🌟 You've reached the maximum meditation duration - excellent dedication!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
