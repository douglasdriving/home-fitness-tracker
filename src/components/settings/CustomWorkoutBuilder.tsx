import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../../store/workout-store';
import { allExercises } from '../../data/exerciseData';
import { buildCustomWorkout } from '../../lib/custom-workout-builder';
import Button from '../common/Button';

/**
 * Development-only tool for hand-picking up to four exercises and a set count,
 * then generating a pending custom workout. The heavy set-construction logic
 * lives in {@link buildCustomWorkout}; this component owns only the selection
 * UI, validation, loading state, and navigation.
 */
export default function CustomWorkoutBuilder() {
  const navigate = useNavigate();
  const { loadWorkouts } = useWorkoutStore();
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [customSetsCount, setCustomSetsCount] = useState(4);
  const [isCreatingCustomWorkout, setIsCreatingCustomWorkout] = useState(false);

  const handleCreateCustomWorkout = async () => {
    if (selectedExerciseIds.length === 0) {
      alert('Please select at least one exercise.');
      return;
    }

    try {
      setIsCreatingCustomWorkout(true);

      await buildCustomWorkout(selectedExerciseIds, customSetsCount);

      // Refresh workout store
      await loadWorkouts();

      // Navigate to dashboard
      navigate('/');
    } catch (error) {
      console.error('Failed to create custom workout:', error);
      alert('Failed to create custom workout. Please try again.');
    } finally {
      setIsCreatingCustomWorkout(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-md font-semibold text-text mb-2">Custom Workout Builder</h3>

      {/* Exercise Selection */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-text">
            Select Exercises ({selectedExerciseIds.length}/4)
          </label>
          {selectedExerciseIds.length > 0 && (
            <button
              onClick={() => setSelectedExerciseIds([])}
              className="text-xs text-primary hover:text-primary/80"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="max-h-48 overflow-y-auto border border-background-lighter rounded-lg bg-background-light">
          {allExercises.map((exercise) => {
            const isSelected = selectedExerciseIds.includes(exercise.id);
            const isDisabled = !isSelected && selectedExerciseIds.length >= 4;

            return (
              <label
                key={exercise.id}
                className={`flex items-center p-2 border-b border-background-lighter last:border-b-0 ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-background-lighter/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedExerciseIds([...selectedExerciseIds, exercise.id]);
                    } else {
                      setSelectedExerciseIds(selectedExerciseIds.filter((id) => id !== exercise.id));
                    }
                  }}
                  className="mr-3"
                />
                <span className="text-lg mr-2">{exercise.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text">{exercise.name}</div>
                  <div className="text-xs text-text-muted">
                    {exercise.muscleGroups.join(', ')} • {exercise.type === 'reps' ? 'Reps' : 'Timed'}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Sets Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">Sets per Exercise</label>
        <select
          value={customSetsCount}
          onChange={(e) => setCustomSetsCount(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-lg bg-background-light border border-background-lighter text-text"
        >
          {[1, 2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count} {count === 1 ? 'set' : 'sets'}
            </option>
          ))}
        </select>
      </div>

      {/* Create Button */}
      <Button
        onClick={handleCreateCustomWorkout}
        fullWidth
        disabled={selectedExerciseIds.length === 0 || isCreatingCustomWorkout}
      >
        {isCreatingCustomWorkout ? 'Creating...' : 'Create Custom Workout'}
      </Button>
    </div>
  );
}
