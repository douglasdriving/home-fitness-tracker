/**
 * StorageWarning Component
 * Displays warnings about storage availability and persistence issues
 */

import { useState, useEffect } from 'react';
import { performStorageHealthCheck, StorageHealthCheck, requestPersistentStorage } from '../../utils/storageCheck';
import Button from './Button';

export default function StorageWarning() {
  const [healthCheck, setHealthCheck] = useState<StorageHealthCheck | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isRequestingPersistence, setIsRequestingPersistence] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      const result = await performStorageHealthCheck();
      setHealthCheck(result);

      // Auto-request persistent storage if not already persistent
      if (!result.isPersisted && result.indexedDBAvailable) {
        await requestPersistentStorage();
      }
    };

    checkStorage();
  }, []);

  const handleRequestPersistence = async () => {
    setIsRequestingPersistence(true);
    const granted = await requestPersistentStorage();

    if (granted) {
      // Refresh health check
      const result = await performStorageHealthCheck();
      setHealthCheck(result);
    } else {
      alert('Persistent storage request was denied. Your browser may clear data when storage is low.');
    }

    setIsRequestingPersistence(false);
  };

  if (!healthCheck || isDismissed || healthCheck.isHealthy) {
    return null;
  }

  return (
    <div className="mb-6 bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-200 mb-2">Storage Warning</h3>
          <div className="space-y-2 text-sm text-yellow-100/90">
            {healthCheck.warnings.map((warning, index) => (
              <p key={index}>• {warning}</p>
            ))}
          </div>

          {healthCheck.privateBrowsing && (
            <div className="mt-3 p-3 bg-yellow-800/30 rounded border border-yellow-600/30">
              <p className="text-xs text-yellow-100/80">
                <strong>iOS Users:</strong> If you're using Safari, make sure you're not in Private Browsing mode.
                Your workout data will not be saved in Private mode.
              </p>
            </div>
          )}

          {!healthCheck.isPersisted && healthCheck.indexedDBAvailable && (
            <div className="mt-3 flex gap-2">
              <Button
                onClick={handleRequestPersistence}
                variant="secondary"
                disabled={isRequestingPersistence}
              >
                {isRequestingPersistence ? 'Requesting...' : 'Request Persistent Storage'}
              </Button>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs text-yellow-200/70 hover:text-yellow-200 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
