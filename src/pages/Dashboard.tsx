import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { db } from '../db/db';
import Button from '../components/common/Button';
import StreakTracker from '../components/common/StreakTracker';
import StorageWarning from '../components/common/StorageWarning';
import { getExerciseEmoji } from '../data/exerciseData';
import { getNextDailyRotationGroup } from '../lib/workout-generator';
import { MuscleGroup } from '../types/exercise';

const STRETCH_STATE_KEY = 'stretchRoutineState';
const WARMUP_STATE_KEY = 'warmupRoutineState';

// Display labels for the daily rotation muscle groups (handles multiword names)
const ROTATION_GROUP_LABELS: Record<MuscleGroup, string> = {
  abs: 'Abs',
  glutes: 'Glutes',
  lowerBack: 'Lower Back',
  upperBody: 'Upper Body',
};

interface StretchState {
  workoutId: string;
  currentStretchIndex: number;
  isResting: boolean;
  completedStretches: number[];
}

interface WarmupState {
  workoutId: string;
  currentWarmupIndex: number;
  completedWarmups: number[];
  targetMuscleGroup?: MuscleGroup;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useUserStore();
  const { currentWorkout, loadWorkouts, generateNewWorkout, generateDailyRotationWorkout, startWorkout, discardWorkout, loadHistory, workoutHistory } =
    useWorkoutStore();
  const [newExerciseIds, setNewExerciseIds] = useState<Set<string>>(new Set());
  const [timeConstraint, setTimeConstraint] = useState<string>('');
  const [activeStretchSession, setActiveStretchSession] = useState<StretchState | null>(null);
  const [activeWarmupSession, setActiveWarmupSession] = useState<WarmupState | null>(null);
  const [nextDailyRotationGroup, setNextDailyRotationGroup] = useState<MuscleGroup>('abs');

  useEffect(() => {
    // Load current workout and history
    loadWorkouts();
    loadHistory();
  }, [profile, loadWorkouts, loadHistory]);

  // Determine next daily rotation muscle group
  useEffect(() => {
    if (workoutHistory.length > 0) {
      const nextGroup = getNextDailyRotationGroup(workoutHistory);
      setNextDailyRotationGroup(nextGroup);
    }
  }, [workoutHistory]);

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

