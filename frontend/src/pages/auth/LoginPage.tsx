import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { login } from '../../api/auth';
import useAuthStore from '../../store/authStore';
import type { ApiResponse } from '../../types/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await login({ email, password });
      setAuth(res.accessToken, { name: res.name, email: res.email });
      navigate('/');
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#FF9F66]">선생님의 서랍</h1>
          <p className="text-sm text-gray-400 mt-2">소중한 기록을 담아두는 공간</p>
        </div>

        {/* 카드 */}
        <div className="bg-white rounded-3xl shadow-lg shadow-orange-50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="teacher@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FF9F66] text-gray-700 placeholder:text-gray-300 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-600">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FF9F66] text-gray-700 placeholder:text-gray-300 transition-colors"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#FF9F66] hover:bg-[#f08c52] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            아직 계정이 없으신가요?{' '}
            <Link to="/signup" className="text-[#FF9F66] font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
