import { useState, useMemo } from 'react';
import { allExercises } from '../data/exerciseData';
import { MuscleGroup, Exercise } from '../types/exercise';

type FilterOption = 'all' | MuscleGroup;

export default function ExerciseLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');

  // Filter and search exercises
  const filteredExercises = useMemo(() => {
    return allExercises.filter((exercise: Exercise) => {
      // Apply muscle group filter
      if (filter !== 'all' && !exercise.muscleGroups.includes(filter)) {
        return false;
      }

      // Apply search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          exercise.name.toLowerCase().includes(searchLower) ||
          exercise.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [searchTerm, filter]);

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'abs', label: 'Abs' },
    { value: 'glutes', label: 'Glutes' },
    { value: 'lowerBack', label: 'Lower Back' },
  ];

  return (
    <div className="bg-background min-h-screen">
      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-background-light border border-background-lighter text-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted"
          />
        </div>

        {/* Muscle Group Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === option.value
                  ? 'bg-primary text-background'
                  : 'bg-background-light text-text border border-background-lighter hover:bg-background-lighter'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="text-sm text-text-muted">
          {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
        </div>

        {/* Exercise List */}
        {filteredExercises.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold text-text mb-2">No exercises found</h2>
            <p className="text-text-muted">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredExercises.map((exercise: Exercise) => (
              <div key={exercise.id} className="bg-background-light rounded-lg p-4 border border-background-lighter">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text mb-1">{exercise.name}</h3>
                    <div className="flex gap-2 mb-2">
                      {exercise.muscleGroups.map((mg: MuscleGroup, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-primary text-background px-2 py-1 rounded-full uppercase font-semibold"
                        >
                          {mg}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        exercise.type === 'reps'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/20 text-accent'
                      }`}
                    >
                      {exercise.type === 'reps' ? 'Reps' : 'Timed'}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-text mb-3">{exercise.description}</p>

                <div className="flex items-center justify-between">
                  {exercise.videoUrl && (
                    <a
                      href={exercise.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-primary hover:text-primary-light"
                    >
                      <span className="mr-1">▶</span>
                      Watch video
                    </a>
                  )}
                  <div className="text-xs text-text-muted">
                    Source: {exercise.source}
                  </div>
                </div>

                {/* Difficulty indicators */}
                <div className="mt-3 pt-3 border-t border-background-lighter">
                  <div className="text-xs font-medium text-text-muted mb-2">Difficulty by muscle group:</div>
                  <div className="flex gap-3">
                    {exercise.muscleGroups.map((mg: MuscleGroup) => (
                      <div key={mg} className="flex items-center gap-2">
                        <span className="text-xs text-text-muted capitalize">{mg}:</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 10 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-3 rounded-sm ${
                                i < exercise.heavinessScore[mg]
                                  ? 'bg-primary'
                                  : 'bg-background-lighter'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-text-muted">
                          {exercise.heavinessScore[mg]}/10
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
