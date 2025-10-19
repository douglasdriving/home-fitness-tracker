import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workout-store';
import { format } from 'date-fns';

export default function History() {
  const { workoutHistory, loadHistory, deleteHistoryEntry } = useWorkoutStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (historyId: string, workoutNumber: number) => {
    if (!confirm(`Are you sure you want to delete Workout #${workoutNumber}? This cannot be undone.`)) {
      return;
    }

    setDeletingId(historyId);
    try {
      await deleteHistoryEntry(historyId);
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (workoutHistory.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              No workouts yet
            </h2>
            <p className="text-gray-600">
              Complete your first workout to see your history here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 space-y-4">
        {workoutHistory.map((entry) => {
          const totalSets = entry.exercises.reduce(
            (sum, ex) => sum + ex.completedSets.length,
            0
          );

          return (
            <div key={entry.id} className="bg-white rounded-lg shadow">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">
                      Workout #{entry.workoutNumber}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {format(new Date(entry.completedDate), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {entry.totalDuration}
                      </div>
                      <div className="text-xs text-gray-600">minutes</div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id, entry.workoutNumber)}
                      disabled={deletingId === entry.id}
                      className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                      title="Delete workout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-gray-600">
                  <span>{entry.exercises.length} exercises</span>
                  <span>•</span>
                  <span>{totalSets} sets</span>
                </div>
              </div>

              {/* Exercises */}
              <div className="p-4 space-y-3">
                {entry.exercises.map((exercise, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {exercise.exerciseName}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {exercise.muscleGroups.map((mg, mgIdx) => (
                            <span
                              key={mgIdx}
                              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase"
                            >
                              {mg}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 ml-4">
                        {exercise.completedSets.length} sets
                      </div>
                    </div>

                    {/* Sets */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exercise.completedSets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          className="text-xs bg-white px-2 py-1 rounded border border-gray-200"
                        >
                          Set {set.setNumber}:{' '}
                          {set.actualReps
                            ? `${set.actualReps} reps`
                            : `${set.actualDuration}s`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
