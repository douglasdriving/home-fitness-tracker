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

    // Set the envelope - LOUDER and more noticeable
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.6, now + 0.01); // Attack - LOUDER (was 0.3)
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);  // Sustain - LOUDER (was 0.2)
    gainNode.gain.linearRampToValueAtTime(0, now + 0.5);    // Release - LONGER (was 0.4)

    // Start and stop the oscillator
    oscillator.start(now);
    oscillator.stop(now + 0.5);

    // Clean up after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, 600);

    console.log('✅ Timer completion sound played');
  } catch (error) {
    console.error('❌ Could not play completion sound:', error);
    console.log('💡 This might be a browser permissions issue. Try interacting with the page first.');

    // Fallback: try using a simple beep if available
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      audio.volume = 1.0; // Max volume
      audio.play().catch((playError) => {
        console.error('❌ Fallback audio also failed:', playError);
      });
    } catch (fallbackError) {
      console.error('❌ Fallback audio creation failed:', fallbackError);
    }
  }
}

