import { useState, useEffect, useRef } from 'react';
import { playCompletionSound } from '../../utils/sound';

interface TimerProps {
  duration: number; // seconds
  onComplete?: () => void;
  autoStart?: boolean;
  hideControls?: boolean; // Hide start/pause/skip buttons
  countUp?: boolean; // Count up from 0 instead of down from duration
  showSecondsOnly?: boolean; // Show only seconds, no minutes formatting
  bilateral?: boolean; // Run timer twice (for exercises done on both sides)
  transitionDuration?: number; // Seconds of rest between left and right sides (default 10)
  mcgillRounds?: number; // Number of rounds for McGill protocol
  mcgillRestBetweenRounds?: number; // Rest duration between McGill rounds (default 5)
}

export default function Timer({
  duration,
  onComplete,
  autoStart = false,
  hideControls = false,
  countUp = false,
  showSecondsOnly = false,
  bilateral = false,
  transitionDuration = 10,
  mcgillRounds,
  mcgillRestBetweenRounds = 5
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(countUp ? 0 : duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [currentSide, setCurrentSide] = useState<'left' | 'transition' | 'right' | 'rest' | 'complete'>('left');
  const [currentRound, setCurrentRound] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize timer when props change
  useEffect(() => {
    setTimeLeft(countUp ? 0 : duration);
    setIsRunning(autoStart);
    setCurrentSide((bilateral || mcgillRounds) ? 'left' : 'complete');
    setCurrentRound(1);
  }, [duration, autoStart, countUp, bilateral, mcgillRounds]);

  // Manage interval based on isRunning state
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isRunning) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (countUp) {
          // Count up mode
          if (prev >= duration - 1) {
            setIsRunning(false);
            playCompletionSound();

            // Handle bilateral transitions and McGill rounds
            if (mcgillRounds && bilateral) {
              // McGill protocol with bilateral exercise
              setCurrentSide((currentSideValue) => {
                if (currentSideValue === 'left') {
                  // Move to transition
                  setTimeout(() => {
                    setTimeLeft(0);
                    setCurrentSide('transition');
                    setIsRunning(true);
                  }, 100);
                  return 'left';
                } else if (currentSideValue === 'transition') {
                  // Move to right side
                  setTimeout(() => {
                    setTimeLeft(0);
                    setCurrentSide('right');
                    setIsRunning(true);
                  }, 100);
                  return 'transition';
                } else if (currentSideValue === 'right') {
                  // After right side, check if more rounds needed
                  setCurrentRound((currentRoundValue) => {
                    if (currentRoundValue < mcgillRounds) {
                      // Move to rest before next round
                      setTimeout(() => {
                        setTimeLeft(0);
                        setCurrentSide('rest');
                        setIsRunning(true);
                      }, 100);
                      return currentRoundValue;
                    } else {
                      // All rounds complete
                      setCurrentSide('complete');
                      if (onCompleteRef.current) onCompleteRef.current();
                      return currentRoundValue;
                    }
                    return currentRoundValue;
                  });
                  return 'right';
                } else if (currentSideValue === 'rest') {
                  // After rest, start next round
                  setCurrentRound((r) => r + 1);
                  setTimeout(() => {
                    setTimeLeft(0);
                    setCurrentSide('left');
                    setIsRunning(true);
                  }, 100);
                  return 'rest';
                }
                return currentSideValue;
              });
            } else if (bilateral) {
              setCurrentSide((currentSideValue) => {
                if (currentSideValue === 'left') {
                  // Move to transition
                  setTimeout(() => {
                    setTimeLeft(0);
                    setCurrentSide('transition');
                    setIsRunning(true);
                  }, 100);
                  return 'left';
                } else if (currentSideValue === 'transition') {
                  // Move to right side
                  setTimeout(() => {
                    setTimeLeft(0);
                    setCurrentSide('right');
                    setIsRunning(true);
                  }, 100);
                  return 'transition';
                } else if (currentSideValue === 'right') {
                  // Complete - call onComplete
                  setCurrentSide('complete');
                  if (onCompleteRef.current) onCompleteRef.current();
                  return 'complete';
                }
                return currentSideValue;
              });
            } else {
              if (onCompleteRef.current) onCompleteRef.current();
            }

            return duration;
          }
          return prev + 1;
        } else {
          // Count down mode
          if (prev <= 1) {
            setIsRunning(false);
            playCompletionSound();

            // Handle bilateral transitions and McGill rounds
            if (mcgillRounds && bilateral) {
              // McGill protocol with bilateral exercise
              setCurrentSide((currentSideValue) => {
                if (currentSideValue === 'left') {
                  // Move to transition
                  setTimeout(() => {
                    setTimeLeft(transitionDuration);
                    setCurrentSide('transition');
                    setIsRunning(true);
                  }, 100);
                  return 'left';
                } else if (currentSideValue === 'transition') {
                  // Move to right side
                  setTimeout(() => {
                    setTimeLeft(duration);
                    setCurrentSide('right');
                    setIsRunning(true);
                  }, 100);
                  return 'transition';
                } else if (currentSideValue === 'right') {
                  // After right side, check if more rounds needed
                  setCurrentRound((currentRoundValue) => {
                    if (currentRoundValue < mcgillRounds) {
                      // Move to rest before next round
                      setTimeout(() => {
                        setTimeLeft(mcgillRestBetweenRounds);
                        setCurrentSide('rest');
                        setIsRunning(true);
                      }, 100);
                      return currentRoundValue;
                    } else {
                      // All rounds complete
                      setCurrentSide('complete');
                      if (onCompleteRef.current) onCompleteRef.current();
                      return currentRoundValue;
                    }
                    return currentRoundValue;
                  });
                  return 'right';
                } else if (currentSideValue === 'rest') {
                  // After rest, start next round
                  setCurrentRound((r) => r + 1);
                  setTimeout(() => {
                    setTimeLeft(duration);
                    setCurrentSide('left');
                    setIsRunning(true);
                  }, 100);
                  return 'rest';
                }
                return currentSideValue;
              });
            } else if (bilateral) {
              setCurrentSide((currentSideValue) => {
                if (currentSideValue === 'left') {
                  // Move to transition
                  setTimeout(() => {
                    setTimeLeft(transitionDuration);
                    setCurrentSide('transition');
                    setIsRunning(true);
                  }, 100);
                  return 'left';
                } else if (currentSideValue === 'transition') {
                  // Move to right side
                  setTimeout(() => {
                    setTimeLeft(duration);
                    setCurrentSide('right');
                    setIsRunning(true);
                  }, 100);
                  return 'transition';
                } else if (currentSideValue === 'right') {
                  // Complete - call onComplete
                  setCurrentSide('complete');
                  if (onCompleteRef.current) onCompleteRef.current();
                  return 'complete';
                }
                return currentSideValue;
              });
            } else {
              if (onCompleteRef.current) onCompleteRef.current();
            }

            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, countUp, duration, bilateral, transitionDuration, mcgillRounds, mcgillRestBetweenRounds]);

  const toggleTimer = () => {
    if (countUp) {
      if (timeLeft >= duration) {
        setTimeLeft(0);
      }
    } else {
      if (timeLeft === 0) {
        setTimeLeft(duration);
      }
    }
    setIsRunning(!isRunning);
  };

  const skipTimer = () => {
    if (countUp) {
      setTimeLeft(duration);
    } else {
      setTimeLeft(0);
    }
    setIsRunning(false);
    if (onComplete) onComplete();
  };

  const resetTimer = () => {
    setTimeLeft(0);
    setIsRunning(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progress = (() => {
    if (mcgillRounds && bilateral) {
      // For McGill protocol, show progress across all rounds
      const timePerRound = (duration * 2) + transitionDuration;
      const totalExerciseTime = timePerRound * mcgillRounds;
      const totalRestTime = mcgillRestBetweenRounds * (mcgillRounds - 1);
      const totalDuration = totalExerciseTime + totalRestTime;

      let elapsed = 0;
      const completedRounds = currentRound - 1;
      elapsed += completedRounds * (timePerRound + mcgillRestBetweenRounds);

      if (currentSide === 'left') {
        elapsed += countUp ? timeLeft : (duration - timeLeft);
      } else if (currentSide === 'transition') {
        elapsed += duration + (countUp ? timeLeft : (transitionDuration - timeLeft));
      } else if (currentSide === 'right') {
        elapsed += duration + transitionDuration + (countUp ? timeLeft : (duration - timeLeft));
      } else if (currentSide === 'rest') {
        elapsed += timePerRound + (countUp ? timeLeft : (mcgillRestBetweenRounds - timeLeft));
      } else {
        elapsed = totalDuration;
      }

      return (elapsed / totalDuration) * 100;
    } else if (bilateral) {
      // For bilateral, show progress across both sides + transition
      const totalDuration = (duration * 2) + transitionDuration;
      let elapsed = 0;

      if (currentSide === 'left') {
        elapsed = countUp ? timeLeft : (duration - timeLeft);
      } else if (currentSide === 'transition') {
        elapsed = duration + (countUp ? timeLeft : (transitionDuration - timeLeft));
      } else if (currentSide === 'right') {
        elapsed = duration + transitionDuration + (countUp ? timeLeft : (duration - timeLeft));
      } else {
        elapsed = totalDuration;
      }

      return (elapsed / totalDuration) * 100;
    }

    return countUp
      ? (timeLeft / duration) * 100
      : ((duration - timeLeft) / duration) * 100;
  })();

  const getStatusText = () => {
    if (mcgillRounds && bilateral) {
      const roundText = `Round ${currentRound} of ${mcgillRounds}`;
      if (currentSide === 'left') {
        return `${roundText} - Left Side`;
      } else if (currentSide === 'transition') {
        return `${roundText} - Switching Sides...`;
      } else if (currentSide === 'right') {
        return `${roundText} - Right Side`;
      } else if (currentSide === 'rest') {
        return `Rest Between Rounds`;
      } else {
        return 'Complete';
      }
    } else if (bilateral) {
      if (currentSide === 'left') {
        return 'Left Side';
      } else if (currentSide === 'transition') {
        return 'Switching Sides...';
      } else if (currentSide === 'right') {
        return 'Right Side';
      } else {
        return 'Complete';
      }
    }

    if (countUp) {
      return isRunning ? 'Timer Running' : timeLeft >= duration ? 'Time Complete' : 'Timer Paused';
    }
    return isRunning ? 'Timer Running' : timeLeft === 0 ? 'Time Complete' : 'Timer Paused';
  };

  const getButtonText = () => {
    if (countUp) {
      return isRunning ? 'Pause' : timeLeft >= duration ? 'Restart' : 'Start';
    }
    return isRunning ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {getStatusText()}
        </span>
        <span className="text-2xl font-bold text-primary">
          {showSecondsOnly ? `${timeLeft}s` : `${minutes}:${seconds.toString().padStart(2, '0')}`}
        </span>
      </div>

      {/* Progress bar - hide for count-up timers (unless bilateral) */}
      {(bilateral || !countUp) && (
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {!hideControls && (
        <div className="flex gap-2">
          <button
            onClick={toggleTimer}
            className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            {getButtonText()}
          </button>
          {countUp ? (
            timeLeft > 0 && (
              <button
                onClick={resetTimer}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            )
          ) : (
            timeLeft > 0 && (
              <button
                onClick={skipTimer}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Skip
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
