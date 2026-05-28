import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { reissue } from './api/auth';
import useAuthStore from './store/authStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import HomePage from './pages/home/HomePage';

function App() {
  const [isRestoring, setIsRestoring] = useState(true);
  const { setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const accessToken = await reissue();
        const saved = localStorage.getItem('auth_user');
        if (saved) {
          setAuth(accessToken, JSON.parse(saved) as User);
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setIsRestoring(false);
      }
    };

    restoreAuth();
  }, [setAuth, clearAuth]);

  if (isRestoring) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">불러오는 중...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
