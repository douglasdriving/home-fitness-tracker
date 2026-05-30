/**
 * IntensityFeedback Component
 * Collects user feedback on exercise difficulty after completing all sets.
 * The feedback is used to adjust future workout targets.
 */

import { IntensityRating } from '../../types/workout';

interface IntensityFeedbackProps {
  exerciseName: string;
  emoji?: string;
  onSubmit: (rating: IntensityRating) => void;
}

interface RatingOption {
  value: IntensityRating;
  label: string;
  description: string;
}

const ratingOptions: RatingOption[] = [
  {
    value: 1,
    label: 'Way too easy',
    description: 'I could have done twice as many without breaking a sweat',
  },
  {
    value: 2,
    label: 'A bit too easy',
    description: 'I finished all sets with energy to spare',
  },
  {
    value: 3,
    label: 'Just right',
    description: 'Challenging but doable - pushed me just enough',
  },
  {
    value: 4,
    label: 'A bit too hard',
    description: 'I struggled to complete all sets',
  },
  {
    value: 5,
    label: 'Way too hard',
    description: 'I couldn\'t finish or needed extra breaks',
  },
];

export default function IntensityFeedback({
  exerciseName,
  emoji,
  onSubmit,
}: IntensityFeedbackProps) {
  const handleRatingClick = (rating: IntensityRating) => {
    onSubmit(rating);
  };

  return (
    <div className="bg-background min-h-screen p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-background-light rounded-lg shadow-lg p-6 border border-background-lighter">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💪</div>
          <h2 className="text-2xl font-bold text-text mb-2">
            How did that feel?
          </h2>
          <p className="text-text-muted">
            Rate the intensity of <span className="font-semibold text-primary">{emoji} {exerciseName}</span>
          </p>
        </div>

        {/* Rating Buttons - descriptions always visible */}
        <div className="space-y-3 mb-6">
          {ratingOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRatingClick(option.value)}
              className="w-full p-4 rounded-lg border-2 transition-all bg-background border-background-lighter hover:border-primary/50 text-text"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold opacity-50">{option.value}</span>
                  <span className="font-medium">{option.label}</span>
                </div>
              </div>
              <p className="text-sm mt-2 text-left text-text-muted">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        {/* Info note */}
        <p className="text-xs text-text-muted text-center mt-4">
          Your feedback adjusts future workout intensity for this exercise
        </p>
      </div>
    </div>
  );
}
