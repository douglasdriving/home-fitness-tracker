/**
 * LadderProgress Component
 * Renders an exercise's difficulty ladder (coaching session 2026-07-01) with
 * the current rung highlighted: cleared rungs, the active rung + its setup
 * notes, and the harder rungs still ahead.
 */

import { LadderConfig } from '../../types/exercise';

interface LadderProgressProps {
  ladder: LadderConfig;
  currentRung: number;
}

export default function LadderProgress({ ladder, currentRung }: LadderProgressProps) {
  return (
    <div className="bg-background-lighter rounded-lg p-4">
      <h3 className="text-sm font-semibold text-text mb-1">Difficulty ladder</h3>
      <p className="text-xs text-text-muted mb-3">
        Build up to {ladder.advanceReps} reps on all sets to advance to the next rung
        (you restart at {ladder.startReps} reps there).
      </p>
      <ol className="space-y-2">
        {ladder.rungs.map((rung, index) => {
          const isCurrent = index === currentRung;
          const isCleared = index < currentRung;
          return (
            <li
              key={index}
              className={`flex items-start gap-2 rounded px-2 py-1.5 text-sm ${
                isCurrent
                  ? 'bg-primary/15 border border-primary/40 text-text'
                  : 'text-text-muted'
              }`}
            >
              <span className="shrink-0">
                {isCleared ? '✅' : isCurrent ? '👉' : '🔒'}
              </span>
              <span>
                <span className={isCurrent ? 'font-semibold' : ''}>
                  {index + 1}. {rung.name}
                </span>
                {isCurrent && (
                  <span className="block text-xs text-text-muted mt-0.5">
                    {rung.description}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
