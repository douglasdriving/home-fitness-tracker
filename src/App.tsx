import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/common/BottomNav';
import ScrollToTop from './components/common/ScrollToTop';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
import WorkoutComplete from './pages/WorkoutComplete';
import History from './pages/History';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Calibration from './pages/Calibration';
import Settings from './pages/Settings';
import { useUserStore } from './store/user-store';

function App() {
  const { initializeUser, isLoading } = useUserStore();

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

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
            <Route path="/history" element={<History />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/calibration" element={<Calibration />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}

export default App
