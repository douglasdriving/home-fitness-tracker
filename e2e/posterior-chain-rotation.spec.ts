import { test, expect, Page } from '@playwright/test';

// The glutes daily-rotation slot is the Posterior Chain day (coaching 2026-06-17).
// It fills a fixed 3-role structure — Slot 1 hinge, Slot 2 glute-builder,
// Slot 3 a rotating accessory that alternates between spinal-extension (erector)
// and lateral-glute work — so lower-back/erector training is never dropped.
const HINGE = ['single-leg-rdl-001', 'good-morning-001'];
const GLUTE_BUILDER = [
  'glute-bridge-001', 'frog-pumps-001', 'single-leg-glute-bridge-001',
  'band-glute-bridge-001', 'hip-thrust-001',
];
const SPINAL_EXTENSION = [
  'reverse-superman-001', 'swimmers-001', 'back-extension-hold-001', 'superman-001',
];
const LATERAL_GLUTE = [
  'band-clamshells-001', 'donkey-kicks-001', 'fire-hydrants-001',
  'band-lateral-walk-001', 'curtsy-lunge-001', 'nordic-curl-assisted-001',
];

function classify(id: string): 'hinge' | 'glute-builder' | 'spinal-extension' | 'lateral-glute' | 'unknown' {
  if (HINGE.includes(id)) return 'hinge';
  if (GLUTE_BUILDER.includes(id)) return 'glute-builder';
  if (SPINAL_EXTENSION.includes(id)) return 'spinal-extension';
  if (LATERAL_GLUTE.includes(id)) return 'lateral-glute';
  return 'unknown';
}

interface SeedEntry {
  id: string;
  workoutId: string;
  workoutNumber: number;
  completedDate: number;
  totalDuration: number;
  exercises: Array<{ exerciseId: string; exerciseName: string; muscleGroups: string[]; completedSets: Array<{ setNumber: number; actualReps: number }> }>;
  workoutMode: 'daily-rotation' | 'full-body';
  targetMuscleGroup?: string;
}

async function seedHistory(page: Page, entries: SeedEntry[]) {
  await page.evaluate((entries) => {
    return new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('FitnessTrackerDB');
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('history', 'readwrite');
        const store = tx.objectStore('history');
        entries.forEach((e) => store.put(e));
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      open.onerror = () => reject(open.error);
    });
  }, entries);
}

function rotationEntry(overrides: Partial<SeedEntry> & { id: string; workoutNumber: number; targetMuscleGroup: string }): SeedEntry {
  return {
    workoutId: `workout-${overrides.id}`,
    completedDate: Date.now() - (1000 - overrides.workoutNumber) * 60000,
    totalDuration: 18,
    exercises: [],
    workoutMode: 'daily-rotation',
    ...overrides,
  };
}

async function getCurrentWorkoutExercises(page: Page): Promise<string[]> {
  const workoutData = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('fitness-tracker-workout') || '{}')
  );
  return (workoutData?.state?.exercises || []).map((ex: { exerciseId: string }) => ex.exerciseId);
}

async function generateGlutesSession(page: Page): Promise<string[]> {
  await expect(page.getByText(/Next: Glutes/)).toBeVisible();
  await page.getByRole('button', { name: /generate daily focus/i }).click();
  await page.getByRole('button', { name: /start/i }).click();
  await page.waitForTimeout(500);
  return getCurrentWorkoutExercises(page);
}

test.describe('Posterior Chain Daily Rotation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
        userId: 'test-user',
        createdDate: Date.now(),
        calibrationCompleted: true,
        hasElasticBands: true,
        strengthLevels: { abs: 30, glutes: 30, lowerBack: 30, upperBody: 30, lastUpdated: Date.now() },
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      }));
    });
    // Reload so the app opens/creates the IndexedDB before we seed history.
    await page.reload();
  });

  test('first posterior-chain session fills hinge + glute-builder + spinal-extension (Slot 3 defaults to spinal-extension)', async ({ page }) => {
    // Newest rotation day = abs, so the next group is glutes (the posterior-chain day).
    await seedHistory(page, [
      rotationEntry({ id: 'abs-1', workoutNumber: 1, targetMuscleGroup: 'abs' }),
    ]);
    await page.reload();

    const ids = await generateGlutesSession(page);
    const roles = ids.map(classify);

    expect(ids).toHaveLength(3);
    expect(roles).toContain('hinge');
    expect(roles).toContain('glute-builder');
    expect(roles).toContain('spinal-extension');
    expect(roles).not.toContain('lateral-glute');
    expect(roles).not.toContain('unknown');
    // Bird Dog and Reverse Hyperextension are retired — never selected.
    expect(ids).not.toContain('bird-dog-001');
    expect(ids).not.toContain('reverse-hyperextension-001');
  });

  test('Slot 3 flips to lateral-glute after a spinal-extension session', async ({ page }) => {
    // Most recent rotation day = abs (so next is glutes). The prior posterior-chain
    // session used a spinal-extension accessory (Back Extension Hold), so the next
    // session's Slot 3 must be lateral-glute.
    await seedHistory(page, [
      rotationEntry({ id: 'abs-2', workoutNumber: 3, targetMuscleGroup: 'abs' }),
      rotationEntry({
        id: 'glutes-prev',
        workoutNumber: 2,
        targetMuscleGroup: 'glutes',
        exercises: [
          { exerciseId: 'good-morning-001', exerciseName: 'Good Morning', muscleGroups: ['glutes', 'lowerBack'], completedSets: [{ setNumber: 1, actualReps: 12 }] },
          { exerciseId: 'glute-bridge-001', exerciseName: 'Glute Bridge', muscleGroups: ['glutes', 'lowerBack'], completedSets: [{ setNumber: 1, actualReps: 12 }] },
          { exerciseId: 'back-extension-hold-001', exerciseName: 'Back Extension Hold', muscleGroups: ['glutes', 'lowerBack'], completedSets: [{ setNumber: 1, actualReps: 20 }] },
        ],
      }),
    ]);
    await page.reload();

    const ids = await generateGlutesSession(page);
    const roles = ids.map(classify);

    expect(roles).toContain('hinge');
    expect(roles).toContain('glute-builder');
    expect(roles).toContain('lateral-glute');
    expect(roles).not.toContain('spinal-extension');
  });
});
