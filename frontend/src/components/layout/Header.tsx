import { useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import useAuthStore from '../../store/authStore';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // 서버 로그아웃 실패해도 클라이언트 세션은 정리
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-orange-100/60 bg-[#FFF8F0]/90 px-6 backdrop-blur">
      {/* 로고 */}
      <button
        type="button"
        onClick={() => navigate('/dashboard')}
        className="text-xl font-bold text-[#FF9F66] whitespace-nowrap"
      >
        선생님의 서랍
      </button>

      {/* 검색바 (이번 단계엔 UI만 — 동작 없음) */}
      <div className="flex-1 px-4">
        <input
          type="text"
          disabled
          placeholder="통합 검색 (준비 중)"
          className="w-full max-w-md cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-400 placeholder:text-gray-400"
        />
      </div>

      {/* 사용자 메뉴 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-600">
          {user?.name ?? '선생님'}님
        </span>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-orange-50 hover:text-[#FF9F66]"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
