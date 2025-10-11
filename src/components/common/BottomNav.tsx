import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/history', label: 'History', icon: '📊' },
    { path: '/exercises', label: 'Exercises', icon: '💪' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="max-w-md mx-auto px-4">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-all relative ${
                isActive(item.path)
                  ? 'text-primary bg-primary/5'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {isActive(item.path) && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-b" />
              )}
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className={`text-xs ${isActive(item.path) ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
