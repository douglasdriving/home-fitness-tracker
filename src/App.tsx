import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/common/BottomNav';
import ScrollToTop from './components/common/ScrollToTop';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
import WorkoutComplete from './pages/WorkoutComplete';
import StretchingRoutine from './pages/StretchingRoutine';
import History from './pages/History';
import Progress from './pages/Progress';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Calibration from './pages/Calibration';
import Settings from './pages/Settings';
import Challenges from './pages/Challenges';
import ChallengeAttempt from './pages/ChallengeAttempt';
import { useUserStore } from './store/user-store';
import { backfillStrengthHistory, needsMigration } from './lib/strength-migration';

// Workflow verification: Autonomous feedback refinement and implementation cycle working as expected
function App() {
  const { initializeUser, isLoading, profile } = useUserStore();

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  // Auto-trigger strength history backfill on first app load if needed
  useEffect(() => {
    const runAutoBackfill = async () => {
      if (!profile || profile.hasBackfilledStrengthData) return;

      const migrationNeeded = await needsMigration();
      if (migrationNeeded) {
        console.log('Auto-running strength history backfill...');
        try {
          const result = await backfillStrengthHistory();
          if (result.success) {
            console.log(`Backfill complete: ${result.snapshotsCreated} snapshots created`);
          } else {
            console.error('Backfill completed with errors:', result.errors);
          }
        } catch (error) {
          console.error('Auto-backfill failed:', error);
        }
      }
    };

    runAutoBackfill();
  }, [profile]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-lg font-medium text-text">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="bg-background min-h-screen pb-20">
        <div className="max-w-md mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<WorkoutExecution />} />
            <Route path="/workout-complete" element={<WorkoutComplete />} />
            <Route path="/stretching" element={<StretchingRoutine />} />
            <Route path="/history" element={<History />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/calibration" element={<Calibration />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/challenge-attempt" element={<ChallengeAttempt />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App
