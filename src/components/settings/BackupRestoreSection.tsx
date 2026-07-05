import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../store/user-store';
import { db } from '../../db/db';
import { loadUserProfile, saveUserProfile } from '../../utils/userProfile';
import Button from '../common/Button';

/**
 * Export the user's full dataset (profile + workouts + history) to a JSON file,
 * or restore it from a previously exported backup.
 */
export default function BackupRestoreSection() {
  const navigate = useNavigate();
  const { initializeUser } = useUserStore();
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

  return (
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
  );
}
