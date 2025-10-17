export type MuscleGroup = 'abs' | 'glutes' | 'lowerBack';
export type Equipment = 'none' | 'elastic-band';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  description: string;
  videoUrl?: string;
  imageUrl?: string;
  source: string;
  heavinessScore: Record<MuscleGroup, number>;
  type: 'reps' | 'timed';
  defaultReps?: number;
  defaultDuration?: number; // in seconds
  equipment?: Equipment; // defaults to 'none' if not specified
}
