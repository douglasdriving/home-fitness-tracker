import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { CalibrationExercise } from '../types/user';
import { getExerciseById } from '../data/exerciseData';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Timer from '../components/workout/Timer';

// Calibration exercises (one per muscle group)
const CALIBRATION_EXERCISES = [
  { exerciseId: 'plank-001', muscleGroup: 'abs' as const },
  { exerciseId: 'glute-bridge-001', muscleGroup: 'glutes' as const },
  { exerciseId: 'bird-dog-001', muscleGroup: 'lowerBack' as const },
];

type CalibrationStep = 'welcome' | 'exercise' | 'complete';

export default function Calibration() {
  const navigate = useNavigate();
  const { completeCalibration } = useUserStore();

  const [step, setStep] = useState<CalibrationStep>('welcome');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [calibrationData, setCalibrationData] = useState<CalibrationExercise[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const currentCalibrationExercise = CALIBRATION_EXERCISES[currentExerciseIndex];
  const currentExercise = currentCalibrationExercise
    ? getExerciseById(currentCalibrationExercise.exerciseId)
    : null;

  const handleStart = () => {
    setStep('exercise');
  };

  const handleSubmitExercise = () => {
    const value = parseInt(inputValue);

    if (!value || value <= 0) {
      setError('Please enter a valid number');
      return;
    }

    const exercise: CalibrationExercise = {
      exerciseId: currentCalibrationExercise.exerciseId,
      muscleGroup: currentCalibrationExercise.muscleGroup,
    };

    if (currentExercise?.type === 'reps') {
      exercise.achievedReps = value;
    } else {
      exercise.achievedDuration = value;
    }

    const newCalibrationData = [...calibrationData, exercise];
    setCalibrationData(newCalibrationData);
    setInputValue('');
    setError('');

    // Move to next exercise or complete
    if (currentExerciseIndex < CALIBRATION_EXERCISES.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Save calibration and navigate
      completeCalibration({
        calibrationDate: Date.now(),
        exercises: newCalibrationData,
      });
      setStep('complete');
    }
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">💪</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Welcome!
            </h1>
            <p className="text-gray-600 mb-6">
              Let's start by calibrating your current fitness level. This will help us create personalized workouts just for you.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 mb-2">What to expect:</h2>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 3 quick exercises to test</li>
              <li>• Takes about 10-15 minutes</li>
              <li>• Do your best, but don't overdo it</li>
              <li>• We'll use this to set your starting point</li>
            </ul>
          </div>

          <Button onClick={handleStart} fullWidth>
            Let's Begin
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              Great Job!
            </h1>
            <p className="text-gray-600 mb-8">
              Your calibration is complete. We'll use this data to create your first personalized workout.
            </p>

            <Button onClick={() => navigate('/')} fullWidth>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Exercise step
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{currentExerciseIndex + 1} of {CALIBRATION_EXERCISES.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${((currentExerciseIndex + 1) / CALIBRATION_EXERCISES.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Exercise card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <span className="inline-block bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full uppercase">
              {currentCalibrationExercise.muscleGroup}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {currentExercise?.name}
          </h2>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 leading-relaxed">
              {currentExercise?.description}
            </p>
          </div>

          {currentExercise?.videoUrl && (
            <a
              href={currentExercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:text-primary-dark mb-6"
            >
              <span className="mr-2">▶</span>
              Watch video tutorial
            </a>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Instructions:</h3>
            <p className="text-sm text-yellow-800">
              {currentExercise?.type === 'reps'
                ? 'Do as many reps as you can with good form. Stop when you can no longer maintain proper technique.'
                : 'Hold the position for as long as you can with proper form. Use the timer below to track your time.'}
            </p>
          </div>

          {/* Timer for timed exercises */}
          {currentExercise?.type === 'timed' && (
            <div className="mb-6">
              <Timer duration={600} countUp={true} showSecondsOnly={true} />
            </div>
          )}

          <div className="mb-6">
            <Input
              type="number"
              label={currentExercise?.type === 'reps' ? 'How many reps did you complete?' : 'How many seconds did you hold?'}
              placeholder={currentExercise?.type === 'reps' ? 'e.g., 12' : 'e.g., 30'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              error={error}
              min="1"
            />
          </div>

          <Button onClick={handleSubmitExercise} fullWidth>
            {currentExerciseIndex < CALIBRATION_EXERCISES.length - 1 ? 'Next Exercise' : 'Complete Calibration'}
          </Button>
        </div>
      </div>
    </div>
  );
}
