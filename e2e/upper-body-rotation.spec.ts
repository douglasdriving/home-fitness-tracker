import { test, expect, Page } from '@playwright/test';

// Upper body is the 3rd daily rotation slot (abs → glutes → upperBody).
// Coaching session 2026-07-01: the pool is exactly the three live-tested
// exercises — Table Row (horizontal-pull), Incline Push-Up (horizontal-push),
// and Pike Push-Up (vertical-push, every session — vertical pull is parked).
const TESTED_UPPER_BODY_POOL = [
  'inverted-rows-001',
  'incline-pushups-001',
  'pike-pushups-001',
];

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

test.describe('Upper Body Daily Rotation', () => {
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
        strengthLevels: { abs: 30, glutes: 30, lowerBack: 30, upperBody: 30, lastUpdated: Date.now() },
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      }));
    });
    // Reload so the app opens/creates the IndexedDB before we seed history.
    await page.reload();
  });

  test('after a glutes rotation day, the next group is Upper Body and generates the 3 tested exercises', async ({ page }) => {
    await seedHistory(page, [
      rotationEntry({ id: 'glutes-1', workoutNumber: 1, targetMuscleGroup: 'glutes' }),
    ]);
    await page.reload();

    // Dashboard "Next:" indicator shows Upper Body (not Lower Back)
    await expect(page.getByText(/Next: Upper Body/)).toBeVisible();

    // Generate the daily focus session
    await page.getByRole('button', { name: /generate daily focus/i }).click();
    await page.getByRole('button', { name: /start/i }).click();
    await page.waitForTimeout(500);

    const ids = await getCurrentWorkoutExercises(page);
    expect(ids.slice().sort()).toEqual(TESTED_UPPER_BODY_POOL.slice().sort());
  });

  test('Slot 3 stays pike push-up even directly after a pike push-up session (no alternation)', async ({ page }) => {
    // Newest rotation day = glutes (so next is upperBody); the prior upper body
    // session already used pike push-ups. Vertical pull is parked (no equipment),
    // so Slot 3 must be pike push-up again — the same three exercises every time.
    await seedHistory(page, [
      rotationEntry({ id: 'glutes-2', workoutNumber: 3, targetMuscleGroup: 'glutes' }),
      rotationEntry({
        id: 'upper-1',
        workoutNumber: 2,
        targetMuscleGroup: 'upperBody',
        exercises: [
          { exerciseId: 'inverted-rows-001', exerciseName: 'Table Row', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
          { exerciseId: 'incline-pushups-001', exerciseName: 'Incline Push-Up', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
          { exerciseId: 'pike-pushups-001', exerciseName: 'Pike Push-Up', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
        ],
      }),
    ]);
    await page.reload();

    await expect(page.getByText(/Next: Upper Body/)).toBeVisible();

    await page.getByRole('button', { name: /generate daily focus/i }).click();
    await page.getByRole('button', { name: /start/i }).click();
    await page.waitForTimeout(500);

    const ids = await getCurrentWorkoutExercises(page);
    expect(ids.slice().sort()).toEqual(TESTED_UPPER_BODY_POOL.slice().sort());
  });
});
