/**
 * PWA helper utilities for iOS standalone mode
 */

/**
 * Check if running in iOS standalone mode (installed PWA)
 */
export const isIOSStandalone = (): boolean => {
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
};

/**
 * Initialize PWA mode detection and logging
 */
export const initPWAMode = () => {
  const isStandalone = isIOSStandalone();
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

  console.log('[PWA] Mode:', {
    isStandalone,
    isIOS,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    navigatorStandalone: (window.navigator as any).standalone,
  });

  // Prevent external links from breaking out of standalone mode
  if (isStandalone && isIOS) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        // If it's an external link (different origin)
        if (url.origin !== currentUrl.origin) {
          // Let it open in Safari (default behavior)
          return;
        }

        // For internal links, let React Router handle it (no action needed)
      }
    });
  }

  return { isStandalone, isIOS };
};
