import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { db } from '../db/db';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile';
import { getExerciseById } from '../data/exerciseData';
import { format } from 'date-fns';
import Button from '../components/common/Button';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, initializeUser } = useUserStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
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
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }

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

  const handleResetCalibration = () => {
    if (
      !confirm(
        'This will reset your calibration and strength levels. You will need to complete the calibration process again. Continue?'
      )
    ) {
      return;
    }

    if (profile) {
      const updatedProfile: typeof profile = {
        ...profile,
        calibrationCompleted: false,
        calibrationData: undefined,
        strengthLevels: {
          abs: 0,
          glutes: 0,
          lowerBack: 0,
          lastUpdated: Date.now(),
        },
      };
      saveUserProfile(updatedProfile);
      initializeUser();
      navigate('/calibration');
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

      // Clear user profile
      localStorage.clear();

      alert('All data has been cleared.');
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to clear data:', error);
      alert('Failed to clear data. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-4">
        {/* Calibration Data */}
        {profile?.calibrationData && profile.calibrationCompleted && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Calibration Results</h2>
            <div className="mb-4 text-sm text-gray-600">
              Completed on {format(new Date(profile.calibrationData.calibrationDate), 'MMM d, yyyy')}
            </div>
            <div className="space-y-3">
              {profile.calibrationData.exercises.map((exercise, idx) => {
                const exerciseData = getExerciseById(exercise.exerciseId);
                return (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">{exerciseData?.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{exercise.muscleGroup}</div>
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

        {/* Install App */}
        {isInstallable && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Install App</h2>
            <p className="text-sm text-gray-600 mb-4">
              Install this app on your device for a better experience. You can access it offline and from your home screen.
            </p>
            <Button onClick={handleInstallApp} fullWidth>
              Install App
            </Button>
          </div>
        )}

        {/* Backup & Restore */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Backup & Restore</h2>
          <p className="text-sm text-gray-600 mb-4">
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
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {isImporting ? 'Importing...' : 'Import Data'}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            These actions cannot be undone. Use with caution.
          </p>

          <div className="space-y-3">
            <Button onClick={handleResetCalibration} variant="outline" fullWidth>
              Reset Calibration
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
