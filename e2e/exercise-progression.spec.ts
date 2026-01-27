import { test, expect } from '@playwright/test';

test.describe('Exercise Progression System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('FitnessTrackerDB');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      });
    });
    // Clear localStorage
    await page.evaluate(() => localStorage.clear());
    // Reload to apply changes
    await page.reload();
  });

  test.describe('Exercise Status Page', () => {
    test('shows exercise tabs (Active, Locked, Retired)', async ({ page }) => {
      // Set up a calibrated user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Should see all three tabs
      await expect(page.getByText(/Active \(\d+\)/)).toBeVisible();
      await expect(page.getByText(/Locked \(\d+\)/)).toBeVisible();
      await expect(page.getByText(/Retired \(\d+\)/)).toBeVisible();
    });

    test('shows locked exercises with unlock requirements', async ({ page }) => {
      // Set up a calibrated user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Click on Locked tab
      await page.click('text=/Locked/');

      // Should see at least one locked exercise
      // Flutter Kicks requires 40 Crunches, so it should be locked for a new user
      await expect(page.locator('.bg-background-light').first()).toBeVisible({ timeout: 5000 });
    });

    test('shows active exercises count is greater than 0', async ({ page }) => {
      // Set up a calibrated user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Should have active exercises (exercises without unlock requirements)
      const activeTab = page.getByText(/Active \((\d+)\)/);
      await expect(activeTab).toBeVisible();

      // Extract the count from the tab text
      const tabText = await activeTab.textContent();
      const match = tabText?.match(/Active \((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;

      expect(count).toBeGreaterThan(0);
    });

    test('can switch between tabs', async ({ page }) => {
      // Set up a calibrated user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Start on Active tab (default)
      await expect(page.locator('button:has-text("Active")').first()).toHaveClass(/text-primary/);

      // Click Locked tab
      await page.click('text=/Locked/');
      await expect(page.locator('button:has-text("Locked")').first()).toHaveClass(/text-primary/);

      // Click Retired tab
      await page.click('text=/Retired/');
      await expect(page.locator('button:has-text("Retired")').first()).toHaveClass(/text-primary/);
    });
  });

  test.describe('Exercise Unlock Flow', () => {
    test('exercises without unlock requirements are immediately available', async ({ page }) => {
      // Set up a calibrated user with no workout history
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Crunches should be in Active (no unlock requirement)
      await expect(page.getByText('Crunches')).toBeVisible();
    });

    test('workout generator only uses available (unlocked) exercises', async ({ page }) => {
      // Set up a calibrated user
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Generate a workout
      await page.getByRole('button', { name: /generate|new workout/i }).click();
      await page.waitForTimeout(500);

      // The workout should not contain locked exercises like Flutter Kicks
      // (which requires 40 Crunches to unlock)
      const workoutPreview = await page.locator('.bg-background-light').allTextContents();
      const containsFlutterKicks = workoutPreview.some(text => text.includes('Flutter Kicks'));

      expect(containsFlutterKicks).toBe(false);
    });
  });

  test.describe('Exercise Retirement Flow', () => {
    test('retired exercises are excluded from workouts', async ({ page }) => {
      // Set up a user with a retired exercise
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
          exerciseAchievements: {
            unlockedExercises: [],
            retiredExercises: ['crunches-001'], // Crunches is retired
          },
        }));
      });
      await page.reload();

      // Generate a workout
      await page.getByRole('button', { name: /generate|new workout/i }).click();
      await page.waitForTimeout(500);

      // Start the workout to see exercises
      await page.getByRole('button', { name: /start workout/i }).click();

      // The workout should not contain Crunches (it's retired)
      const exerciseName = await page.locator('h2').first().textContent();
      expect(exerciseName).not.toBe('Crunches');
    });

    test('can restore retired exercises', async ({ page }) => {
      // Set up a user with a retired exercise
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
          exerciseAchievements: {
            unlockedExercises: [],
            retiredExercises: ['crunches-001'], // Crunches is retired
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Click on Retired tab
      await page.click('text=/Retired/');

      // Should see Crunches in retired list
      await expect(page.getByText('Crunches')).toBeVisible();

      // Click Restore button
      await page.click('text=Restore');

      // Crunches should now be gone from retired list
      await expect(page.getByText('Crunches')).not.toBeVisible();

      // Switch to Active tab - Crunches should be there
      await page.click('text=/Active/');
      await expect(page.getByText('Crunches')).toBeVisible();
    });
  });

  test.describe('Achievements Persistence', () => {
    test('unlocked exercises persist across page reloads', async ({ page }) => {
      // Set up a user with unlocked exercises
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
          exerciseAchievements: {
            unlockedExercises: ['flutter-kicks-001'],
            retiredExercises: [],
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Flutter Kicks should be in Active (it's been unlocked)
      await expect(page.getByText('Flutter Kicks')).toBeVisible();

      // Reload the page
      await page.reload();
      await page.waitForURL('/exercises');

      // Flutter Kicks should still be visible
      await expect(page.getByText('Flutter Kicks')).toBeVisible();
    });

    test('retired exercises persist across page reloads', async ({ page }) => {
      // Set up a user with retired exercises
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
          exerciseAchievements: {
            unlockedExercises: [],
            retiredExercises: ['crunches-001'],
          },
        }));
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Click on Retired tab
      await page.click('text=/Retired/');

      // Crunches should be in Retired
      await expect(page.getByText('Crunches')).toBeVisible();

      // Reload the page
      await page.reload();
      await page.waitForURL('/exercises');

      // Click Retired tab again
      await page.click('text=/Retired/');

      // Crunches should still be in Retired
      await expect(page.getByText('Crunches')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('bottom nav shows Exercises instead of Progress', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Should see Exercises in bottom nav, not Progress
      await expect(page.locator('nav').getByText('Exercises')).toBeVisible();
      await expect(page.locator('nav').getByText('Progress')).not.toBeVisible();
    });

    test('Exercises nav item navigates to /exercises', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));
      });
      await page.reload();

      // Click Exercises in nav
      await page.click('text=Exercises');

      // Should navigate to /exercises
      await expect(page).toHaveURL('/exercises');
    });
  });

  test.describe('Locked Exercise Progress Display', () => {
    test('shows progress bar for locked exercises', async ({ page }) => {
      // Set up a user who has done some crunches but not enough to unlock flutter kicks
      await page.goto('/');
      await page.evaluate(async () => {
        localStorage.setItem('fitness-tracker-user-profile', JSON.stringify({
          userId: 'test-user',
          createdDate: Date.now(),
          calibrationCompleted: true,
          strengthLevels: {
            abs: 30,
            glutes: 30,
            lowerBack: 30,
            lastUpdated: Date.now(),
          },
        }));

        // Add workout history with 30 crunches (need 40 to unlock flutter kicks)
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('FitnessTrackerDB', 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('history')) {
              db.createObjectStore('history', { keyPath: 'id' });
            }
          };
        });

        const tx = db.transaction(['history'], 'readwrite');
        const store = tx.objectStore('history');
        store.add({
          id: 'history-1',
          workoutId: 'workout-1',
          workoutNumber: 1,
          completedDate: Date.now(),
          totalDuration: 30,
          exercises: [{
            exerciseId: 'crunches-001',
            exerciseName: 'Crunches',
            muscleGroups: ['abs'],
            completedSets: [{ setNumber: 1, actualReps: 30 }],
          }],
        });
      });
      await page.reload();

      // Navigate to Exercises tab
      await page.click('text=Exercises');
      await page.waitForURL('/exercises');

      // Click on Locked tab
      await page.click('text=/Locked/');

      // Should show Flutter Kicks with progress (30/40)
      await expect(page.getByText('Flutter Kicks')).toBeVisible();
      await expect(page.getByText(/30\/40/)).toBeVisible();
    });
  });
});
