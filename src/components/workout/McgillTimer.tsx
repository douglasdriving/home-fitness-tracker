/**
 * McgillTimer Component
 * Dedicated timer for the McGill side plank protocol.
 *
 * McGill protocol flow per set:
 *   1. All rounds on LEFT side (hold → rest → hold → rest → hold)
 *   2. Transition to right side
 *   3. All rounds on RIGHT side (hold → rest → hold → rest → hold)
 *   4. Complete
 *
 * This is intentionally separate from the general Timer component to avoid
 * complicating that code with McGill-specific state management.
 */

import { useState, useEffect, useRef } from 'react';
import { playCompletionSound } from '../../utils/sound';

type McgillPhase =
  | 'idle'
  | 'left-hold'
  | 'left-rest'
  | 'transition'
  | 'right-hold'
  | 'right-rest'
  | 'complete';

interface McgillTimerProps {
  rounds: number;              // Number of rounds per side for this set
  holdDuration: number;        // Hold duration in seconds per round
  restBetweenRounds?: number;  // Rest between rounds within a side (default 5)
  transitionDuration?: number; // Rest when switching sides (default 10)
  onComplete?: () => void;
}

export default function McgillTimer({
  rounds,
  holdDuration,
  restBetweenRounds = 5,
  transitionDuration = 10,
  onComplete,
}: McgillTimerProps) {
  const [phase, setPhase] = useState<McgillPhase>('idle');
  const [timeLeft, setTimeLeft] = useState(holdDuration);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Use refs to avoid stale closures in the interval callback
  const phaseRef = useRef(phase);
  const currentRoundRef = useRef(currentRound);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Countdown interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isRunning || phase === 'idle' || phase === 'complete') {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Phase complete - advance to next phase
          playCompletionSound();
          const currentPhase = phaseRef.current;
          const round = currentRoundRef.current;

          if (currentPhase === 'left-hold') {
            if (round < rounds) {
              setPhase('left-rest');
              return restBetweenRounds;
            } else {
              setCurrentRound(1);
              setPhase('transition');
              return transitionDuration;
            }
          }

          if (currentPhase === 'left-rest') {
            setCurrentRound(round + 1);
            setPhase('left-hold');
            return holdDuration;
          }

          if (currentPhase === 'transition') {
            setPhase('right-hold');
            return holdDuration;
          }

          if (currentPhase === 'right-hold') {
            if (round < rounds) {
              setPhase('right-rest');
              return restBetweenRounds;
            } else {
              setIsRunning(false);
              setPhase('complete');
              if (onCompleteRef.current) onCompleteRef.current();
              return 0;
            }
          }

          if (currentPhase === 'right-rest') {
            setCurrentRound(round + 1);
            setPhase('right-hold');
            return holdDuration;
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, phase, rounds, holdDuration, restBetweenRounds, transitionDuration]);

  const handleStart = () => {
    if (phase === 'idle' || phase === 'complete') {
      setPhase('left-hold');
      setTimeLeft(holdDuration);
      setCurrentRound(1);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleSkip = () => {
    setIsRunning(false);
    setPhase('complete');
    if (onCompleteRef.current) onCompleteRef.current();
  };

  // Calculate overall progress
  const totalHoldTime = rounds * holdDuration * 2; // both sides
  const totalRestTime = Math.max(0, rounds - 1) * restBetweenRounds * 2; // rest between rounds, both sides
  const totalTransitionTime = transitionDuration;
  const totalDuration = totalHoldTime + totalRestTime + totalTransitionTime;

  const getElapsed = (): number => {
    if (phase === 'idle') return 0;
    if (phase === 'complete') return totalDuration;

    let elapsed = 0;
    const isRightSide = phase === 'right-hold' || phase === 'right-rest';

    if (isRightSide || phase === 'transition') {
      if (phase === 'transition') {
        // Left side fully done
        elapsed = rounds * holdDuration + Math.max(0, rounds - 1) * restBetweenRounds;
        elapsed += transitionDuration - timeLeft;
        return elapsed;
      }
      // All of left side is done + transition
      elapsed += rounds * holdDuration + Math.max(0, rounds - 1) * restBetweenRounds + transitionDuration;
    }

    // Add completed rounds on current side
    const completedRoundsOnSide = currentRound - 1;
    elapsed += completedRoundsOnSide * holdDuration;
    if (completedRoundsOnSide > 0) {
      elapsed += completedRoundsOnSide * restBetweenRounds;
    }

    // Add current phase time elapsed
    if (phase === 'left-hold' || phase === 'right-hold') {
      elapsed += holdDuration - timeLeft;
    } else if (phase === 'left-rest' || phase === 'right-rest') {
      elapsed += restBetweenRounds - timeLeft;
    }

    return elapsed;
  };

  const progress = totalDuration > 0 ? (getElapsed() / totalDuration) * 100 : 0;

  const getStatusText = (): string => {
    if (phase === 'idle') return 'Ready to start';
    if (phase === 'complete') return 'Complete!';
    if (phase === 'left-hold') return `Left Side — Hold ${currentRound} of ${rounds}`;
    if (phase === 'left-rest') return 'Left Side — Rest';
    if (phase === 'transition') return 'Switch to Right Side';
    if (phase === 'right-hold') return `Right Side — Hold ${currentRound} of ${rounds}`;
    if (phase === 'right-rest') return 'Right Side — Rest';
    return '';
  };

  const getPhaseColor = (): string => {
    if (phase === 'left-hold' || phase === 'right-hold') return 'text-primary';
    if (phase === 'left-rest' || phase === 'right-rest') return 'text-secondary';
    if (phase === 'transition') return 'text-accent';
    return 'text-primary';
  };

  const getSideIndicator = (): string => {
    if (phase === 'left-hold' || phase === 'left-rest') return '← L';
    if (phase === 'right-hold' || phase === 'right-rest') return 'R →';
    if (phase === 'transition') return '← → ';
    return '';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Status and side indicator */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {phase !== 'idle' && phase !== 'complete' && (
            <span className="text-lg font-bold text-text-muted">
              {getSideIndicator()}
            </span>
          )}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
        </div>
        <span className={`text-2xl font-bold ${getPhaseColor()}`}>
          {phase === 'idle' ? `${holdDuration}s` : `${timeLeft}s`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      {/* Round dots - visual indicator of rounds per side */}
      {phase !== 'idle' && phase !== 'complete' && rounds > 1 && (
        <div className="flex justify-center gap-4 mb-3">
          {/* Left side dots */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted mr-1">L</span>
            {Array.from({ length: rounds }, (_, i) => {
              const isLeftSide = phase === 'left-hold' || phase === 'left-rest';
              const roundNum = i + 1;
              let dotClass = 'bg-background-lighter'; // pending

              if (!isLeftSide) {
                // On transition or right side: all left rounds are done
                dotClass = 'bg-primary';
              } else if (roundNum < currentRound) {
                dotClass = 'bg-primary'; // completed
              } else if (roundNum === currentRound && phase === 'left-hold') {
                dotClass = 'bg-primary/50'; // current
              } else if (roundNum === currentRound && phase === 'left-rest') {
                dotClass = 'bg-primary'; // just completed, resting
              }

              return (
                <div
                  key={`left-${i}`}
                  className={`w-2.5 h-2.5 rounded-full ${dotClass} transition-colors`}
                />
              );
            })}
          </div>

          {/* Right side dots */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-text-muted mr-1">R</span>
            {Array.from({ length: rounds }, (_, i) => {
              const isRightSide = phase === 'right-hold' || phase === 'right-rest';
              const roundNum = i + 1;
              let dotClass = 'bg-background-lighter'; // pending

              if (isRightSide) {
                if (roundNum < currentRound) {
                  dotClass = 'bg-primary'; // completed
                } else if (roundNum === currentRound && phase === 'right-hold') {
                  dotClass = 'bg-primary/50'; // current
                } else if (roundNum === currentRound && phase === 'right-rest') {
                  dotClass = 'bg-primary'; // just completed, resting
                }
              }

              return (
                <div
                  key={`right-${i}`}
                  className={`w-2.5 h-2.5 rounded-full ${dotClass} transition-colors`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {phase === 'idle' || phase === 'complete' ? (
          <button
            onClick={handleStart}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            {phase === 'complete' ? 'Restart' : 'Start'}
          </button>
        ) : (
          <>
            <button
              onClick={isRunning ? handlePause : handleStart}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Skip
            </button>
          </>
        )}
      </div>
    </div>
  );
}
