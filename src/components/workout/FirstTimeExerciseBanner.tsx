/**
 * FirstTimeExerciseBanner Component
 * Displays guidance for users doing an exercise for the first time
 */

interface FirstTimeExerciseBannerProps {
  exerciseType: 'reps' | 'timed';
}

export default function FirstTimeExerciseBanner({ exerciseType }: FirstTimeExerciseBannerProps) {
  return (
    <div className="bg-accent/10 border-l-4 border-accent p-4 rounded">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">ℹ️</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-accent mb-1">
            First Time Doing This Exercise!
          </h3>
          <div className="text-sm text-text space-y-1">
            <p>
              {exerciseType === 'reps'
                ? 'Do as many reps as you can with proper form, then enter that number.'
                : 'Hold the position for as long as you can with proper form, then enter the duration in seconds.'}
            </p>
            <p className="font-semibold">
              💡 Important: Don't push yourself too hard on the first set! Stop at a comfortable level that you can repeat for multiple sets. The app will adjust future targets based on your performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
