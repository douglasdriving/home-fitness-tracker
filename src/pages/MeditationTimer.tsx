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

  if (!completionState) {
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">🧘‍♀️ Meditation</h1>
          <button
            onClick={handleSkip}
            className="text-sm underline opacity-80 hover:opacity-100"
          >
            Skip
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto p-4 pb-20">
        {/* Timer */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <Timer
            duration={duration}
            autoStart={false}
            hideControls={false}
            onComplete={handleComplete}
          />
        </div>
      </div>
    </div>
  );
}
