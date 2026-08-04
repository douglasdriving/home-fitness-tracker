/**
 * Warmup Routine Data
 * Short (~2-4 min) pre-workout dynamic warmup, parameterized by muscle group.
 * The mirror of the post-workout stretching routine: dynamic movement before,
 * static holds after. Cold static stretching slightly reduces strength output;
 * movement rehearsal and joint priming are what the pre-session block delivers.
 *
 * WarmupExercise is structurally compatible with StretchExercise so the existing
 * Timer and InlineVideoPlayer components can be reused unchanged. Every move is
 * timer-driven by `duration`; rep-based moves (bird dogs, leg swings, hinges)
 * carry an optional `reps` count that approximates the duration and is surfaced
 * for display only.
 */

import { MuscleGroup } from '../types/exercise';

export interface WarmupExercise {
  id: string;
  name: string;
  duration: number; // seconds (drives the Timer)
  instructions: string[];
  targetMuscles: string[];
  videoUrl?: string;
  bilateral?: boolean; // If true, timer splits duration and indicates when to switch sides
  reps?: number; // Display-only suggested rep count for rep-based moves
}

export const warmupRoutine: WarmupExercise[] = [
  {
    id: 'warmup-cat-cow',
    name: 'Cat-Cow Flow',
    duration: 60,
    instructions: [
      'Start on hands and knees in a tabletop position',
      'Inhale: drop your belly, lift your chest and head (Cow)',
      'Exhale: round your spine, tuck your chin (Cat)',
      'Keep flowing slowly — this is movement, not a static hold',
    ],
    targetMuscles: ['Spine', 'Abs', 'Lower Back'],
    videoUrl: 'https://www.youtube.com/watch?v=kqnua4rHVVA',
  },
  {
    id: 'warmup-trunk-rotations',
    name: 'Trunk Rotations',
    duration: 40,
    instructions: [
      'Stand tall with feet shoulder-width apart (or sit upright)',
      'Let your arms hang loose and relaxed',
      'Rotate your torso side to side, letting your arms swing freely',
      'Keep the pace easy and rhythmic to warm the spine',
    ],
    targetMuscles: ['Abs', 'Obliques'],
    bilateral: true,
  },
  {
    id: 'warmup-hip-circles',
    name: 'Hip Circles',
    duration: 40,
    instructions: [
      'Stand with hands on hips, feet shoulder-width apart',
      'Make slow, controlled circles with your hips',
      'Do half the time in one direction, then reverse',
      'Gradually widen the circles as the joint loosens',
    ],
    targetMuscles: ['Hips', 'Glutes'],
    bilateral: true,
  },
  {
    id: 'warmup-bird-dogs',
    name: 'Slow Bird Dogs',
    duration: 40,
    reps: 8,
    instructions: [
      'Start on hands and knees in a tabletop position',
      'Slowly extend your right arm forward and left leg back',
      'Hold briefly, keeping your hips and shoulders square',
      'Return and switch sides — aim for ~8 slow reps total (focus on control, not fatigue)',
    ],
    targetMuscles: ['Abs', 'Lower Back', 'Glutes'],
    bilateral: true,
  },
  {
    id: 'warmup-leg-swings',
    name: 'Leg Swings',
    duration: 60,
    reps: 10,
    instructions: [
      'Hold a wall or sturdy surface for balance',
      'Swing one leg front-to-back in a relaxed arc (~10 swings)',
      'Then swing the same leg side-to-side across your body (~10 swings)',
      'Switch legs and repeat both directions',
    ],
    targetMuscles: ['Hips', 'Hamstrings', 'Glutes'],
    bilateral: true,
  },
  {
    id: 'warmup-glute-bridges',
    name: 'Bodyweight Glute Bridges',
    duration: 40,
    reps: 12,
    instructions: [
      'Lie on your back, knees bent, feet flat on the floor',
      'Squeeze your glutes and lift your hips toward the ceiling',
      'Pause at the top, then lower with control',
      'Do ~12 reps — this is activation, not a working set (glutes often fire poorly cold)',
    ],
    targetMuscles: ['Glutes', 'Hamstrings'],
  },
  {
    id: 'warmup-hinges',
    name: 'Bodyweight Hinges',
    duration: 40,
    reps: 10,
    instructions: [
      'Stand with feet hip-width apart, soft knees',
      'Push your hips back and hinge forward, keeping your back flat',
      'Drive your hips forward to stand tall, squeezing your glutes',
      'Do ~10 reps to rehearse the hinge pattern before loaded sets',
    ],
    targetMuscles: ['Glutes', 'Hamstrings', 'Lower Back'],
  },
  {
    id: 'warmup-arm-circles',
    name: 'Arm Circles',
    duration: 40,
    instructions: [
      'Stand tall and extend your arms out to the sides',
      'Make small circles, gradually growing larger',
      'Do half the time forward, then reverse direction',
      'Keep shoulders relaxed and down away from your ears',
    ],
    targetMuscles: ['Shoulders', 'Upper Back'],
    bilateral: true,
  },
  {
    id: 'warmup-incline-pushups',
    name: 'Easy Incline Push-ups',
    duration: 40,
    reps: 8,
    instructions: [
      'Place your hands on a raised surface (counter, bench, or wall)',
      'Keep your body in a straight line from head to heels',
      'Lower your chest toward the surface with control',
      'Press back up — do ~8 easy reps to prime the pushing pattern',
    ],
    targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
  },
];

// NOTE (coaching session 2026-07-01): band pull-aparts and scapular push-ups
// were removed from the upper-body warmup pending a live test — no exercise
// enters the app untested. Band pull-aparts in particular share the failure
// mode that killed band rows (the short ~62 cm loop bands spike violently at
// full arm extension), and scapular push-ups still need the movement taught.
// Re-add them here once the next session vets them.

// Muscle-group-specific warmups for daily rotation mode. Order is the intended
// movement sequence (regional mobility → activation → pattern rehearsal).
export const muscleGroupWarmups: Record<MuscleGroup, string[]> = {
  abs: ['warmup-cat-cow', 'warmup-trunk-rotations', 'warmup-hip-circles', 'warmup-bird-dogs'],
  glutes: ['warmup-leg-swings', 'warmup-hip-circles', 'warmup-glute-bridges', 'warmup-hinges'],
  lowerBack: ['warmup-cat-cow', 'warmup-hip-circles', 'warmup-hinges'],
  upperBody: ['warmup-arm-circles', 'warmup-incline-pushups'],
};

// Generic full-body movement primer used when no targetMuscleGroup exists
// (full-body workout mode). Covers spine, shoulders, and hips.
export const genericWarmup: string[] = [
  'warmup-cat-cow',
  'warmup-arm-circles',
  'warmup-hip-circles',
  'warmup-leg-swings',
];

/**
 * Get the warmup moves for a specific muscle group, in declared order.
 * When called with `undefined` (full-body mode), returns the generic warmup.
 */
export function getWarmupForMuscleGroup(muscleGroup?: MuscleGroup): WarmupExercise[] {
  const warmupIds = muscleGroup ? muscleGroupWarmups[muscleGroup] : genericWarmup;
  return warmupIds
    .map(id => warmupRoutine.find(warmup => warmup.id === id))
    .filter((warmup): warmup is WarmupExercise => warmup !== undefined);
}
