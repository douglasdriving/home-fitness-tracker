/**
 * WarmupRoutine Page
 * Guides users through a short (~2-4 min) pre-workout dynamic warmup,
 * parameterized by the session's muscle group. The pre-session mirror of
 * StretchingRoutine: dynamic movement before, static holds after.
 *
 * On completion or skip-all it navigates to /workout. Unlike stretching, it
 * writes nothing to history — the workout has not started yet.
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getWarmupForMuscleGroup } from '../data/warmupData';
import Timer from '../components/workout/Timer';
import StretchModal from '../components/workout/StretchModal';
import { useWakeLock } from '../hooks/useWakeLock';
import { MuscleGroup } from '../types/exercise';

const WARMUP_STATE_KEY = 'warmupRoutineState';

interface WarmupState {
  workoutId: string;
  currentWarmupIndex: number;
  completedWarmups: number[];
  targetMuscleGroup?: MuscleGroup;
}

export default function WarmupRoutine() {
  const navigate = useNavigate();
  const location = useLocation();
  const workoutId = location.state?.workoutId;
  const targetMuscleGroup: MuscleGroup | undefined = location.state?.targetMuscleGroup;

  // Keep screen awake during the warmup
  useWakeLock();

  // Get the muscle-group-specific warmup (or generic for full-body mode)
  const activeRoutine = useMemo(() => {
    return getWarmupForMuscleGroup(targetMuscleGroup);
  }, [targetMuscleGroup]);

  const activeRoutineDuration = useMemo(() => {
    return activeRoutine.reduce((sum, warmup) => sum + warmup.duration, 0);
  }, [activeRoutine]);

  const [currentWarmupIndex, setCurrentWarmupIndex] = useState(0);
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [completedWarmups, setCompletedWarmups] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (!workoutId) {
      setIsInitialized(true);
      return;
    }

    try {
      const savedState = localStorage.getItem(WARMUP_STATE_KEY);
      if (savedState) {
        const state: WarmupState = JSON.parse(savedState);

        // Only restore if it's for the same workout and same muscle group target
        if (state.workoutId === workoutId && state.targetMuscleGroup === targetMuscleGroup) {
          setCurrentWarmupIndex(state.currentWarmupIndex);
          setCompletedWarmups(new Set(state.completedWarmups));
        }
      }
    } catch (error) {
      console.error('Failed to restore warmup state:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [workoutId, targetMuscleGroup]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!workoutId || !isInitialized) return;

    const state: WarmupState = {
      workoutId,
      currentWarmupIndex,
      completedWarmups: Array.from(completedWarmups),
      targetMuscleGroup,
    };

    try {
      localStorage.setItem(WARMUP_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save warmup state:', error);
    }
  }, [workoutId, currentWarmupIndex, completedWarmups, isInitialized, targetMuscleGroup]);

  const currentWarmup = activeRoutine[currentWarmupIndex];
  const isLastWarmup = currentWarmupIndex === activeRoutine.length - 1;
  const progress = (currentWarmupIndex / activeRoutine.length) * 100;

  const goToWorkout = () => {
    // Clear saved state and continue into the workout (no history write — the
    // workout has not been completed yet).
    try {
      localStorage.removeItem(WARMUP_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear warmup state:', error);
    }
    navigate('/workout');
  };

  const handleWarmupComplete = () => {
    setCompletedWarmups(prev => new Set(prev).add(currentWarmupIndex));

    if (isLastWarmup) {
      goToWorkout();
    } else {
      setCurrentWarmupIndex(currentWarmupIndex + 1);
    }
  };

  const handleSkip = () => {
    if (confirm('Skip the warmup and go straight to your workout?')) {
      goToWorkout();
    }
  };

  // Defensive guard: if there are no moves for this group, don't crash —
  // proceed straight to the workout. (Every group/generic has ≥1 move today.)
  if (!currentWarmup) {
    goToWorkout();
    return null;
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">🔥 Warmup</h1>
          <button onClick={handleSkip} className="text-sm underline opacity-80 hover:opacity-100">
            Skip All
          </button>
        </div>
        <div className="w-full bg-white/30 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm opacity-90 mt-2">
          Move {currentWarmupIndex + 1} of {activeRoutine.length}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Warmup Info */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-text mb-2">{currentWarmup.name}</h2>
              <div className="flex flex-wrap gap-2">
                {currentWarmup.targetMuscles.map((muscle, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-semibold"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
            {/* Only rep counts are shown here — duration is already covered by the timer below */}
            {currentWarmup.reps && (
              <div className="text-right">
                <div className="text-sm text-text-muted">Target</div>
                <div className="text-lg font-bold text-orange-500">
                  ~{currentWarmup.reps} reps
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timer */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <Timer
            key={`warmup-${currentWarmupIndex}`}
            duration={currentWarmup.duration}
            onComplete={handleWarmupComplete}
            autoStart={false}
            bilateral={currentWarmup.bilateral}
          />
        </div>

        {/* Warmup Help Button */}
        <div className="bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter">
          <button
            onClick={() => setShowWarmupModal(true)}
            className="w-full flex items-center justify-center gap-2 text-orange-500 hover:text-orange-600 transition-colors"
          >
            <span className="text-xl">❓</span>
            <span className="text-sm font-medium">How to do this move</span>
          </button>
        </div>

        {/* Total Time */}
        <div className="text-center text-sm text-text-muted">
          Total warmup: ~{Math.ceil(activeRoutineDuration / 60)} minutes
        </div>
      </div>

      {/* Warmup Modal */}
      {showWarmupModal && (
        <StretchModal stretch={currentWarmup} onClose={() => setShowWarmupModal(false)} />
      )}
    </div>
  );
}
