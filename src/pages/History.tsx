import { useEffect, useState } from 'react';
import { useWorkoutStore } from '../store/workout-store';
import { format } from 'date-fns';
import { WorkoutHistoryEntry } from '../types/workout';
import { MuscleGroup } from '../types/exercise';
import EditWorkoutModal from '../components/history/EditWorkoutModal';
import AddManualWorkoutModal from '../components/history/AddManualWorkoutModal';
import WorkoutDetailModal from '../components/history/WorkoutDetailModal';
import { getExerciseEmoji } from '../data/exerciseData';

// Display labels for the daily rotation muscle groups. Glutes days are
// coached as "Posterior Chain" days (2026-06-17 consolidation), so that's
// the label shown rather than the raw muscle group name.
const ROTATION_GROUP_LABELS: Record<MuscleGroup, string> = {
  abs: 'Abs',
  glutes: 'Posterior Chain',
  lowerBack: 'Lower Back',
  upperBody: 'Upper Body',
};

function getMuscleGroupLabel(entry: WorkoutHistoryEntry): string {
  if (entry.workoutMode === 'daily-rotation' && entry.targetMuscleGroup) {
    return ROTATION_GROUP_LABELS[entry.targetMuscleGroup];
  }
  return 'Full Body';
}

export default function History() {
  const { workoutHistory, loadHistory, deleteHistoryEntry, updateHistoryEntry, addManualWorkout } = useWorkoutStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutHistoryEntry | null>(null);
  const [showAddManual, setShowAddManual] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistoryEntry | null>(null);

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
      // Close the detail modal if the deleted workout was being viewed
      if (selectedWorkout?.id === historyId) {
        setSelectedWorkout(null);
      }
    } catch (error) {
      console.error('Failed to delete workout:', error);
      alert('Failed to delete workout. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (entry: WorkoutHistoryEntry) => {
    setEditingWorkout(entry);
    setSelectedWorkout(null); // Close detail modal when editing
  };

  const handleCardClick = (entry: WorkoutHistoryEntry) => {
    setSelectedWorkout(entry);
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

  // Calculate workouts this week and month
  const now = new Date();
  const startOfWeek = new Date(now);
  const dayOfWeek = now.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(now.getDate() - daysToSubtract);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfWeek
  ).length;

  const workoutsThisMonth = workoutHistory.filter(
    (workout) => new Date(workout.completedDate) >= startOfMonth
  ).length;

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-6">
        {/* Workout Summary Stats */}
        <div className="bg-background-light rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Workouts</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutHistory.length}</div>
              <div className="text-sm text-text-muted font-medium">Total</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutsThisWeek}</div>
              <div className="text-sm text-text-muted font-medium">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-display font-bold text-primary">{workoutsThisMonth}</div>
              <div className="text-sm text-text-muted font-medium">This Month</div>
            </div>
          </div>
        </div>

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
          <div className="space-y-3">
            {workoutHistory.map((entry) => {
              return (
                <div
                  key={entry.id}
                  onClick={() => handleCardClick(entry)}
                  className="bg-background-light rounded-lg p-4 cursor-pointer hover:bg-background-lighter transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text">
                        Workout #{entry.workoutNumber}
                      </h3>
                      <p className="text-sm text-text-muted">
                        {format(new Date(entry.completedDate), 'MMM d, yyyy')}
                      </p>
                      <span className="inline-block mt-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {getMuscleGroupLabel(entry)}
                      </span>
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {entry.totalDuration}
                        </div>
                        <svg
                          className="w-4 h-4 text-text-muted mx-auto mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-label="duration"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.exercises.map((ex, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-background-lighter text-text-muted px-2 py-1 rounded-full"
                      >
                        {getExerciseEmoji(ex.exerciseId)} {ex.exerciseName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workout Detail Modal */}
      {selectedWorkout && (
        <WorkoutDetailModal
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={deletingId === selectedWorkout.id}
        />
      )}

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
