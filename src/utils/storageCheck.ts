/**
 * Storage availability and persistence checks
 * iOS Safari has known issues with IndexedDB persistence
 */

/**
 * Check if IndexedDB is available and working
 */
export const checkIndexedDBAvailable = async (): Promise<boolean> => {
  if (!window.indexedDB) {
    return false;
  }

  try {
    // Try to open a test database
    const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('__test__', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('test')) {
          db.createObjectStore('test');
        }
      };
    });

    testDB.close();

    // Clean up test database
    indexedDB.deleteDatabase('__test__');

    return true;
  } catch (error) {
    console.error('IndexedDB test failed:', error);
    return false;
  }
};

/**
 * Check if the app is in private browsing mode (iOS Safari limitation)
 */
export const checkPrivateBrowsing = async (): Promise<boolean> => {
  try {
    // Try to use localStorage as a proxy for private browsing detection
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);

    // Additional check for iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      // In iOS private mode, localStorage works but IndexedDB might not persist
      const available = await checkIndexedDBAvailable();
      if (!available) {
        return true; // Likely in private mode
      }
    }

    return false;
  } catch (e) {
    // If localStorage throws, we're likely in private mode
    return true;
  }
};

/**
 * Check storage quota and usage (if available)
 */
export const checkStorageQuota = async (): Promise<{ quota?: number; usage?: number; percent?: number }> => {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {};
  }

  try {
    const estimate = await navigator.storage.estimate();
    const quota = estimate.quota || 0;
    const usage = estimate.usage || 0;
    const percent = quota > 0 ? (usage / quota) * 100 : 0;

    return { quota, usage, percent };
  } catch (error) {
    console.error('Storage quota check failed:', error);
    return {};
  }
};

/**
 * Request persistent storage (helps prevent data deletion on iOS)
 */
export const requestPersistentStorage = async (): Promise<boolean> => {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  } catch (error) {
    console.error('Persistent storage request failed:', error);
    return false;
  }
};

/**
 * Check if storage is already persistent
 */
export const checkStoragePersisted = async (): Promise<boolean> => {
  if (!navigator.storage || !navigator.storage.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Storage persistence check failed:', error);
    return false;
  }
};

/**
 * Comprehensive storage health check
 */
export interface StorageHealthCheck {
  indexedDBAvailable: boolean;
  privateBrowsing: boolean;
  isPersisted: boolean;
  quota?: number;
  usage?: number;
  usagePercent?: number;
  isHealthy: boolean;
  warnings: string[];
}

export const performStorageHealthCheck = async (): Promise<StorageHealthCheck> => {
  const indexedDBAvailable = await checkIndexedDBAvailable();
  const privateBrowsing = await checkPrivateBrowsing();
  const isPersisted = await checkStoragePersisted();
  const { quota, usage, percent: usagePercent } = await checkStorageQuota();

  const warnings: string[] = [];

  if (!indexedDBAvailable) {
    warnings.push('IndexedDB is not available. Your data may not be saved.');
  }

  if (privateBrowsing) {
    warnings.push('You appear to be in private browsing mode. Data may not persist after closing the browser.');
  }

  if (!isPersisted) {
    warnings.push('Storage is not persistent. Your data might be cleared when storage is low.');
  }

  if (usagePercent && usagePercent > 80) {
    warnings.push('Storage is nearly full. Consider freeing up space to prevent data loss.');
  }

  const isHealthy = indexedDBAvailable && !privateBrowsing;

  return {
    indexedDBAvailable,
    privateBrowsing,
    isPersisted,
    quota,
    usage,
    usagePercent,
    isHealthy,
    warnings,
  };
};
