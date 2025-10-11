import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/user-store';
import { db } from '../db/db';
import { loadUserProfile, saveUserProfile } from '../utils/userProfile';
import Button from '../components/common/Button';

export default function Settings() {
  const navigate = useNavigate();
  const { profile, initializeUser } = useUserStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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
        {/* User Info */}
        {profile && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">User ID:</span>
                <span className="font-mono text-gray-800">{profile.userId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Calibration:</span>
                <span className="text-gray-800">
                  {profile.calibrationCompleted ? 'Completed' : 'Not completed'}
                </span>
              </div>
            </div>
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

        {/* App Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">About</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex justify-between">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Built with:</span>
              <span>React + TypeScript</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
