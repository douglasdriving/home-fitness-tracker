import { useState, useEffect } from 'react';
import { WorkoutHistoryEntry, CompletedExercise, CompletedSet } from '../../types/workout';
import { allExercises } from '../../data/exerciseData';
import { Exercise } from '../../types/exercise';
import { format } from 'date-fns';
import Button from '../common/Button';

interface AddManualWorkoutModalProps {
  onSave: (workout: WorkoutHistoryEntry) => void;
  onClose: () => void;
}

export default function AddManualWorkoutModal({ onSave, onClose }: AddManualWorkoutModalProps) {
  const [completedDate, setCompletedDate] = useState<number>(Date.now());
  const [totalDuration, setTotalDuration] = useState<number>(30);
  const [selectedExercises, setSelectedExercises] = useState<CompletedExercise[]>([]);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleDateChange = (dateString: string) => {
    const newDate = new Date(dateString).getTime();
    setCompletedDate(newDate);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: CompletedExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroups: exercise.muscleGroups,
      completedSets: [
        {
          setNumber: 1,
          actualReps: exercise.type === 'reps' ? exercise.defaultReps : undefined,
          actualDuration: exercise.type === 'timed' ? exercise.defaultDuration : undefined,
        },
      ],
    };

    setSelectedExercises([...selectedExercises, newExercise]);
    setShowExerciseSelector(false);
  };

  const handleRemoveExercise = (index: number) => {
    setSelectedExercises(selectedExercises.filter((_, idx) => idx !== index));
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: 'actualReps' | 'actualDuration', value: string) => {
    const newExercises = [...selectedExercises];
    const newSets = [...newExercises[exerciseIndex].completedSets];

    const numValue = value === '' ? undefined : (parseInt(value) || undefined);

    // Only update the specific field, preserve the type (reps vs duration)
    if (field === 'actualReps') {
      newSets[setIndex] = {
        ...newSets[setIndex],
        actualReps: numValue,
        actualDuration: undefined, // Ensure duration stays undefined for rep-based exercises
      };
    } else {
      newSets[setIndex] = {
        ...newSets[setIndex],
        actualDuration: numValue,
        actualReps: undefined, // Ensure reps stays undefined for timed exercises
      };
    }

    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      completedSets: newSets,
    };

    setSelectedExercises(newExercises);
  };

  const handleAddSet = (exerciseIndex: number) => {
    const newExercises = [...selectedExercises];
    const exercise = newExercises[exerciseIndex];
    const lastSet = exercise.completedSets[exercise.completedSets.length - 1];

    const newSet: CompletedSet = {
      setNumber: exercise.completedSets.length + 1,
      actualReps: lastSet?.actualReps,
      actualDuration: lastSet?.actualDuration,
    };

    newExercises[exerciseIndex] = {
      ...exercise,
      completedSets: [...exercise.completedSets, newSet],
    };

    setSelectedExercises(newExercises);
  };

  const handleDeleteSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...selectedExercises];
    const newSets = newExercises[exerciseIndex].completedSets.filter((_, idx) => idx !== setIndex);

    // Re-number the remaining sets
    newSets.forEach((set, idx) => {
      set.setNumber = idx + 1;
    });

    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      completedSets: newSets,
    };

    setSelectedExercises(newExercises);
  };

  const handleSave = () => {
    if (selectedExercises.length === 0) {
      alert('Please add at least one exercise');
      return;
    }

    const workout: WorkoutHistoryEntry = {
      id: `manual-${completedDate}-${Math.random().toString(36).substr(2, 9)}`,
      workoutId: `manual-workout-${Date.now()}`,
      workoutNumber: 0, // Will be assigned by the store
      completedDate,
      totalDuration,
      exercises: selectedExercises,
    };

    onSave(workout);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-background-light rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background-light border-b border-background-lighter p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">Add Manual Workout</h2>
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
                Workout Date & Time
              </label>
              <input
                type="datetime-local"
                value={format(new Date(completedDate), "yyyy-MM-dd'T'HH:mm")}
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
                value={totalDuration}
                onChange={(e) => setTotalDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-background border border-background-lighter rounded px-3 py-2 text-text"
              />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-text">Exercises</h3>
              <button
                onClick={() => setShowExerciseSelector(true)}
                className="text-accent hover:text-accent-light text-sm font-medium"
              >
                + Add Exercise
              </button>
            </div>

            {selectedExercises.length === 0 && (
              <div className="text-center py-8 text-text-muted">
                No exercises added yet. Click "Add Exercise" to get started.
              </div>
            )}

            {selectedExercises.map((exercise, exerciseIndex) => (
              <div key={exerciseIndex} className="bg-background rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-text">{exercise.exerciseName}</h4>
                      <button
                        onClick={() => handleRemoveExercise(exerciseIndex)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Remove exercise"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
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
            Add Workout
          </Button>
        </div>
      </div>

      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-background-light rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-background-light border-b border-background-lighter p-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-text">Select Exercise</h3>
              <button
                onClick={() => setShowExerciseSelector(false)}
                className="text-text-muted hover:text-text p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-2">
              {allExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="w-full text-left bg-background hover:bg-background-lighter rounded-lg p-3 transition-colors"
                >
                  <div className="font-medium text-text">{exercise.name}</div>
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
                  <div className="text-xs text-text-muted mt-1">
                    {exercise.type === 'reps' ? `Default: ${exercise.defaultReps} reps` : `Default: ${exercise.defaultDuration}s`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
