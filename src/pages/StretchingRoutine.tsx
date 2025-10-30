/**
 * StretchingRoutine Page
 * Guides users through a 5-minute post-workout stretching routine
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stretchingRoutine, totalStretchingDuration } from '../data/stretchingData';
import Timer from '../components/workout/Timer';
import Button from '../components/common/Button';
import { db } from '../db/db';

export default function StretchingRoutine() {
  const navigate = useNavigate();
  const location = useLocation();
  const workoutId = location.state?.workoutId;

  const [currentStretchIndex, setCurrentStretchIndex] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [completedStretches, setCompletedStretches] = useState<Set<number>>(new Set());

  const currentStretch = stretchingRoutine[currentStretchIndex];
  const isLastStretch = currentStretchIndex === stretchingRoutine.length - 1;
  const progress = ((currentStretchIndex + (isResting ? 0.5 : 0)) / stretchingRoutine.length) * 100;

  useEffect(() => {
    // Show instructions when starting a new stretch
    setShowInstructions(true);
  }, [currentStretchIndex]);

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
    // Mark stretching as completed in workout history
    if (workoutId) {
      try {
        const historyEntry = await db.history.get(workoutId);
        if (historyEntry) {
          await db.history.put({
            ...historyEntry,
            stretchingCompleted: true
          });
        }
      } catch (error) {
        console.error('Error updating stretching completion:', error);
      }
    }

    navigate('/', { state: { stretchingCompleted: true } });
  };

  const handleSkip = () => {
    if (confirm('Are you sure you want to skip the stretching routine?')) {
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

          {/* Instructions */}
          {showInstructions && (
            <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-sm font-semibold text-purple-900 mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-purple-800">
                {currentStretch.instructions.map((instruction, idx) => (
                  <li key={idx}>{instruction}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Video Link */}
          {currentStretch.videoUrl && (
            <div className="mb-4">
              <a
                href={currentStretch.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
              >
                <span className="mr-1">▶</span>
                Watch demonstration video
              </a>
            </div>
          )}

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="text-sm text-text-muted hover:text-text"
          >
            {showInstructions ? '▲ Hide instructions' : '▼ Show instructions'}
          </button>
        </div>

        {/* Timer */}
        <div className="bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
          <Timer
            key={`stretch-${currentStretchIndex}`}
            duration={currentStretch.duration}
            onComplete={handleStretchComplete}
            autoStart={false}
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
    </div>
  );
}
