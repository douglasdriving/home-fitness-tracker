import { format } from 'date-fns';
import { WorkoutHistoryEntry } from '../../types/workout';
import { getExerciseById } from '../../data/exerciseData';
import { useEffect, useState } from 'react';
import { db } from '../../db/db';

interface WorkoutDetailModalProps {
  workout: WorkoutHistoryEntry;
  onClose: () => void;
  onEdit: (workout: WorkoutHistoryEntry) => void;
  onDelete: (id: string, workoutNumber: number) => void;
  isDeleting: boolean;
}

export default function WorkoutDetailModal({
  workout,
  onClose,
  onEdit,
  onDelete,
  isDeleting,
}: WorkoutDetailModalProps) {
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    // Lock body scroll when modal opens
    document.body.style.overflow = 'hidden';
    loadExerciseNotes();

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const loadExerciseNotes = async () => {
    const notes = await db.exerciseNotes.toArray();
    const notesMap: Record<string, string> = {};
    notes.forEach(note => {
      notesMap[note.exerciseId] = note.note;
    });
    setExerciseNotes(notesMap);
  };

  const totalSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.completedSets.length,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-background-lighter p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-text">
            Workout #{workout.workoutNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Workout Summary */}
          <div className="bg-background-light rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm text-text-muted mb-1">Date</p>
                <p className="text-text font-medium">
                  {format(new Date(workout.completedDate), 'MMM d, yyyy • h:mm a')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-muted mb-1">Duration</p>
                <p className="text-2xl font-bold text-primary">
                  {workout.totalDuration}
                  <span className="text-sm text-text-muted ml-1">min</span>
                </p>
              </div>
            </div>
            <div className="flex gap-4 text-sm text-text-muted pt-3 border-t border-background-lighter">
              <span>{workout.exercises.length} exercises</span>
              <span>•</span>
              <span>{totalSets} sets</span>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-text">Exercises</h3>
            {workout.exercises.map((exercise, idx) => {
              const exerciseData = getExerciseById(exercise.exerciseId);
              const note = exerciseNotes[exercise.exerciseId];
              return (
                <div key={idx} className="bg-background-light rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-text">
                        {exerciseData?.emoji} {exercise.exerciseName}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {exercise.muscleGroups.map((mg, mgIdx) => (
                          <span
                            key={mgIdx}
                            className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase"
                          >
                            {mg}
                          </span>
                        ))}
                        {exerciseData?.countingMethod === 'per-side' && (
                          <span className="text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                            Per Side
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-text-muted ml-4">
                      {exercise.completedSets.length} sets
                    </div>
                  </div>

                  {/* Sets */}
                  <div className="space-y-2 mt-2">
                    {exercise.completedSets.map((set, setIdx) => (
                      <div key={setIdx} className="text-xs">
                        <div className="bg-background-lighter text-text px-2 py-1 rounded inline-block">
                          Set {set.setNumber}:{' '}
                          {set.actualReps
                            ? `${set.actualReps} reps${exerciseData?.countingMethod === 'per-side' ? ' per side' : ''}`
                            : `${set.actualDuration}s${exerciseData?.countingMethod === 'per-side' ? ' per side' : ''}`}
                        </div>
                        {set.equipmentUsed && (
                          <div className="text-text-muted mt-1 ml-2">
                            Equipment: {set.equipmentUsed}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Intensity Feedback */}
                  {exercise.intensityFeedback && (
                    <div className="mt-2 text-xs text-text-muted">
                      Feedback: {
                        exercise.intensityFeedback === 1 ? 'Way too easy' :
                        exercise.intensityFeedback === 2 ? 'A bit too easy' :
                        exercise.intensityFeedback === 3 ? 'Just right' :
                        exercise.intensityFeedback === 4 ? 'A bit too hard' :
                        'Way too hard'
                      }
                    </div>
                  )}

                  {/* Exercise Note */}
                  {note && (
                    <div className="mt-3 pt-3 border-t border-background-lighter">
                      <div className="text-xs font-medium text-text-muted mb-1">Note:</div>
                      <div className="text-sm text-text italic">{note}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={() => onEdit(workout)}
              className="flex-1 bg-accent hover:bg-accent-dark text-background font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => onDelete(workout.id, workout.workoutNumber)}
              disabled={isDeleting}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
