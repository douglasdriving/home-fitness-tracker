import { useState, useEffect, useRef } from 'react';
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  console.log('=== TIMER RENDER ===');
  console.log('Duration:', duration, 'AutoStart:', autoStart, 'CountUp:', countUp);
  console.log('TimeLeft:', timeLeft, 'IsRunning:', isRunning);

  // Initialize timer when props change
  useEffect(() => {
    console.log('Timer init effect - setting timeLeft and isRunning');
    console.log('  Duration:', duration, 'AutoStart:', autoStart, 'CountUp:', countUp);
    setTimeLeft(countUp ? 0 : duration);
    setIsRunning(autoStart);
  }, [duration, autoStart, countUp]);

  // Manage interval based on isRunning state
  useEffect(() => {
    console.log('Timer interval effect triggered');
    console.log('  isRunning:', isRunning, 'countUp:', countUp, 'duration:', duration);

    // Clear any existing interval
    if (intervalRef.current) {
      console.log('  Clearing existing interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isRunning) {
      console.log('  Timer not running, skipping interval setup');
      return;
    }

    console.log('  Setting up NEW interval...');
    intervalRef.current = setInterval(() => {
      console.log('  Interval tick!');
      setTimeLeft((prev) => {
        console.log('    Previous timeLeft:', prev);
        if (countUp) {
          // Count up mode
          if (prev >= duration - 1) {
            console.log('    Count-up complete!');
            setIsRunning(false);
            playCompletionSound();
            if (onCompleteRef.current) onCompleteRef.current();
            return duration;
          }
          const next = prev + 1;
          console.log('    Counting up to:', next);
          return next;
        } else {
          // Count down mode
          if (prev <= 1) {
            console.log('    Count-down complete!');
            setIsRunning(false);
            playCompletionSound();
            if (onCompleteRef.current) onCompleteRef.current();
            return 0;
          }
          const next = prev - 1;
          console.log('    Counting down to:', next);
          return next;
        }
      });
    }, 1000);

    return () => {
      console.log('  Cleanup: clearing interval');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, countUp, duration]);

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
