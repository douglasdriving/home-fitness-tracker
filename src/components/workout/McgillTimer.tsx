/**
 * McgillTimer Component
 * Dedicated timer for the McGill short-hold protocol.
 *
 * Per-side flow (e.g. Side Plank, `perSide={true}`):
 *   1. All rounds on LEFT side (hold → rest → hold → rest → hold)
 *   2. Transition to right side
 *   3. All rounds on RIGHT side (hold → rest → hold → rest → hold)
 *   4. Complete
 *
 * Single-sided flow (e.g. Plank, `perSide={false}`):
 *   1. All rounds (hold → rest → hold → rest → hold)
 *   2. Complete
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
  perSide?: boolean;           // Whether the exercise is bilateral (default true for backward compat)
  onComplete?: () => void;
}

export default function McgillTimer({
  rounds,
  holdDuration,
  restBetweenRounds = 5,
  transitionDuration = 10,
  perSide = true,
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

  const finishWorkout = () => {
    setIsRunning(false);
    setPhase('complete');
    if (onCompleteRef.current) onCompleteRef.current();
  };

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
            } else if (perSide) {
              // Bilateral: switch to the right side
              setCurrentRound(1);
              setPhase('transition');
              return transitionDuration;
            } else {
              // Single-sided: all rounds done
              finishWorkout();
              return 0;
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
              finishWorkout();
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
  }, [isRunning, phase, rounds, holdDuration, restBetweenRounds, transitionDuration, perSide]);

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
  const sides = perSide ? 2 : 1;
  const totalHoldTime = rounds * holdDuration * sides;
  const totalRestTime = Math.max(0, rounds - 1) * restBetweenRounds * sides; // rest between rounds, all sides
  const totalTransitionTime = perSide ? transitionDuration : 0;
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
    // During hold phases: currentRound-1 rounds are fully done (hold+rest each)
    // During rest phases: currentRound holds are done, currentRound-1 rests are done
    const isResting = phase === 'left-rest' || phase === 'right-rest';

    if (isResting) {
      // The current round's hold is complete; we're resting after it
      elapsed += currentRound * holdDuration;
      // Previous rests between rounds are also complete
      if (currentRound - 1 > 0) {
        elapsed += (currentRound - 1) * restBetweenRounds;
      }
      // Add elapsed time within this rest
      elapsed += restBetweenRounds - timeLeft;
    } else {
      // Hold phase: previous rounds (hold+rest) are complete
      const completedRoundsOnSide = currentRound - 1;
      elapsed += completedRoundsOnSide * holdDuration;
      if (completedRoundsOnSide > 0) {
        elapsed += completedRoundsOnSide * restBetweenRounds;
      }
      // Add elapsed time within this hold
      elapsed += holdDuration - timeLeft;
    }

    return elapsed;
  };

  const progress = totalDuration > 0 ? (getElapsed() / totalDuration) * 100 : 0;

  const getStatusText = (): string => {
    if (phase === 'idle') return 'Ready to start';
    if (phase === 'complete') return 'Complete!';
    if (phase === 'left-hold') return perSide ? `Left Side — Hold ${currentRound} of ${rounds}` : `Hold ${currentRound} of ${rounds}`;
    if (phase === 'left-rest') return perSide ? 'Left Side — Rest' : 'Rest';
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

  // Render round dots for a single side/row.
  // `active` indicates this row's side is the one currently in progress.
  const renderRoundDots = (side: 'left' | 'right', label?: string) => {
    const isHoldPhase = side === 'left' ? phase === 'left-hold' : phase === 'right-hold';
    const isRestPhase = side === 'left' ? phase === 'left-rest' : phase === 'right-rest';
    const isActiveSide = isHoldPhase || isRestPhase;
    // For the left row in per-side mode, once we move past the left side all dots are done.
    const leftSideDone = side === 'left' && (phase === 'transition' || phase === 'right-hold' || phase === 'right-rest');

    return (
      <div className="flex items-center gap-1">
        {label && <span className="text-xs text-text-muted mr-1">{label}</span>}
        {Array.from({ length: rounds }, (_, i) => {
          const roundNum = i + 1;
          let dotClass = 'bg-background-lighter'; // pending

          if (leftSideDone) {
            dotClass = 'bg-primary';
          } else if (isActiveSide) {
            if (roundNum < currentRound) {
              dotClass = 'bg-primary'; // completed
            } else if (roundNum === currentRound && isHoldPhase) {
              dotClass = 'bg-primary/50'; // current
            } else if (roundNum === currentRound && isRestPhase) {
              dotClass = 'bg-primary'; // just completed, resting
            }
          }

          return (
            <div
              key={`${side}-${i}`}
              className={`w-2.5 h-2.5 rounded-full ${dotClass} transition-colors`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      {/* Status and side indicator */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {perSide && phase !== 'idle' && phase !== 'complete' && (
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

      {/* Round dots - visual indicator of rounds */}
      {phase !== 'idle' && phase !== 'complete' && rounds > 1 && (
        <div className="flex justify-center gap-4 mb-3">
          {perSide ? (
            <>
              {renderRoundDots('left', 'L')}
              {renderRoundDots('right', 'R')}
            </>
          ) : (
            renderRoundDots('left')
          )}
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
