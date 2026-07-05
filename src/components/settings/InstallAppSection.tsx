import { useState, useEffect } from 'react';
import Button from '../common/Button';
import { isIOS, isStandalone } from '../../utils/deviceDetection';
import IOSInstallPrompt from '../common/IOSInstallPrompt';

/**
 * Handles PWA installation. On iOS it shows manual install instructions; on
 * Android/Desktop it listens for `beforeinstallprompt` and surfaces a native
 * install button when the browser reports the app is installable.
 *
 * The `beforeinstallprompt` listener must stay mounted while Settings is shown,
 * so this component always renders and self-gates on `isInstallable`.
 */
export default function InstallAppSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<(Event & { prompt(): void; userChoice: Promise<{ outcome: string }> }) | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as Event & { prompt(): void; userChoice: Promise<{ outcome: string }> });
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
      await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error('Install error:', error);
      alert('Failed to install app. Please try again.');
    }
  };

  return (
    <>
      {/* Show iOS instructions if on iOS and not already installed */}
      {isIOS() && !isStandalone() && <IOSInstallPrompt />}

      {/* Show standard install button for Android/Desktop */}
      {isInstallable && !isIOS() && (
        <div className="border-b border-background-lighter pb-6">
          <h2 className="text-lg font-semibold text-text mb-4">Install App</h2>
          <p className="text-sm text-text-muted mb-4">
            Install this app on your device for a better experience. You can access it offline and from your home screen.
          </p>
          <Button onClick={handleInstallApp} fullWidth>
            Install App
          </Button>
        </div>
      )}
    </>
  );
}
