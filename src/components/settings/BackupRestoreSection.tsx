import { useState } from 'react';
import {
  buildBackupData,
  downloadBackupFile,
  parseBackupFile,
  parseBackupJSON,
  restoreBackupData,
  recordBackupExported,
  BackupData,
} from '../../lib/backup-restore';
import Button from '../common/Button';

/**
 * Export the user's full dataset (profile + workouts + history + notes +
 * strength history) to a JSON file, or restore it from a previously exported backup.
 */
export default function BackupRestoreSection() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPasteImport, setShowPasteImport] = useState(false);
  const [pastedJSON, setPastedJSON] = useState('');

  const handleExportData = async () => {
    try {
      setIsExporting(true);

      const exportData = await buildBackupData();
      downloadBackupFile(exportData);
      recordBackupExported(exportData.exportDate);
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to export data: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Shared by both the file-picker and paste-JSON import paths.
  const confirmAndRestore = async (importData: BackupData) => {
    if (
      !confirm(
        'This will replace all your current data with the backup. Are you sure you want to continue?'
      )
    ) {
      return;
    }

    await restoreBackupData(importData);

    alert('Data restored successfully! Reloading the app...');
    // Full reload (rather than just navigating) so every Zustand store re-initializes
    // from the freshly-restored data instead of keeping whatever it had cached in memory.
    window.location.href = '/';
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const importData = await parseBackupFile(file);
      await confirmAndRestore(importData);
    } catch (error) {
      console.error('Import failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to import data: ${message}`);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handlePasteImport = async () => {
    try {
      setIsImporting(true);
      const importData = parseBackupJSON(pastedJSON);
      await confirmAndRestore(importData);
    } catch (error) {
      console.error('Import failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to import data: ${message}`);
    } finally {
      setIsImporting(false);
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

        <button
          type="button"
          onClick={() => setShowPasteImport((prev) => !prev)}
          className="w-full text-xs text-text-muted hover:text-text underline"
        >
          {showPasteImport ? 'Hide paste option' : "Import not working? Paste backup JSON instead"}
        </button>

        {showPasteImport && (
          <div className="space-y-2">
            <p className="text-xs text-text-muted">
              Some Android browsers can't read files picked from the file browser. As a
              workaround, open the backup file in a text/notes app, copy all of its contents,
              and paste them below.
            </p>
            <textarea
              value={pastedJSON}
              onChange={(e) => setPastedJSON(e.target.value)}
              disabled={isImporting}
              rows={6}
              placeholder='{"version": "1.1", ...}'
              className="w-full px-3 py-2 bg-background border border-background-lighter text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted text-xs font-mono"
            />
            <Button
              onClick={handlePasteImport}
              fullWidth
              variant="secondary"
              disabled={isImporting || !pastedJSON.trim()}
            >
              {isImporting ? 'Importing...' : 'Restore From Pasted JSON'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
