import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { db } from '../db/db';
import Button from '../components/common/Button';
import DietTipsModal from '../components/common/DietTipsModal';
import StreakTracker from '../components/common/StreakTracker';
import StorageWarning from '../components/common/StorageWarning';

const STRETCH_STATE_KEY = 'stretchRoutineState';

interface StretchState {
  workoutId: string;
  currentStretchIndex: number;
  isResting: boolean;
  completedStretches: number[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { currentWorkout, loadWorkouts, generateNewWorkout, startWorkout, loadHistory, workoutHistory } =
    useWorkoutStore();
  const [newExerciseIds, setNewExerciseIds] = useState<Set<string>>(new Set());
  const [showDietTips, setShowDietTips] = useState(false);
  const [hasCompletedWorkoutToday, setHasCompletedWorkoutToday] = useState(false);
  const [timeConstraint, setTimeConstraint] = useState<string>('');
  const [activeStretchSession, setActiveStretchSession] = useState<StretchState | null>(null);

  useEffect(() => {
    // Load current workout and history
    loadWorkouts();
    loadHistory();
  }, [profile, loadWorkouts, loadHistory]);

  // Check for active stretch session
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STRETCH_STATE_KEY);
      if (savedState) {
        const state: StretchState = JSON.parse(savedState);
        setActiveStretchSession(state);
      } else {
        setActiveStretchSession(null);
      }
    } catch (error) {
      console.error('Failed to check stretch session:', error);
      setActiveStretchSession(null);
    }
  }, []);

  // Check if user has completed a workout today
  useEffect(() => {
    const checkTodayWorkout = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      const history = await db.history.toArray();
      const hasWorkoutToday = history.some(
        (workout) => workout.completedDate >= todayTimestamp
      );

      setHasCompletedWorkoutToday(hasWorkoutToday);
    };

    checkTodayWorkout();
  }, [workoutHistory]);

  // Check which exercises in current workout are new
  useEffect(() => {
    const checkNewExercises = async () => {
      if (!currentWorkout) {
        setNewExerciseIds(new Set());
        return;
      }

      const history = await db.history.toArray();
      const newIds = new Set<string>();

      for (const exercise of currentWorkout.exercises) {
        const hasBeenDone = history.some(workout =>
          workout.exercises.some(ex => ex.exerciseId === exercise.exerciseId)
        );
        if (!hasBeenDone) {
          newIds.add(exercise.exerciseId);
        }
      }

      setNewExerciseIds(newIds);
    };

    checkNewExercises();
  }, [currentWorkout]);

  const handleGenerateWorkout = async () => {
    try {
      const timeLimit = timeConstraint ? parseInt(timeConstraint) : undefined;
      await generateNewWorkout(timeLimit);
      setTimeConstraint(''); // Reset after generation
    } catch (error) {
      console.error('Error generating workout:', error);
      alert('Failed to generate workout. Please try again.');
    }
  };

  const handleStartWorkout = async () => {
    if (!currentWorkout) return;

    try {
      await startWorkout(currentWorkout.id);
      navigate('/workout');
    } catch (error) {
      console.error('Error starting workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  };

  const handleResumeStretching = () => {
    if (activeStretchSession) {
      navigate('/stretching', { state: { workoutId: activeStretchSession.workoutId } });
    }
  };

  const handleDismissStretching = () => {
    if (confirm('Are you sure you want to abandon the stretching routine? Your progress will be lost.')) {
      try {
        localStorage.removeItem(STRETCH_STATE_KEY);
        setActiveStretchSession(null);
      } catch (error) {
        console.error('Failed to clear stretch session:', error);
      }
    }
  };

  if (!profile) {
    return (
      <div className="bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Storage Warning */}
        <StorageWarning />

        {/* Streak Tracker */}
        <StreakTracker />

        {/* Resume Stretching Banner */}
        {activeStretchSession && (
          <div className="bg-purple-50 border-l-4 border-purple-600 rounded-lg p-4 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧘</span>
                <div>
                  <h3 className="font-semibold text-purple-900">Stretching In Progress</h3>
                  <p className="text-sm text-purple-700">
                    You have an active stretching session (stretch {activeStretchSession.currentStretchIndex + 1})
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResumeStretching}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Resume Stretching
              </button>
              <button
                onClick={handleDismissStretching}
                className="bg-purple-100 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-200 transition-colors font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Next Workout / Generate Workout */}
        {currentWorkout ? (
          <div className="bg-background-light rounded-lg shadow-lg p-6 border-l-4 border-primary">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-display font-bold text-text-bright">
                WORKOUT #{currentWorkout.workoutNumber}
              </h2>
              <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                {currentWorkout.estimatedDuration} min
              </span>
            </div>

            <div className="space-y-3">
              {currentWorkout.exercises.map((exercise, idx) => {
                const isNew = newExerciseIds.has(exercise.exerciseId);
                const targetValue =
                  exercise.sets[0].targetReps ||
                  (exercise.sets[0].targetDuration ? `${exercise.sets[0].targetDuration}s` : '');

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      isNew ? 'bg-primary/5 border border-primary/20' : 'bg-background'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-text">{exercise.exerciseName}</div>
                        {isNew && (
                          <span className="text-xs bg-primary text-background px-2 py-0.5 rounded-full font-bold">
                            NEW
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-text-muted">
                        {isNew
                          ? `${exercise.sets.length} sets`
                          : `${exercise.sets.length} sets × ${targetValue}`
                        }
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {exercise.muscleGroups.map((mg, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary text-background px-2 py-1 rounded-full uppercase"
                        >
                          {mg}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button onClick={handleStartWorkout} fullWidth>
              {currentWorkout.status === 'in-progress' ? 'Continue' : 'Start'}
            </Button>
          </div>
        ) : (
          <div className="bg-background-light rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-text mb-4">Generate New Workout</h2>

            {/* Time Constraint Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text mb-2">
                Time limit (optional)
              </label>
              <input
                type="number"
                value={timeConstraint}
                onChange={(e) => setTimeConstraint(e.target.value)}
                placeholder="e.g., 15 minutes"
                min="5"
                max="60"
                className="w-full px-4 py-3 bg-background border border-background-lighter text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted"
              />
              <p className="text-xs text-text-muted mt-1">
                Leave empty for a regular workout, or set a time limit for a shorter session.
              </p>
            </div>

            <Button onClick={handleGenerateWorkout} fullWidth>
              Generate Workout
            </Button>
          </div>
        )}

        {/* Challenge Journey Promotion - HIDDEN (Work in Progress) */}
        {/* {profile.calibrationCompleted && (
          <div
            onClick={() => navigate('/challenges')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 cursor-pointer hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center justify-between text-white">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🏆</span>
                  <h3 className="text-xl font-bold">Challenge Journey</h3>
                </div>
                <p className="text-white/90 text-sm mb-3">
                  Take on core calisthenics challenges and climb the ladder from beginner to legend!
                </p>
                {profile.challengeState ? (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-bold">
                      Level {profile.challengeState.currentLevel} / 7
                    </span>
                    <span>•</span>
                    <span>{profile.challengeState.totalChallengesCompleted} completed</span>
                  </div>
                ) : (
                  <div className="inline-block bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                    Start Your Journey →
                  </div>
                )}
              </div>
              <div className="text-4xl ml-4">→</div>
            </div>
          </div>
        )} */}

        {/* Diet Tips Button - Show after completing workout today */}
        {hasCompletedWorkoutToday && !currentWorkout && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-2">🥗</span>
              <h3 className="font-semibold text-green-900">Post-Workout Nutrition</h3>
            </div>
            <p className="text-sm text-green-800 mb-3">
              You've completed your workout! Check out nutrition tips to optimize your recovery.
            </p>
            <button
              onClick={() => setShowDietTips(true)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              View Diet Tips
            </button>
          </div>
        )}
      </div>

      {/* Diet Tips Modal */}
      {showDietTips && <DietTipsModal onClose={() => setShowDietTips(false)} />}
    </div>
  );
}
