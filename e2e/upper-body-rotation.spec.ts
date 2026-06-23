import { test, expect, Page } from '@playwright/test';

// Issue #27: Upper body is wired as the 3rd daily rotation slot, replacing lower
// back. Rotation is abs → glutes → upperBody. The upper body day fills 3 role
// slots: horizontal-pull, horizontal-push, and an alternating vertical slot.

// Known upper body slot membership (mirrors src/data/exercises.json upperBodySlot).
const HORIZONTAL_PULL = ['doorway-rows-001', 'inverted-rows-001', 'band-rows-001'];
const HORIZONTAL_PUSH = [
  'incline-pushups-001',
  'pushups-001',
  'chair-dips-001',
  'feet-elevated-pushups-001',
  'archer-pushups-001',
];
const VERTICAL_PULL = ['band-lat-pulldown-001'];
const VERTICAL_PUSH = ['pike-pushups-001', 'band-overhead-press-001'];

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
        hasElasticBands: true,
        strengthLevels: { abs: 30, glutes: 30, lowerBack: 30, upperBody: 30, lastUpdated: Date.now() },
        exerciseAchievements: { unlockedExercises: [], retiredExercises: [] },
      }));
    });
    // Reload so the app opens/creates the IndexedDB before we seed history.
    await page.reload();
  });

  test('after a glutes rotation day, the next group is Upper Body and generates the 3 slot roles', async ({ page }) => {
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
    expect(ids.length).toBe(3);

    const pulls = ids.filter((id) => HORIZONTAL_PULL.includes(id));
    const pushes = ids.filter((id) => HORIZONTAL_PUSH.includes(id));
    const verticals = ids.filter((id) => VERTICAL_PULL.includes(id) || VERTICAL_PUSH.includes(id));

    expect(pulls.length).toBe(1);
    expect(pushes.length).toBe(1);
    expect(verticals.length).toBe(1);
  });

  test('Slot 3 alternates to vertical-pull after a prior vertical-push session', async ({ page }) => {
    // Newest rotation day = glutes (so next is upperBody); a prior upper body
    // session used pike push-ups (vertical-push) so Slot 3 should flip to vertical-pull.
    await seedHistory(page, [
      rotationEntry({ id: 'glutes-2', workoutNumber: 3, targetMuscleGroup: 'glutes' }),
      rotationEntry({
        id: 'upper-1',
        workoutNumber: 2,
        targetMuscleGroup: 'upperBody',
        exercises: [
          { exerciseId: 'inverted-rows-001', exerciseName: 'Inverted Rows', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
          { exerciseId: 'pushups-001', exerciseName: 'Push-Ups', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
          { exerciseId: 'pike-pushups-001', exerciseName: 'Pike Push-Ups', muscleGroups: ['upperBody'], completedSets: [{ setNumber: 1, actualReps: 10 }] },
        ],
      }),
    ]);
    await page.reload();

    await expect(page.getByText(/Next: Upper Body/)).toBeVisible();

    await page.getByRole('button', { name: /generate daily focus/i }).click();
    await page.getByRole('button', { name: /start/i }).click();
    await page.waitForTimeout(500);

    const ids = await getCurrentWorkoutExercises(page);
    expect(ids.length).toBe(3);

    const verticalPull = ids.filter((id) => VERTICAL_PULL.includes(id));
    const verticalPush = ids.filter((id) => VERTICAL_PUSH.includes(id));
    expect(verticalPull.length).toBe(1);
    expect(verticalPush.length).toBe(0);
  });
});
