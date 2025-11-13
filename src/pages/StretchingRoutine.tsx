/**
 * StretchingRoutine Page
 * Guides users through a 5-minute post-workout stretching routine
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stretchingRoutine, totalStretchingDuration } from '../data/stretchingData';
import Timer from '../components/workout/Timer';
import Button from '../components/common/Button';
import StretchModal from '../components/workout/StretchModal';
import { db } from '../db/db';
import { useWakeLock } from '../hooks/useWakeLock';

const STRETCH_STATE_KEY = 'stretchRoutineState';

interface StretchState {
  workoutId: string;
  currentStretchIndex: number;
  isResting: boolean;
  completedStretches: number[];
}

export default function StretchingRoutine() {
  const navigate = useNavigate();
  const location = useLocation();
  const workoutId = location.state?.workoutId;

  // Keep screen awake during stretching routine
  useWakeLock();

  const [currentStretchIndex, setCurrentStretchIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showStretchModal, setShowStretchModal] = useState(false);
  const [completedStretches, setCompletedStretches] = useState<Set<number>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (!workoutId) return;

    try {
      const savedState = localStorage.getItem(STRETCH_STATE_KEY);
      if (savedState) {
        const state: StretchState = JSON.parse(savedState);

        // Only restore if it's for the same workout
        if (state.workoutId === workoutId) {
          setCurrentStretchIndex(state.currentStretchIndex);
          setIsResting(state.isResting);
          setCompletedStretches(new Set(state.completedStretches));
        }
      }
    } catch (error) {
      console.error('Failed to restore stretch state:', error);
    } finally {
      setIsInitialized(true);
    }
  }, [workoutId]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!workoutId || !isInitialized) return;

    const state: StretchState = {
      workoutId,
      currentStretchIndex,
      isResting,
      completedStretches: Array.from(completedStretches)
    };

    try {
      localStorage.setItem(STRETCH_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save stretch state:', error);
    }
  }, [workoutId, currentStretchIndex, isResting, completedStretches, isInitialized]);

  const currentStretch = stretchingRoutine[currentStretchIndex];
  const isLastStretch = currentStretchIndex === stretchingRoutine.length - 1;
  const progress = ((currentStretchIndex + (isResting ? 0.5 : 0)) / stretchingRoutine.length) * 100;


  const handleStretchComplete = () => {
    setCompletedStretches(prev => new Set(prev).add(currentStretchIndex));

    if (isLastStretch) {
      handleRoutineComplete();
    } else {
      // Brief rest between stretches
      setIsResting(true);
    }
  };

  const handleRestComplete = () => {
    setIsResting(false);
    setCurrentStretchIndex(currentStretchIndex + 1);
  };

  const handleRoutineComplete = async () => {
    // Mark stretching as completed in workout history and add stretching time
    if (workoutId) {
      try {
        // Find history entry by workoutId field (not by id)
        const allHistory = await db.history.toArray();
        const historyEntry = allHistory.find(entry => entry.workoutId === workoutId);

        if (historyEntry) {
          // Calculate total stretching time including rests
          const stretchDuration = stretchingRoutine.reduce((sum, s) => sum + s.duration, 0);
          const restDuration = (stretchingRoutine.length - 1) * 10; // 10 second rests between stretches
          const totalStretchMinutes = Math.round((stretchDuration + restDuration) / 60);

          await db.history.put({
            ...historyEntry,
            stretchingCompleted: true,
            totalDuration: historyEntry.totalDuration + totalStretchMinutes
          });
        }
      } catch (error) {
        console.error('Error updating stretching completion:', error);
      }
    }

    // Clear saved state when routine is completed
    try {
      localStorage.removeItem(STRETCH_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear stretch state:', error);
    }

    navigate('/', { state: { stretchingCompleted: true } });
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the stretching routine?')) {
      // Clear saved state when skipping
      try {
        localStorage.removeItem(STRETCH_STATE_KEY);
      } catch (error) {
        console.error('Failed to clear stretch state:', error);
      }
      navigate('/');
    }
  };

  const handleSkipStretch = () => {
    if (isLastStretch) {
      handleRoutineComplete();
    } else {
      setCurrentStretchIndex(currentStretchIndex + 1);
    }
  };

  if (isResting) {
    const nextStretch = stretchingRoutine[currentStretchIndex + 1];

    return (
      <div className="bg-background min-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold">🧘 Stretching</h1>
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
        </div>

        {/* Rest Content */}
        <div className="p-4">
          <div className="bg-background-light rounded-lg shadow-lg p-6 text-center mb-6 border border-background-lighter">
            <div className="text-6xl mb-4">😌</div>
            <h2 className="text-2xl font-bold text-text mb-2">Quick Break</h2>
            <p className="text-text-muted mb-4">
              Relax for a moment before the next stretch
            </p>
          </div>

          <Timer
            key={`rest-${currentStretchIndex}`}
            duration={10}
            onComplete={handleRestComplete}
            autoStart={true}
          />

          {/* Next Stretch Preview */}
          <div className="mt-6 bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter">
            <h3 className="text-sm font-medium text-text-muted mb-2">Up Next:</h3>
            <div className="font-medium text-text text-lg">{nextStretch?.name}</div>
            <div className="text-sm text-text-muted">{nextStretch?.duration}s</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold">🧘 Stretching</h1>
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
          Stretch {currentStretchIndex + 1} of {stretchingRoutine.length}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Stretch Info */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-text mb-2">{currentStretch.name}</h2>
              <div className="flex flex-wrap gap-2">
                {currentStretch.targetMuscles.map((muscle, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-semibold"
                  >
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-text-muted">Duration</div>
              <div className="text-lg font-bold text-purple-600">
                {currentStretch.duration}s
              </div>
            </div>
          </div>

        </div>

        {/* Timer */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <Timer
            key={`stretch-${currentStretchIndex}`}
            duration={currentStretch.duration}
            onComplete={handleStretchComplete}
            autoStart={false}
            bilateral={currentStretch.bilateral}
          />
        </div>

        {/* Progress Indicators */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <h3 className="text-sm font-medium text-text-muted mb-3">Stretch Progress</h3>
          <div className="flex gap-2 flex-wrap">
            {stretchingRoutine.map((_, index) => (
              <div
                key={index}
                className={`flex-1 min-w-[40px] h-2 rounded-full transition-colors ${
                  completedStretches.has(index)
                    ? 'bg-purple-600'
                    : index === currentStretchIndex
                    ? 'bg-purple-400'
                    : 'bg-background-lighter'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-text-muted text-center">
            {completedStretches.size} of {stretchingRoutine.length} completed
          </div>
        </div>

        {/* Stretch Help Button */}
        <div className="bg-background-light rounded-lg shadow-lg p-4 border border-background-lighter">
          <button
            onClick={() => setShowStretchModal(true)}
            className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
          >
            <span className="text-xl">❓</span>
            <span className="text-sm font-medium">How to do this stretch</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={handleSkipStretch} fullWidth variant="secondary">
            Skip This Stretch
          </Button>
        </div>

        {/* Total Time Remaining */}
        <div className="text-center text-sm text-text-muted">
          Total routine: ~{Math.ceil(totalStretchingDuration / 60)} minutes
        </div>
      </div>

      {/* Stretch Modal */}
      {showStretchModal && (
        <StretchModal stretch={currentStretch} onClose={() => setShowStretchModal(false)} />
      )}
    </div>
  );
}
