import { useState, useEffect } from 'react';
import { WorkoutHistoryEntry } from '../../types/workout';
import { format } from 'date-fns';
import Button from '../common/Button';

interface EditWorkoutModalProps {
  workout: WorkoutHistoryEntry;
  onSave: (updatedWorkout: WorkoutHistoryEntry) => void;
  onClose: () => void;
}

export default function EditWorkoutModal({ workout, onSave, onClose }: EditWorkoutModalProps) {
  const [editedWorkout, setEditedWorkout] = useState<WorkoutHistoryEntry>(workout);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDateChange = (dateString: string) => {
    const newDate = new Date(dateString).getTime();
    setEditedWorkout({ ...editedWorkout, completedDate: newDate });
  };

  const handleDurationChange = (duration: string) => {
    const newDuration = parseInt(duration) || 0;
    setEditedWorkout({ ...editedWorkout, totalDuration: newDuration });
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'actualReps' | 'actualDuration', value: string) => {
    const newExercises = [...editedWorkout.exercises];
    const newSets = [...newExercises[exerciseIndex].completedSets];

    const numValue = parseInt(value) || undefined;

    newSets[setIndex] = {
      ...newSets[setIndex],
      [field]: numValue,
    };

    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      completedSets: newSets,
    };

    setEditedWorkout({
      ...editedWorkout,
      exercises: newExercises,
    });
  };

  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...editedWorkout.exercises];
    const newSets = newExercises[exerciseIndex].completedSets.filter((_, idx) => idx !== setIndex);

    // Re-number the remaining sets
    newSets.forEach((set, idx) => {
      set.setNumber = idx + 1;
    });

    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      completedSets: newSets,
    };

    setEditedWorkout({
      ...editedWorkout,
      exercises: newExercises,
    });
  };

  const handleAddSet = (exerciseIndex: number) => {
    const newExercises = [...editedWorkout.exercises];
    const exercise = newExercises[exerciseIndex];
    const lastSet = exercise.completedSets[exercise.completedSets.length - 1];

    const newSet = {
      setNumber: exercise.completedSets.length + 1,
      actualReps: lastSet?.actualReps,
      actualDuration: lastSet?.actualDuration,
    };

    newExercises[exerciseIndex] = {
      ...exercise,
      completedSets: [...exercise.completedSets, newSet],
    };

    setEditedWorkout({
      ...editedWorkout,
      exercises: newExercises,
    });
  };

  const handleSave = () => {
    onSave(editedWorkout);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background-light rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background-light border-b border-background-lighter p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">Edit Workout #{editedWorkout.workoutNumber}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Date and Duration */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Completed Date & Time
              </label>
              <input
                type="datetime-local"
                value={format(new Date(editedWorkout.completedDate), "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-background border border-background-lighter rounded px-3 py-2 text-text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Total Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={editedWorkout.totalDuration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full bg-background border border-background-lighter rounded px-3 py-2 text-text"
              />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text">Exercises</h3>

            {editedWorkout.exercises.map((exercise, exerciseIndex) => (
              <div key={exerciseIndex} className="bg-background rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-text">{exercise.exerciseName}</h4>
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
                  <button
                    onClick={() => handleAddSet(exerciseIndex)}
                    className="text-accent hover:text-accent-light text-sm font-medium"
                  >
                    + Add Set
                  </button>
                </div>

                {/* Sets */}
                <div className="space-y-2">
                  {exercise.completedSets.map((set, setIndex) => (
                    <div key={setIndex} className="flex items-center gap-2">
                      <span className="text-sm text-text-muted w-16">Set {set.setNumber}:</span>

                      {set.actualReps !== undefined ? (
                        <input
                          type="number"
                          min="0"
                          value={set.actualReps || ''}
                          onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'actualReps', e.target.value)}
                          className="flex-1 bg-background-lighter border border-background-lighter rounded px-2 py-1 text-text text-sm"
                          placeholder="Reps"
                        />
                      ) : (
                        <input
                          type="number"
                          min="0"
                          value={set.actualDuration || ''}
                          onChange={(e) => handleSetChange(exerciseIndex, setIndex, 'actualDuration', e.target.value)}
                          className="flex-1 bg-background-lighter border border-background-lighter rounded px-2 py-1 text-text text-sm"
                          placeholder="Seconds"
                        />
                      )}

                      <span className="text-xs text-text-muted w-12">
                        {set.actualReps !== undefined ? 'reps' : 'sec'}
                      </span>

                      <button
                        onClick={() => handleDeleteSet(exerciseIndex, setIndex)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Delete set"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background-light border-t border-background-lighter p-4 flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
