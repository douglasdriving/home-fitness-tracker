/**
 * Format McGill protocol set for display
 * @param rounds - Number of rounds (short holds)
 * @param holdDuration - Duration in seconds per hold
 * @param perSide - Whether exercise is per-side (bilateral)
 * @returns Formatted string like "3×10s" or "3×10s per side"
 */
export function formatMcgillSet(
  rounds: number,
  holdDuration: number,
  perSide: boolean = false
): string {
  const base = `${rounds}×${holdDuration}s`;
  return perSide ? `${base} per side` : base;
}
