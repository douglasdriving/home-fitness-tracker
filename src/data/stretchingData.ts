/**
 * Stretching Routine Data
 * 5-minute post-workout stretching routine targeting abs, glutes, and lower back
 */

export interface StretchExercise {
  id: string;
  name: string;
  duration: number; // seconds
  instructions: string[];
  targetMuscles: string[];
  videoUrl?: string;
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
    videoUrl: 'https://www.youtube.com/watch?v=2MTd6RRNTRg'
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
    videoUrl: 'https://www.youtube.com/watch?v=MgQ4Met_zkw'
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
    videoUrl: 'https://www.youtube.com/watch?v=MRbDH7r7pOA'
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
    videoUrl: 'https://www.youtube.com/watch?v=vOgxWp0WyiI'
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
    videoUrl: 'https://www.youtube.com/watch?v=JDcdhTuycOI'
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
    videoUrl: 'https://www.youtube.com/watch?v=YQmpO9VT2X4'
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
    videoUrl: 'https://www.youtube.com/watch?v=2MTd6RRNTRg'
  }
];

// Calculate total duration
export const totalStretchingDuration = stretchingRoutine.reduce(
  (sum, stretch) => sum + stretch.duration,
  0
);

export function getStretchById(id: string): StretchExercise | undefined {
  return stretchingRoutine.find((stretch) => stretch.id === id);
}
