import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { useWorkoutStore } from '../store/workout-store';
import { db } from '../db/db';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile';
import { getExerciseById } from '../data/exerciseData';
import { format } from 'date-fns';
import Button from '../components/common/Button';
import { allExercises } from '../data/exerciseData';
import { seedWorkoutHistory, clearWorkoutHistory } from '../utils/seedData';
import { isIOS, isStandalone } from '../utils/deviceDetection';
import IOSInstallPrompt from '../components/common/IOSInstallPrompt';
import { calculateEstimatedDuration, findLastPerformanceWithFeedback } from '../lib/workout-generator';
import { calculateProgressionWithFeedback, calculateMcgillProgression, convertLegacyToMcgill } from '../lib/progression-calculator';
import type { Workout, WorkoutExercise, Set, WorkoutHistoryEntry } from '../types/workout';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, initializeUser, updateEquipment, updatePreferences, includeExercise } = useUserStore();
  const { loadWorkouts } = useWorkoutStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<(Event & { prompt(): void; userChoice: Promise<{ outcome: string }> }) | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Custom workout builder state
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [customSetsCount, setCustomSetsCount] = useState(4);
  const [isCreatingCustomWorkout, setIsCreatingCustomWorkout] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as Event & { prompt(): void; userChoice: Promise<{ outcome: string }> });
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user's response
      await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Install error:', error);
      alert('Failed to install app. Please try again.');
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      // Get all data
      const userProfile = loadUserProfile();
      const workouts = await db.workouts.toArray();
      const history = await db.history.toArray();

      const exportData = {
        version: '1.0',
        exportDate: Date.now(),
        userProfile,
        workouts,
        history,
      };

      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fitness-tracker-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);

      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import data
      if (!importData.version || !importData.userProfile) {
        throw new Error('Invalid backup file');
      }

      // Confirm before restoring
      if (
        !confirm(
          'This will replace all your current data with the backup. Are you sure you want to continue?'
        )
      ) {
        setIsImporting(false);
        return;
      }

      // Clear existing data
      await db.workouts.clear();
      await db.history.clear();

      // Restore user profile
      saveUserProfile(importData.userProfile);

      // Restore workouts
      if (importData.workouts && importData.workouts.length > 0) {
        await db.workouts.bulkAdd(importData.workouts);
      }

      // Restore history
      if (importData.history && importData.history.length > 0) {
        await db.history.bulkAdd(importData.history);
      }

      // Reinitialize user
      initializeUser();

      alert('Data restored successfully!');
      navigate('/');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please make sure you selected a valid backup file.');
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleResetFitnessLevels = () => {
    if (
      !confirm(
        'This will reset your strength levels to the default starting point. The app will re-adapt to your fitness level based on your next workouts. Continue?'
      )
    ) {
      return;
    }

    if (profile) {
      const DEFAULT_STRENGTH_LEVEL = 25;
      const updatedProfile: typeof profile = {
        ...profile,
        calibrationCompleted: true,
        calibrationData: undefined,
        strengthLevels: {
          abs: DEFAULT_STRENGTH_LEVEL,
          glutes: DEFAULT_STRENGTH_LEVEL,
          lowerBack: DEFAULT_STRENGTH_LEVEL,
          lastUpdated: Date.now(),
        },
      };
      saveUserProfile(updatedProfile);
      initializeUser();
      alert('Your fitness levels have been reset. Start a new workout to re-establish your baseline.');
      navigate('/');
    }
  };

  const handleClearAllData = async () => {
    if (
      !confirm(
        'This will permanently delete ALL your data including workouts, history, and calibration. This action cannot be undone. Are you sure?'
      )
    ) {
      return;
    }

    if (!confirm('Are you ABSOLUTELY sure? This will delete everything!')) {
      return;
    }

    try {
      // Clear database
      await db.workouts.clear();
      await db.history.clear();
      await db.strengthHistory.clear();
      await db.exerciseNotes.clear();

      // Clear user profile
      localStorage.clear();

      alert('All data has been cleared.');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  const handleSeedWorkoutHistory = async () => {
    try {
      setIsSeeding(true);
      await seedWorkoutHistory();
      alert('Successfully seeded 15 workout history entries! Navigate to History or Progress tabs to see the data.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // User cancelled - do nothing
        return;
      }
      console.error('Failed to seed workout history:', error);
      alert('Failed to seed workout history. Please try again.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearWorkoutHistory = async () => {
    try {
      await clearWorkoutHistory();
      alert('Workout history cleared successfully.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        // User cancelled - do nothing
        return;
      }
      console.error('Failed to clear workout history:', error);
      alert('Failed to clear workout history. Please try again.');
    }
  };

  const handleCreateCustomWorkout = async () => {
    if (selectedExerciseIds.length === 0) {
      alert('Please select at least one exercise.');
      return;
    }

    try {
      setIsCreatingCustomWorkout(true);

      // Delete any existing pending/in-progress workouts (matches pattern in workout-store.ts)
      await db.workouts.where('status').anyOf(['pending', 'in-progress']).delete();

      // Get next workout number
      const historyCount = await db.history.count();
      const workoutNumber = historyCount + 1;

      // Get workout history for progressive overload
      const workoutHistory: WorkoutHistoryEntry[] = await db.history
        .orderBy('completedDate')
        .reverse()
        .toArray();

      // Build workout exercises
      const workoutExercises: WorkoutExercise[] = selectedExerciseIds.map((exerciseId) => {
        const exercise = getExerciseById(exerciseId);
        if (!exercise) {
          throw new Error(`Exercise not found: ${exerciseId}`);
        }

        const isMcgill = exercise.structure === 'mcgill';

        // Look up last performance for progressive overload
        const lastPerformanceData = findLastPerformanceWithFeedback(exerciseId, workoutHistory);

        let sets: Set[];

        if (isMcgill && exercise.mcgillDefaults) {
          // McGill protocol: use progression from history or defaults
          let rounds: number[];
          let holdDuration: number;

          if (lastPerformanceData !== null) {
            const feedback = lastPerformanceData.feedback ?? 3;

            if (lastPerformanceData.mcgillRounds && lastPerformanceData.mcgillHoldDuration) {
              const progression = calculateMcgillProgression(
                lastPerformanceData.mcgillRounds,
                lastPerformanceData.mcgillHoldDuration,
                feedback
              );
              rounds = progression.rounds;
              holdDuration = progression.holdDuration;
            } else {
              // Convert legacy single-hold to McGill
              const converted = convertLegacyToMcgill(lastPerformanceData.performance);
              rounds = converted.rounds;
              holdDuration = converted.holdDuration;

              if (feedback !== 3) {
                const progression = calculateMcgillProgression(rounds, holdDuration, feedback);
                rounds = progression.rounds;
                holdDuration = progression.holdDuration;
              }
            }
          } else {
            rounds = exercise.mcgillDefaults.rounds;
            holdDuration = exercise.mcgillDefaults.holdDuration;
          }

          // Create sets with McGill protocol structure
          // Use customSetsCount but map to rounds array (cycle last value if more sets than rounds)
          sets = Array.from({ length: customSetsCount }, (_, i) => {
            const roundsIndex = Math.min(i, rounds.length - 1);
            const roundCount = rounds[roundsIndex] ?? rounds[rounds.length - 1] ?? 3;
            return {
              setNumber: i + 1,
              targetDuration: roundCount * holdDuration,
              completed: false,
              mcgillRounds: roundCount,
              mcgillHoldDuration: holdDuration,
            };
          });
        } else {
          // Standard exercise: use progression from history or defaults
          let targetValue: number;

          if (lastPerformanceData !== null) {
            const feedback = lastPerformanceData.feedback ?? 3;
            targetValue = calculateProgressionWithFeedback(
              lastPerformanceData.performance,
              exercise.type,
              feedback
            );
          } else if (exercise.type === 'reps') {
            targetValue = exercise.defaultReps ?? 10;
          } else {
            targetValue = exercise.defaultDuration ?? 30;
          }

          sets = Array.from({ length: customSetsCount }, (_, i) => ({
            setNumber: i + 1,
            targetReps: exercise.type === 'reps' ? targetValue : undefined,
            targetDuration: exercise.type === 'timed' ? targetValue : undefined,
            completed: false,
          }));
        }

        // Calculate rest time (matches workout-generator.ts:281-282)
        const restTime = Math.round(30 + (exercise.heavinessScore[exercise.primaryMuscleGroup] / 10) * 30);

        return {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroups: exercise.muscleGroups,
          sets,
          restTime,
        };
      });

      // Calculate estimated duration
      const estimatedDuration = calculateEstimatedDuration(workoutExercises);

      // Build workout object
      const workout: Workout = {
        id: `workout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workoutNumber,
        generatedDate: Date.now(),
        status: 'pending',
        estimatedDuration,
        exercises: workoutExercises,
        workoutMode: 'full-body',
      };

      // Save to database
      await db.workouts.add(workout);

      // Refresh workout store
      await loadWorkouts();

      // Navigate to dashboard
      navigate('/');
    } catch (error) {
      console.error('Failed to create custom workout:', error);
      alert('Failed to create custom workout. Please try again.');
    } finally {
      setIsCreatingCustomWorkout(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Calibration Data */}
        {profile?.calibrationData && profile.calibrationCompleted && (
          <div className="border-b border-background-lighter pb-6">
            <h2 className="text-lg font-semibold text-text mb-4">Calibration Results</h2>
            <div className="mb-4 text-sm text-text-muted">
              Completed on {format(new Date(profile.calibrationData.calibrationDate), 'MMM d, yyyy')}
            </div>
            <div className="space-y-3">
              {profile.calibrationData.exercises.map((exercise, idx) => {
                const exerciseData = getExerciseById(exercise.exerciseId);
                return (
                  <div key={idx} className="bg-background-light rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-text">{exerciseData?.name}</div>
                        <div className="text-xs text-text-muted capitalize">{exercise.muscleGroup}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {exercise.achievedReps
                            ? `${exercise.achievedReps} reps`
                            : `${exercise.achievedDuration}s`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Equipment */}
        <div className="border-b border-background-lighter pb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Equipment</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-background-light rounded-lg cursor-pointer hover:bg-background-lighter transition-colors">
              <input
                type="checkbox"
                checked={profile?.equipment?.hasElasticBands || false}
                onChange={(e) => updateEquipment({ hasElasticBands: e.target.checked })}
                className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
              />
              <div>
                <div className="font-medium text-text">Elastic Loop Bands</div>
                <div className="text-xs text-text-muted">
                  Includes elastic loop band exercises like clamshells and fire hydrants.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Preferences */}
        <div className="border-b border-background-lighter pb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-background-light rounded-lg cursor-pointer hover:bg-background-lighter transition-colors">
              <input
                type="checkbox"
                checked={profile?.preferences?.autoShowStretching ?? true}
                onChange={(e) => updatePreferences({ autoShowStretching: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-600"
              />
              <div>
                <div className="font-medium text-text">Post-Workout Stretching</div>
                <div className="text-xs text-text-muted">
                  Automatically show stretching routine option after completing workouts.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Excluded Exercises */}
        {profile?.excludedExercises && profile.excludedExercises.length > 0 && (
          <div className="border-b border-background-lighter pb-6">
            <h2 className="text-lg font-semibold text-text mb-4">Excluded Exercises</h2>
            <p className="text-sm text-text-muted mb-4">
              These exercises won't appear in your workouts. Tap to include them again.
            </p>
            <div className="space-y-2">
              {profile.excludedExercises.map((exerciseId) => {
                const exercise = allExercises.find((ex) => ex.id === exerciseId);
                if (!exercise) return null;
                return (
                  <div
                    key={exerciseId}
                    className="flex items-center justify-between p-3 bg-background-light rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-text">{exercise.emoji} {exercise.name}</div>
                      <div className="text-xs text-text-muted capitalize">
                        {exercise.muscleGroups.join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => includeExercise(exerciseId)}
                      className="px-3 py-1 text-sm bg-primary text-background rounded hover:bg-primary-light transition-colors"
                    >
                      Include
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Install App */}
        {/* Show iOS instructions if on iOS and not already installed */}
        {isIOS() && !isStandalone() && <IOSInstallPrompt />}

        {/* Show standard install button for Android/Desktop */}
        {isInstallable && !isIOS() && (
          <div className="border-b border-background-lighter pb-6">
            <h2 className="text-lg font-semibold text-text mb-4">Install App</h2>
            <p className="text-sm text-text-muted mb-4">
              Install this app on your device for a better experience. You can access it offline and from your home screen.
            </p>
            <Button onClick={handleInstallApp} fullWidth>
              Install App
            </Button>
          </div>
        )}


        {/* Development Tools */}
        {import.meta.env.MODE === 'development' && (
          <div className="border-b border-background-lighter pb-6">
            <h2 className="text-lg font-semibold text-text mb-4">Development Tools</h2>
            <p className="text-sm text-text-muted mb-4">
              These tools are only available in development mode. Use them to quickly populate test data.
            </p>

            <div className="space-y-6">
              {/* Custom Workout Builder */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold text-text mb-2">Custom Workout Builder</h3>

                {/* Exercise Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-text">
                      Select Exercises ({selectedExerciseIds.length}/4)
                    </label>
                    {selectedExerciseIds.length > 0 && (
                      <button
                        onClick={() => setSelectedExerciseIds([])}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-background-lighter rounded-lg bg-background-light">
                    {allExercises.map((exercise) => {
                      const isSelected = selectedExerciseIds.includes(exercise.id);
                      const isDisabled = !isSelected && selectedExerciseIds.length >= 4;

                      return (
                        <label
                          key={exercise.id}
                          className={`flex items-center p-2 border-b border-background-lighter last:border-b-0 ${
                            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-background-lighter/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExerciseIds([...selectedExerciseIds, exercise.id]);
                              } else {
                                setSelectedExerciseIds(selectedExerciseIds.filter((id) => id !== exercise.id));
                              }
                            }}
                            className="mr-3"
                          />
                          <span className="text-lg mr-2">{exercise.emoji}</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-text">{exercise.name}</div>
                            <div className="text-xs text-text-muted">
                              {exercise.muscleGroups.join(', ')} • {exercise.type === 'reps' ? 'Reps' : 'Timed'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Sets Selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text">Sets per Exercise</label>
                  <select
                    value={customSetsCount}
                    onChange={(e) => setCustomSetsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background-light border border-background-lighter text-text"
                  >
                    {[1, 2, 3, 4, 5, 6].map((count) => (
                      <option key={count} value={count}>
                        {count} {count === 1 ? 'set' : 'sets'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateCustomWorkout}
                  fullWidth
                  disabled={selectedExerciseIds.length === 0 || isCreatingCustomWorkout}
                >
                  {isCreatingCustomWorkout ? 'Creating...' : 'Create Custom Workout'}
                </Button>
              </div>

              {/* Seed/Clear History Tools */}
              <div className="space-y-3 pt-3 border-t border-background-lighter">
                <Button onClick={handleSeedWorkoutHistory} fullWidth disabled={isSeeding}>
                  {isSeeding ? 'Seeding...' : 'Seed Workout History (15 workouts)'}
                </Button>

                <button
                  onClick={handleClearWorkoutHistory}
                  className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-background-lighter text-text hover:bg-background-lighter/80"
                >
                  Clear Workout History
                </button>
              </div>
            </div>

            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-200">
                <strong>Note:</strong> Seed data will create 15 realistic workouts spanning 6 weeks with progressive performance improvements.
                This is helpful for testing features like history display, progress tracking, and progressive overload.
              </p>
            </div>
          </div>
        )}

        {/* Backup & Restore */}
        <div className="border-b border-background-lighter pb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Backup & Restore</h2>
          <p className="text-sm text-text-muted mb-4">
            Export your data to keep a backup, or restore from a previous backup.
          </p>

          <div className="space-y-3">
            <Button onClick={handleExportData} fullWidth disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>

            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                disabled={isImporting}
                className="hidden"
                id="import-file"
              />
              <label htmlFor="import-file" className="block">
                <div
                  className={`w-full px-6 py-3 rounded-lg font-medium text-center transition-colors cursor-pointer ${
                    isImporting
                      ? 'bg-background-lighter text-text-muted cursor-not-allowed'
                      : 'bg-background-lighter text-text hover:bg-background-lighter/80'
                  }`}
                >
                  {isImporting ? 'Importing...' : 'Import Data'}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-red-400/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
          <p className="text-sm text-text-muted mb-4">
            These actions cannot be undone. Use with caution.
          </p>

          <div className="space-y-3">
            <Button onClick={handleResetFitnessLevels} variant="outline" fullWidth>
              Reset Fitness Levels
            </Button>

            <button
              onClick={handleClearAllData}
              className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
