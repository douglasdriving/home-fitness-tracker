import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/common/BottomNav';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💪</div>
          <div className="text-lg font-medium text-gray-700">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 pb-16">
        <div className="max-w-md mx-auto min-h-screen">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<WorkoutExecution />} />
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
