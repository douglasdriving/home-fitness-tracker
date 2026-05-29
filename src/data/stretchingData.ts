/**
 * Stretching Routine Data
 * 5-minute post-workout stretching routine targeting abs, glutes, and lower back
 */

import { MuscleGroup } from '../types/exercise';

export interface StretchExercise {
  id: string;
  name: string;
  duration: number; // seconds
  instructions: string[];
  targetMuscles: string[];
  videoUrl?: string;
  bilateral?: boolean; // If true, timer will split duration and indicate when to switch sides
}

export const stretchingRoutine: StretchExercise[] = [
  {
    id: 'stretch-child-pose',
    name: "Child's Pose",
    duration: 30,
    instructions: [
      'Kneel on the floor and sit back on your heels',
      'Stretch your arms forward and lower your chest to the ground',
      'Hold the stretch, breathing deeply',
      'Focus on relaxing your lower back and abs'
    ],
    targetMuscles: ['Lower Back', 'Abs'],
    videoUrl: 'https://www.youtube.com/watch?v=kH12QrSGedM'
  },
  {
    id: 'stretch-cat-cow',
    name: 'Cat-Cow Stretch',
    duration: 40,
    instructions: [
      'Start on hands and knees in tabletop position',
      'Inhale: arch your back, drop belly, lift head (Cow)',
      'Exhale: round spine, tuck chin to chest (Cat)',
      'Flow slowly between positions for the full duration'
    ],
    targetMuscles: ['Lower Back', 'Abs'],
    videoUrl: 'https://www.youtube.com/watch?v=kqnua4rHVVA'
  },
  {
    id: 'stretch-figure-four',
    name: 'Figure-Four Stretch',
    duration: 30,
    instructions: [
      'Lie on your back with knees bent',
      'Cross right ankle over left knee',
      'Pull left thigh toward chest',
      'Hold for 15 seconds, then switch sides'
    ],
    targetMuscles: ['Glutes', 'Lower Back'],
    videoUrl: 'https://www.youtube.com/watch?v=Xb5gHdYtHnk',
    bilateral: true
  },
  {
    id: 'stretch-knee-to-chest',
    name: 'Knee to Chest',
    duration: 30,
    instructions: [
      'Lie on your back with legs extended',
      'Bring right knee to chest, holding with both hands',
      'Keep left leg extended on the floor',
      'Hold for 15 seconds, then switch legs'
    ],
    targetMuscles: ['Lower Back', 'Glutes'],
    videoUrl: 'https://www.youtube.com/watch?v=o8gAyDUh2bs',
    bilateral: true
  },
  {
    id: 'stretch-lying-twist',
    name: 'Lying Spinal Twist',
    duration: 40,
    instructions: [
      'Lie on your back with arms extended to sides',
      'Bring right knee across body to the left',
      'Turn head to the right, keeping shoulders flat',
      'Hold for 20 seconds, then switch sides'
    ],
    targetMuscles: ['Lower Back', 'Abs', 'Glutes'],
    videoUrl: 'https://www.youtube.com/watch?v=mNdJti7ZwKI',
    bilateral: true
  },
  {
    id: 'stretch-cobra',
    name: 'Cobra Stretch',
    duration: 30,
    instructions: [
      'Lie face down with hands under shoulders',
      'Press up, lifting chest off the ground',
      'Keep hips on the floor and elbows slightly bent',
      'Hold the stretch, breathing deeply'
    ],
    targetMuscles: ['Abs'],
    videoUrl: 'https://www.youtube.com/watch?v=XVgd8aktKTE'
  },
  {
    id: 'stretch-hip-flexor',
    name: 'Hip Flexor Stretch',
    duration: 30,
    instructions: [
      'Kneel on right knee, left foot forward',
      'Push hips forward gently',
      'Keep torso upright',
      'Hold for 15 seconds, then switch sides'
    ],
    targetMuscles: ['Glutes', 'Abs'],
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4',
    bilateral: true
  },
  {
    id: 'stretch-final-child-pose',
    name: "Final Relaxation - Child's Pose",
    duration: 30,
    instructions: [
      'Return to child\'s pose',
      'Focus on deep breathing',
      'Relax completely',
      'Great work on your stretching routine!'
    ],
    targetMuscles: ['Full Body'],
    videoUrl: 'https://www.youtube.com/watch?v=kH12QrSGedM'
  }
];

// Calculate total duration
export const totalStretchingDuration = stretchingRoutine.reduce(
  (sum, stretch) => sum + stretch.duration,
  0
);

// Muscle-group-specific stretching for daily rotation mode
export const muscleGroupStretches: Record<MuscleGroup, string[]> = {
  abs: ['stretch-cat-cow', 'stretch-cobra', 'stretch-lying-twist'],
  glutes: ['stretch-figure-four', 'stretch-hip-flexor', 'stretch-lying-twist'],
  lowerBack: ['stretch-child-pose', 'stretch-cat-cow', 'stretch-cobra'],
};

// Helper function to get stretches for a specific muscle group
export function getStretchesForMuscleGroup(muscleGroup: MuscleGroup): StretchExercise[] {
  const stretchIds = muscleGroupStretches[muscleGroup];
  return stretchingRoutine.filter(stretch => stretchIds.includes(stretch.id));
}
