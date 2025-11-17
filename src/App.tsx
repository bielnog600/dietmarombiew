import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import DietPlan from './pages/DietPlan.tsx';
import { useAuthStore } from './store/authStore';
import { useTranslation } from './translations';
import SplashScreen from './components/SplashScreen';

function App() {
  const { user, loading, checkAndRefreshSession } = useAuthStore();
  const { t } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.scrollTo(0, 0);
        checkAndRefreshSession();
      }
    };

    const handleResize = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const isKeyboardVisible = viewport.height < window.innerHeight;
        document.body.classList.toggle('keyboard-visible', isKeyboardVisible);
        
        if (!isKeyboardVisible) {
          window.scrollTo(0, 0);
        }
      }
      // Update body height to match window height
      document.body.style.height = `${window.innerHeight}px`;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    window.addEventListener('resize', handleResize);

    // Initial height setup
    handleResize();

    const checkInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshSession();
      }
    }, 4 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
      window.removeEventListener('resize', handleResize);
      clearInterval(checkInterval);
    };
  }, [checkAndRefreshSession]);

  if (loading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const hasAdminAccess = user?.email === 'bielnog600@gmail.com';

  return (
    <Router>
      <div className="min-h-full bg-[rgb(23,23,23)] flex flex-col">
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <Login />}
            />
            <Route
              path="/register"
              element={user ? <Navigate to="/dashboard" /> : <Register />}
            />
            <Route
              path="/dashboard"
              element={
                user ? (
                  hasAdminAccess ? (
                    <Dashboard />
                  ) : (
                    <DietPlan />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/diet-plan"
              element={
                user ? (
                  <DietPlan />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;