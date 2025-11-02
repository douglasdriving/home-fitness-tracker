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
          <p className="text-sm text-text">
            {exerciseType === 'reps'
              ? 'Do as many reps as you can while maintaining proper form.'
              : 'Hold the position as long as you can while maintaining proper form.'}
          </p>
        </div>
      </div>
    </div>
  );
}
