import { useEffect, useRef } from 'react';

/**
 * Custom hook to keep the screen awake during workouts
 * Uses the Screen Wake Lock API to prevent screen from turning off
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Screen Wake Lock acquired');

          // Re-acquire wake lock when page becomes visible again
          const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && wakeLockRef.current !== null) {
              try {
                wakeLockRef.current = await navigator.wakeLock.request('screen');
                console.log('Screen Wake Lock re-acquired');
              } catch (err) {
                console.warn('Could not re-acquire wake lock:', err);
              }
            }
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);

          return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          };
        }
      } catch (err) {
        console.warn('Wake Lock not supported or failed:', err);
      }
    };

    requestWakeLock();

    // Cleanup: release wake lock when component unmounts
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          console.log('Screen Wake Lock released');
          wakeLockRef.current = null;
        });
      }
    };
  }, []);

  return wakeLockRef;
}
