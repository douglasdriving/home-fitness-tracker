import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workout-store';
import { format } from 'date-fns';
import { WorkoutHistoryEntry } from '../types/workout';
import EditWorkoutModal from '../components/history/EditWorkoutModal';
import AddManualWorkoutModal from '../components/history/AddManualWorkoutModal';

export default function History() {
  const { workoutHistory, loadHistory, deleteHistoryEntry, updateHistoryEntry, addManualWorkout } = useWorkoutStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutHistoryEntry | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);

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

  const handleEdit = (entry: WorkoutHistoryEntry) => {
    setEditingWorkout(entry);
  };

  const handleSaveEdit = async (updatedWorkout: WorkoutHistoryEntry) => {
    try {
      await updateHistoryEntry(updatedWorkout.id, updatedWorkout);
      setEditingWorkout(null);
    } catch (error) {
      console.error('Failed to update workout:', error);
      alert('Failed to update workout. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingWorkout(null);
  };

  const handleAddManual = () => {
    setShowAddManual(true);
  };

  const handleSaveManual = async (workout: WorkoutHistoryEntry) => {
    try {
      await addManualWorkout(workout);
      setShowAddManual(false);
    } catch (error) {
      console.error('Failed to add manual workout:', error);
      alert('Failed to add manual workout. Please try again.');
    }
  };

  const handleCancelManual = () => {
    setShowAddManual(false);
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Add Manual Workout Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAddManual}
            className="bg-accent hover:bg-accent-dark text-background font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Manual Workout
          </button>
        </div>

        {workoutHistory.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-text mb-2">
              No workouts yet
            </h2>
            <p className="text-text-muted">
              Complete your first workout to see your history here.
            </p>
          </div>
        ) : (
          workoutHistory.map((entry) => {
          const totalSets = entry.exercises.reduce(
            (sum, ex) => sum + ex.completedSets.length,
            0
          );

          return (
            <div key={entry.id} className="border-b border-background-lighter pb-6">
              {/* Header */}
              <div className="mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text">
                      Workout #{entry.workoutNumber}
                    </h3>
                    <p className="text-sm text-text-muted">
                      {format(new Date(entry.completedDate), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {entry.totalDuration}
                      </div>
                      <div className="text-xs text-text-muted">minutes</div>
                    </div>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-accent hover:text-accent-light p-1"
                      title="Edit workout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id, entry.workoutNumber)}
                      disabled={deletingId === entry.id}
                      className="text-red-400 hover:text-red-300 p-1 disabled:opacity-50"
                      title="Delete workout"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 text-sm text-text-muted">
                  <span>{entry.exercises.length} exercises</span>
                  <span>•</span>
                  <span>{totalSets} sets</span>
                </div>
              </div>

              {/* Exercises */}
              <div className="space-y-3">
                {entry.exercises.map((exercise, idx) => (
                  <div key={idx} className="bg-background-light rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-text">
                          {exercise.exerciseName}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {exercise.muscleGroups.map((mg, mgIdx) => (
                            <span
                              key={mgIdx}
                              className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase"
                            >
                              {mg}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-text-muted ml-4">
                        {exercise.completedSets.length} sets
                      </div>
                    </div>

                    {/* Sets */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exercise.completedSets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          className="text-xs bg-background-lighter text-text px-2 py-1 rounded"
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
        })
        )}
      </div>

      {/* Edit Modal */}
      {editingWorkout && (
        <EditWorkoutModal
          workout={editingWorkout}
          onSave={handleSaveEdit}
          onClose={handleCancelEdit}
        />
      )}

      {/* Add Manual Workout Modal */}
      {showAddManual && (
        <AddManualWorkoutModal
          onSave={handleSaveManual}
          onClose={handleCancelManual}
        />
      )}
    </div>
  );
}
