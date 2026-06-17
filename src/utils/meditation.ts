/**
 * Calculate meditation duration based on completion count.
 * Progressive ladder designed for habit formation:
 * - 0-4 completions: 1 min (60s) - minimal barrier to entry
 * - 5-9 completions: 2 min (120s) - first increase after ~1-2 weeks
 * - 10-14 completions: 3 min (180s) - gradual ramp
 * - 15-19 completions: 5 min (300s) - meaningful jump
 * - 20-24 completions: 7 min (420s) - mid-range duration
 * - 25-29 completions: 10 min (600s) - standard beginner length
 * - 30+ completions: 15 min (900s) - cap for experienced practitioners
 */
export function getMeditationDuration(completionCount: number): number {
  if (completionCount < 5) return 60;
  if (completionCount < 10) return 120;
  if (completionCount < 15) return 180;
  if (completionCount < 20) return 300;
  if (completionCount < 25) return 420;
  if (completionCount < 30) return 600;
  return 900;
}
