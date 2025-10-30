/**
 * BilateralExerciseBanner Component
 * Displays guidance for bilateral (per-side) exercises
 */

interface BilateralExerciseBannerProps {
  exerciseType: 'reps' | 'timed';
  isFirstTime: boolean;
}

export default function BilateralExerciseBanner({
  exerciseType,
  isFirstTime,
}: BilateralExerciseBannerProps) {
  return (
    <div className="bg-secondary/10 border-l-4 border-secondary p-4 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">{exerciseType === 'timed' ? '⏱️' : '🔄'}</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-secondary mb-1">
            Both Sides Required
          </h3>
          {isFirstTime ? (
            <div className="text-sm text-text space-y-2">
              <p><strong>Important:</strong> Do this exercise on BOTH sides (left and right).</p>
              <p>• Don't push yourself too hard on the first set - stop at a comfortable level that you can repeat for multiple sets</p>
              {exerciseType === 'timed' ? (
                <>
                  <p>• Use the timer for ONE side, then manually reset and do the other side</p>
                  <p>• Enter the <strong>time per side</strong> (not total time) when done</p>
                  <p>• Future sets will automatically run the timer twice</p>
                </>
              ) : (
                <>
                  <p>• Do the reps on ONE side, then do the same number on the other side</p>
                  <p>• Enter the <strong>reps per side</strong> (not total reps) when done</p>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-text">
              {exerciseType === 'timed'
                ? 'The timer will run twice - once for your left side, then once for your right side. There will be a 10-second break to switch positions.'
                : 'Complete the target reps on one side, then repeat on the other side.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
