/**
 * Play a completion sound using Web Audio API
 * Creates a pleasant "ding" sound that works across all devices
 */
export function playCompletionSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create oscillator for the main tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set the frequency (E note, pleasant sound)
    oscillator.frequency.value = 659.25; // E5
    oscillator.type = 'sine';

    // Set the envelope (quick attack, sustained, quick release)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);  // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + 0.4);    // Release

    // Start and stop the oscillator
    oscillator.start(now);
    oscillator.stop(now + 0.4);

    // Clean up after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    console.warn('Could not play completion sound:', error);
    // Fallback: try using a simple beep if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      audio.play().catch(() => {
        // Silent fail - audio not critical
      });
    } catch {
      // Silent fail - audio not critical
    }
  }
}

/**
 * Play a double beep for workout completion
 */
export function playWorkoutCompleteSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const createTone = (startTime: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      const now = startTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    };

    const now = audioContext.currentTime;
    createTone(now, 523.25);      // C5
    createTone(now + 0.15, 659.25); // E5
    createTone(now + 0.3, 783.99);  // G5

    setTimeout(() => {
      audioContext.close();
    }, 800);
  } catch (error) {
    console.warn('Could not play workout complete sound:', error);
  }
}
