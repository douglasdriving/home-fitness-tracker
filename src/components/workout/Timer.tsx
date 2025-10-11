import { useState, useEffect } from 'react';

interface TimerProps {
  duration: number; // seconds
  onComplete?: () => void;
  autoStart?: boolean;
}

export default function Timer({ duration, onComplete, autoStart = false }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);

  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(autoStart);
  }, [duration, autoStart]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (onComplete) onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, onComplete]);

  const toggleTimer = () => {
    if (timeLeft === 0) {
      setTimeLeft(duration);
    }
    setIsRunning(!isRunning);
  };

  const skipTimer = () => {
    setTimeLeft(0);
    setIsRunning(false);
    if (onComplete) onComplete();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isRunning ? 'Timer Running' : timeLeft === 0 ? 'Time Complete' : 'Timer Paused'}
        </span>
        <span className="text-2xl font-bold text-primary">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleTimer}
          className="flex-1 bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-dark transition-colors"
        >
          {isRunning ? 'Pause' : timeLeft === 0 ? 'Restart' : 'Start'}
        </button>
        {timeLeft > 0 && (
          <button
            onClick={skipTimer}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
