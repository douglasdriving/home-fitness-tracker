/**
 * IOSInstallPrompt Component
 * Shows iOS-specific installation instructions for adding PWA to home screen
 */

import { useState } from 'react';
import Button from './Button';

interface IOSInstallPromptProps {
  onClose?: () => void;
}

export default function IOSInstallPrompt({ onClose }: IOSInstallPromptProps) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="border-b border-background-lighter pb-6">
      <h2 className="text-lg font-semibold text-text mb-4">Install App</h2>
      <p className="text-sm text-text-muted mb-4">
        Install this app on your iPhone for a better experience. Access it offline and from your home screen like a native app.
      </p>

      {!showInstructions ? (
        <Button onClick={() => setShowInstructions(true)} fullWidth>
          Show Installation Instructions
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="bg-background-lighter rounded-lg p-4 border border-background-lighter">
            <h3 className="font-semibold text-text mb-3">How to Install:</h3>
            <ol className="space-y-3 text-sm text-text-muted">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <span>
                  Tap the <span className="font-semibold text-primary">Share</span> button at the bottom of your screen
                  (square with an arrow pointing up)
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <span>
                  Scroll down and tap <span className="font-semibold text-primary">Add to Home Screen</span>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <span>
                  Tap <span className="font-semibold text-primary">Add</span> in the top right corner
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-background rounded-full flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <span>
                  The app icon will appear on your home screen. Open it from there to use the app!
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-secondary/10 rounded-lg p-3 border-l-4 border-secondary">
            <p className="text-xs text-text-muted">
              <span className="font-semibold text-secondary">Note:</span> Make sure you're using Safari browser.
              This feature is not available in Chrome or other browsers on iOS.
            </p>
          </div>

          <Button
            onClick={() => {
              setShowInstructions(false);
              onClose?.();
            }}
            fullWidth
            variant="secondary"
          >
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}
