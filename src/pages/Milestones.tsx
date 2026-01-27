import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UnlockReason, RetirementReason } from '../lib/achievement-tracker';

interface MilestonesState {
  unlockedExerciseIds: string[];
  retiredExerciseIds: string[];
  unlockReasons?: UnlockReason[];
  retirementReasons?: RetirementReason[];
  workoutId?: string;
}

function formatPerformance(value: number, type: 'reps' | 'timed'): string {
  if (type === 'reps') {
    return `${value} reps`;
  }
  return `${value}s`;
}

export default function Milestones() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as MilestonesState | undefined;

  useEffect(() => {
    // If no milestones to show, redirect to home
    if (!state || (state.unlockedExerciseIds.length === 0 && state.retiredExerciseIds.length === 0)) {
      navigate('/');
    }
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { unlockReasons = [], retirementReasons = [] } = state;

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-background-light rounded-lg p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center text-text">Milestones</h1>

        {/* Unlocked Exercises */}
        {unlockReasons.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-primary mb-2">Unlocked</h2>
            <div className="space-y-3">
              {unlockReasons.map(reason => (
                <div
                  key={reason.unlockedExerciseId}
                  className="bg-background rounded px-3 py-2"
                >
                  <div className="text-text font-medium">{reason.unlockedExerciseName}</div>
                  <div className="text-text-muted text-sm">
                    {formatPerformance(reason.performanceValue, reason.performanceType)} of {reason.prereqExerciseName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retired Exercises */}
        {retirementReasons.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-secondary mb-2">Retired (mastered)</h2>
            <div className="space-y-3">
              {retirementReasons.map(reason => (
                <div
                  key={reason.exerciseId}
                  className="bg-background rounded px-3 py-2"
                >
                  <div className="text-text font-medium">{reason.exerciseName}</div>
                  <div className="text-text-muted text-sm">
                    Reached {formatPerformance(reason.performanceValue, reason.performanceType)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
