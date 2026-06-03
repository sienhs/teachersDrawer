import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { reissue } from './api/auth';
import useAuthStore from './store/authStore';
import type { User } from './types/auth';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ActivityPlanListPage from './pages/activityPlan/ActivityPlanListPage';
import ActivityPlanUploadPage from './pages/activityPlan/ActivityPlanUploadPage';
import ActivityPlanDetailPage from './pages/activityPlan/ActivityPlanDetailPage';
import ChildDetailPage from './pages/child/ChildDetailPage';
import ChildrenManagePage from './pages/children/ChildrenManagePage';
import ComingSoonPage from './pages/placeholder/ComingSoonPage';
import RhwpTestPage from './pages/devtest/RhwpTestPage';
import RhwpCoreTestPage from './pages/devtest/RhwpCoreTestPage';
import RhwpConsistencyTestPage from './pages/devtest/RhwpConsistencyTestPage';

function App() {
  const [isRestoring, setIsRestoring] = useState(true);
  const hasRestored = useRef(false);

  useEffect(() => {
    // StrictMode 이중 실행 및 의존성 배열 문제 방지
    if (hasRestored.current) return;
    hasRestored.current = true;

    const restoreAuth = async () => {
      const { setAuth, clearAuth } = useAuthStore.getState();
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
  }, []);

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

        {/* 인증 + 공통 레이아웃 적용 영역 */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* 활동계획안 */}
          <Route path="/activity-plans" element={<ActivityPlanListPage />} />
          <Route path="/activity-plans/new" element={<ActivityPlanUploadPage />} />
          <Route path="/activity-plans/:planId" element={<ActivityPlanDetailPage />} />

          {/* 아이 */}
          <Route path="/children/:childId" element={<ChildDetailPage />} />

          <Route path="/children" element={<ChildrenManagePage />} />
          <Route path="/classrooms" element={<ComingSoonPage title="반 관리" />} />
        </Route>

        {/* 개발 도구 — 숨김 라우팅, 사이드바 미표시 */}
        <Route path="/_rhwp-test" element={<RhwpTestPage />} />
        <Route path="/_rhwp-core-test" element={<RhwpCoreTestPage />} />
        <Route path="/_rhwp-consistency-test" element={<RhwpConsistencyTestPage />} />

        {/* 알 수 없는 경로 → 대시보드 */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
