/**
 * WorkoutHeader Component
 * Displays workout title, progress bar, and quit button during workout execution
 */

interface WorkoutHeaderProps {
  workoutNumber: number;
  progress: number;
  completedSets: number;
  totalSets: number;
  onQuit: () => void;
}

export default function WorkoutHeader({
  workoutNumber,
  progress,
  completedSets,
  totalSets,
  onQuit,
}: WorkoutHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-primary to-primary-dark text-background p-4 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-display font-bold tracking-wide">
          WORKOUT #{workoutNumber}
        </h1>
        <button
          onClick={onQuit}
          className="text-sm font-semibold underline hover:opacity-80 transition"
        >
          Quit
        </button>
      </div>
      <div className="w-full bg-background/30 rounded-full h-2">
        <div
          className="bg-background h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm opacity-80 mt-2">
        {completedSets} of {totalSets} sets completed
      </p>
    </div>
  );
}
