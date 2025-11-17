import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import { useAuthStore } from './store/authStore';

function App() {
  const { user } = useAuthStore();

  // Check if user has admin access
  const hasAdminAccess = user?.email === 'bielnog600@gmail.com';

  return (
    <Router>
      <div className="min-h-screen bg-[rgb(23,23,23)]">
        <nav className="bg-[rgb(28,28,28)] border-b border-[#f8c045]/10 text-[#f8c045] p-4">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">MAROMBIEW</span>
            </div>
            {user && (
              <button
                onClick={() => useAuthStore.getState().signOut()}
                className="bg-[#f8c045] text-[rgb(23,23,23)] px-4 py-2 rounded-lg hover:bg-[#e6b041] transition font-semibold"
              >
                Sair
              </button>
            )}
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
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
                    <div className="max-w-md mx-auto text-center">
                      <h1 className="text-2xl font-bold text-[#f8c045] mb-4">Acesso Restrito</h1>
                      <p className="text-gray-300">
                        Esta área é restrita apenas para administradores.
                      </p>
                    </div>
                  )
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