  // Check for active warmup session
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(WARMUP_STATE_KEY);
      if (savedState) {
        const state: WarmupState = JSON.parse(savedState);
        setActiveWarmupSession(state);
      } else {
        setActiveWarmupSession(null);
      }
    } catch (error) {
      console.error('Failed to check warmup session:', error);
      setActiveWarmupSession(null);
    }
  }, []);

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

  const handleGenerateDailyRotation = async () => {
    try {
      await generateDailyRotationWorkout();
    } catch (error) {
      console.error('Error generating daily rotation workout:', error);
      alert('Failed to generate workout. Please try again.');
    }
  };

  const handleStartWorkout = async () => {
    if (!currentWorkout) return;

    try {
      // Only run the warmup when starting a fresh workout — resuming an
      // in-progress session goes straight back into the workout.
      const isResuming = currentWorkout.status === 'in-progress';
      const autoShowWarmup = profile?.preferences?.autoShowWarmup ?? true;

      await startWorkout(currentWorkout.id);

      if (autoShowWarmup && !isResuming) {
        navigate('/warmup', {
          state: {
            workoutId: currentWorkout.id,
            targetMuscleGroup: currentWorkout.targetMuscleGroup,
          },
        });
      } else {
        navigate('/workout');
      }
    } catch (error) {
      console.error('Error starting workout:', error);
      alert('Failed to start workout. Please try again.');
    }
  };

  const handleDiscardWorkout = async () => {
    if (!currentWorkout) return;
    if (!confirm('Discard this workout plan?')) return;

    try {
      await discardWorkout();
    } catch (error) {
      console.error('Error discarding workout:', error);
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

  const handleResumeWarmup = () => {
    if (activeWarmupSession) {
      navigate('/warmup', {
        state: {
          workoutId: activeWarmupSession.workoutId,
          targetMuscleGroup: activeWarmupSession.targetMuscleGroup,
        },
      });
    }
  };

  const handleDismissWarmup = () => {
    if (confirm('Are you sure you want to abandon the warmup? Your progress will be lost.')) {
      try {
        localStorage.removeItem(WARMUP_STATE_KEY);
        setActiveWarmupSession(null);
      } catch (error) {
        console.error('Failed to clear warmup session:', error);
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

        {/* Resume Warmup Banner */}
        {activeWarmupSession && (
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-lg">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <h3 className="font-semibold text-orange-900">Warmup In Progress</h3>
                  <p className="text-sm text-orange-700">
                    You have an active warmup (move {activeWarmupSession.currentWarmupIndex + 1})
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResumeWarmup}
                className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Resume Warmup
              </button>
              <button
                onClick={handleDismissWarmup}
                className="bg-orange-100 text-orange-700 py-2 px-4 rounded-lg hover:bg-orange-200 transition-colors font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

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
              <div>
                <h2 className="text-2xl font-display font-bold text-text-bright">
                  {currentWorkout.workoutMode === 'daily-rotation'
                    ? `DAILY FOCUS: ${currentWorkout.targetMuscleGroup?.toUpperCase()} #${currentWorkout.workoutNumber}`
                    : `FULL CORE WORKOUT #${currentWorkout.workoutNumber}`}
                </h2>
                <span className="text-xs text-text-muted">
                  {currentWorkout.workoutMode === 'daily-rotation' ? 'Daily Rotation Mode' : 'Full Body Mode'}
                </span>
              </div>
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
                        <div className="font-semibold text-text">{getExerciseEmoji(exercise.exerciseId)} {exercise.exerciseName}</div>
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

            <button
              onClick={handleDiscardWorkout}
              className="w-full mt-2 py-2 text-sm text-text-muted hover:text-red-500 transition-colors"
            >
              Discard workout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-text">Choose Your Workout Mode</h2>

            {/* Daily Focus Session Card */}
            <div className="bg-background-light rounded-lg shadow-lg p-6 border-l-4 border-purple-600">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-text">🎯 Daily Focus Session</h3>
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-semibold">
                    SHORTER
                  </span>
                </div>
                <p className="text-sm text-text-muted mb-3">
                  3 exercises focusing on one muscle group. Faster, focused workout with muscle-group rotation.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                    ~18-20 min
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded font-medium">
                    Next: {ROTATION_GROUP_LABELS[nextDailyRotationGroup]}
                  </span>
                </div>
              </div>
              <Button onClick={handleGenerateDailyRotation} fullWidth variant="primary">
                Generate Daily Focus
              </Button>
            </div>

            {/* Full Core Workout Card */}
            <div className="bg-background-light rounded-lg shadow-lg p-6 border-l-4 border-primary">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-text">💪 Full Core Workout</h3>
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold">
                    COMPLETE
                  </span>
                </div>
                <p className="text-sm text-text-muted mb-3">
                  4 exercises covering all muscle groups (abs, glutes, lower back). Comprehensive full-body core training.
                </p>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                    ~30-60 min
                  </span>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                    All muscle groups
                  </span>
                </div>

                {/* Time Constraint Input */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Time limit (optional)
                  </label>
                  <input
                    type="number"
                    value={timeConstraint}
                    onChange={(e) => setTimeConstraint(e.target.value)}
                    placeholder="e.g., 30 minutes"
                    min="5"
                    max="60"
                    className="w-full px-3 py-2 bg-background border border-background-lighter text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleGenerateWorkout} fullWidth variant="primary">
                Generate Full Workout
              </Button>
            </div>
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

      </div>
    </div>
  );
}
