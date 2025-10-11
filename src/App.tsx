import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/common/BottomNav';
import Dashboard from './pages/Dashboard';
import WorkoutExecution from './pages/WorkoutExecution';
import History from './pages/History';
import ExerciseLibrary from './pages/ExerciseLibrary';
import Calibration from './pages/Calibration';
import Settings from './pages/Settings';

function App() {
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
