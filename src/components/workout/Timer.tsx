import { useState, useEffect } from 'react';
import { playCompletionSound } from '../../utils/sound';

interface TimerProps {
  duration: number; // seconds
  onComplete?: () => void;
  autoStart?: boolean;
  hideControls?: boolean; // Hide start/pause/skip buttons
  countUp?: boolean; // Count up from 0 instead of down from duration
  showSecondsOnly?: boolean; // Show only seconds, no minutes formatting
}

export default function Timer({
  duration,
  onComplete,
  autoStart = false,
  hideControls = false,
  countUp = false,
  showSecondsOnly = false
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(countUp ? 0 : duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  console.log('=== TIMER RENDER ===');
  console.log('Duration:', duration, 'AutoStart:', autoStart, 'CountUp:', countUp);
  console.log('TimeLeft:', timeLeft, 'IsRunning:', isRunning);

  useEffect(() => {
    console.log('Timer init effect - setting timeLeft and isRunning');
    console.log('  Duration:', duration, 'AutoStart:', autoStart, 'CountUp:', countUp);
    setTimeLeft(countUp ? 0 : duration);
    setIsRunning(autoStart);
  }, [duration, autoStart, countUp]);

  useEffect(() => {
    console.log('Timer interval effect triggered');
    console.log('  isRunning:', isRunning, 'timeLeft:', timeLeft, 'countUp:', countUp, 'duration:', duration);

    if (!isRunning) {
      console.log('  Timer not running, skipping interval setup');
      return;
    }

    // For count-down, stop at 0
    if (!countUp && timeLeft <= 0) {
      console.log('  Count-down at 0, stopping');
      return;
    }

    // For count-up, stop at duration
    if (countUp && timeLeft >= duration) {
      console.log('  Count-up reached duration, stopping');
      return;
    }

    console.log('  Setting up interval...');
    const interval = setInterval(() => {
      console.log('  Interval tick!');
      setTimeLeft((prev) => {
        if (countUp) {
          // Count up mode
          if (prev >= duration - 1) {
            setIsRunning(false);
            playCompletionSound(); // Play sound when timer completes
            if (onComplete) onComplete();
            return duration;
          }
          return prev + 1;
        } else {
          // Count down mode
          if (prev <= 1) {
            setIsRunning(false);
            playCompletionSound(); // Play sound when timer completes
            if (onComplete) onComplete();
            return 0;
          }
          return prev - 1;
        }
      });
    }, 1000);

    return () => {
      console.log('  Cleaning up interval');
      clearInterval(interval);
    };
  }, [isRunning, timeLeft, onComplete, countUp, duration]);

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

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progress = countUp
    ? (timeLeft / duration) * 100
    : ((duration - timeLeft) / duration) * 100;

  const getStatusText = () => {
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

      {/* Progress bar - hide for count-up timers */}
      {!countUp && (
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
          {((countUp && timeLeft < duration) || (!countUp && timeLeft > 0)) && (
            <button
              onClick={skipTimer}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
