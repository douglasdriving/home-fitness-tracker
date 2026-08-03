/**
 * BackupReminder Component
 * Nudges the user to export a fresh backup periodically, since all data
 * lives only in this browser's storage and can be silently evicted.
 */

import { useState } from 'react';
import { useWorkoutStore } from '../../store/workout-store';
import {
  buildBackupData,
  downloadBackupFile,
  recordBackupExported,
  isBackupReminderDue,
} from '../../lib/backup-restore';
import Button from './Button';

export default function BackupReminder() {
  const { workoutHistory } = useWorkoutStore();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Only worth nagging once there's actually something to lose.
  const shouldShow = workoutHistory.length > 0 && isBackupReminderDue(Date.now());

  if (!shouldShow || isDismissed) {
    return null;
  }

  const handleBackupNow = async () => {
    try {
      setIsExporting(true);
      const exportData = await buildBackupData();
      downloadBackupFile(exportData);
      recordBackupExported(exportData.exportDate);
      setIsDismissed(true);
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Failed to create backup. Please try again from Settings.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mb-6 bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">💾</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-200 mb-1">Back Up Your Data</h3>
          <p className="text-sm text-blue-100/90 mb-3">
            Your workout history only lives in this browser and can be lost if storage is
            cleared or the app goes unused for a while. Export a fresh backup every couple of
            weeks to be safe.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={handleBackupNow} variant="secondary" disabled={isExporting}>
              {isExporting ? 'Backing up...' : 'Back Up Now'}
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-blue-200/70 hover:text-blue-200 underline"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
