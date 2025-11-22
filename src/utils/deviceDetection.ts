/**
 * Utility functions for device detection
 */

/**
 * Detects if the current device is running iOS
 */
export const isIOS = (): boolean => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

/**
 * Detects if the app is running in standalone mode (installed PWA)
 */
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

/**
 * Detects if the device is iOS Safari (not in-app browser)
 */
export const isIOSSafari = (): boolean => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return isIOS() && /safari/.test(userAgent) && !/crios|fxios/.test(userAgent);
};
