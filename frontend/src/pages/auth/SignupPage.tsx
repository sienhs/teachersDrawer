import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { signup } from '../../api/auth';
import { getRegions, getSigungu, searchSchools, searchKindergartens } from '../../api/school';
import type { ApiResponse } from '../../types/auth';
import type { SchoolType, SchoolInfo, RegionInfo, Sigungu } from '../../types/school';

// 슬라이드 애니메이션: grid-template-rows 0fr→1fr 트릭으로 height auto 트랜지션
function Slide({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition: 'grid-template-rows 0.4s ease, opacity 0.3s ease',
      }}
    >
      <div style={{ overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

const SCHOOL_TYPES: { type: SchoolType; label: string }[] = [
  { type: 'KINDERGARTEN', label: '유치원' },
  { type: 'ELEMENTARY', label: '초등학교' },
  { type: 'MIDDLE', label: '중학교' },
  { type: 'HIGH', label: '고등학교' },
];

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FF9F66] text-gray-700 placeholder:text-gray-300 transition-colors';
const SELECT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[#FF9F66] text-gray-700 bg-white transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed';

export default function SignupPage() {
  // 학교 선택 상태
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);
  const [regions, setRegions] = useState<RegionInfo[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [selectedSido, setSelectedSido] = useState('');
  const [sigunguList, setSigunguList] = useState<Sigungu[]>([]);
  const [sigunguLoading, setSigunguLoading] = useState(false);
  const [selectedSigungu, setSelectedSigungu] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SchoolInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolInfo | null>(null);

  // 가입 폼 상태
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) return <Navigate to="/" replace />;

  // 각 섹션 표시 여부
  const showSido = schoolType === 'KINDERGARTEN';
  const showSigungu = showSido && selectedSido !== '';
  const showSearch =
    schoolType !== null && (schoolType !== 'KINDERGARTEN' || selectedSigungu !== '');
  const showResults = showSearch && hasSearched;
  const showForm = selectedSchool !== null;

  const handleSchoolTypeSelect = async (type: SchoolType) => {
    setSchoolType(type);
    setSelectedSido('');
    setSelectedSigungu('');
    setSigunguList([]);
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    setSelectedSchool(null);

    if (type === 'KINDERGARTEN' && regions.length === 0) {
      setRegionsLoading(true);
      try {
        setRegions(await getRegions());
      } catch {
        // 재시도는 다시 유치원 버튼 클릭 시 가능
      } finally {
        setRegionsLoading(false);
      }
    }
  };

  const handleSidoChange = async (sidoCode: string) => {
    setSelectedSido(sidoCode);
    setSelectedSigungu('');
    setSigunguList([]);
    setSearchResults([]);
    setHasSearched(false);
    setSelectedSchool(null);

    if (!sidoCode) return;
    setSigunguLoading(true);
    try {
      setSigunguList(await getSigungu(sidoCode));
    } catch {
      // ignore
    } finally {
      setSigunguLoading(false);
    }
  };

  const handleSigunguChange = (sggCode: string) => {
    setSelectedSigungu(sggCode);
    setSearchResults([]);
    setHasSearched(false);
    setSelectedSchool(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);
    setHasSearched(true);
    setSelectedSchool(null);
    try {
      const results =
        schoolType === 'KINDERGARTEN'
          ? await searchKindergartens(selectedSido, selectedSigungu, searchQuery)
          : await searchSchools(searchQuery);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;
    setError('');
    setIsSubmitting(true);
    try {
      await signup({
        email,
        password,
        name,
        schoolCode: selectedSchool.schoolCode,
        schoolName: selectedSchool.schoolName,
        schoolType: selectedSchool.schoolType,
      });
      navigate('/login');
    } catch (err) {
      const axiosError = err as AxiosError<ApiResponse<null>>;
      setError(axiosError.response?.data?.message ?? '회원가입에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] flex justify-center p-4 pt-12 pb-12">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#FF9F66]">선생님의 서랍</h1>
          <p className="text-sm text-gray-400 mt-2">함께 시작해요</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-8">

          {/* Step 1: 학교 유형 */}
          <div>
            <p className="text-sm font-medium text-gray-600 mb-3">
              근무하시는 학교 유형을 선택해주세요
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SCHOOL_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSchoolTypeSelect(type)}
                  className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                    schoolType === type
                      ? 'bg-[#FF9F66] text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-[#FF9F66]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: 시도 (유치원) */}
          <Slide open={showSido}>
            <div className="pt-5">
              <p className="text-sm font-medium text-gray-600 mb-2">시도 선택</p>
              <select
                value={selectedSido}
                onChange={(e) => handleSidoChange(e.target.value)}
                disabled={regionsLoading}
                className={SELECT_CLASS}
              >
                <option value="">
                  {regionsLoading ? '불러오는 중...' : '시도를 선택하세요'}
                </option>
                {regions.map((r) => (
                  <option key={r.sidoCode} value={r.sidoCode}>
                    {r.sidoName}
                  </option>
                ))}
              </select>
            </div>
          </Slide>

          {/* Step 3: 시군구 (유치원) */}
          <Slide open={showSigungu}>
            <div className="pt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">시군구 선택</p>
              <select
                value={selectedSigungu}
                onChange={(e) => handleSigunguChange(e.target.value)}
                disabled={sigunguLoading}
                className={SELECT_CLASS}
              >
                <option value="">
                  {sigunguLoading ? '불러오는 중...' : '시군구를 선택하세요'}
                </option>
                {sigunguList.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </Slide>

          {/* Step 4: 학교 검색 */}
          <Slide open={showSearch}>
            <div className="pt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">학교 검색</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="학교 이름을 입력하세요"
                  className={`${INPUT_CLASS} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || searchLoading}
                  className="px-4 py-3 bg-[#FF9F66] text-white rounded-xl font-semibold text-sm hover:bg-[#f08c52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {searchLoading ? '검색 중' : '검색'}
                </button>
              </div>
            </div>
          </Slide>

          {/* Step 5: 검색 결과 */}
          <Slide open={showResults}>
            <div className="pt-3">
              {searchResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-3">검색 결과가 없습니다.</p>
              ) : (
                <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {searchResults.map((school) => (
                    <li key={school.schoolCode}>
                      <button
                        type="button"
                        onClick={() => setSelectedSchool(school)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-colors border ${
                          selectedSchool?.schoolCode === school.schoolCode
                            ? 'bg-orange-50 border-[#FF9F66]'
                            : 'bg-gray-50 border-transparent hover:bg-orange-50'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-700">{school.schoolName}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{school.address}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Slide>

          {/* Step 6: 가입 폼 */}
          <Slide open={showForm}>
            <form onSubmit={handleSubmit} className="pt-6 space-y-4">

              {/* 선택된 학교 확인 */}
              {selectedSchool && (
                <div className="px-4 py-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-xs text-[#FF9F66] font-semibold">선택된 학교</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    {selectedSchool.schoolName}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="홍길동"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-600">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="teacher@example.com"
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
                />
                <p className="text-xs text-gray-400 pl-1">영문 + 숫자 + 특수문자 포함 8자 이상</p>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF9F66] hover:bg-[#f08c52] text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '가입 중...' : '회원가입'}
              </button>
            </form>
          </Slide>

          {/* 로그인 링크 */}
          <div className="mt-6">
            <p className="text-center text-sm text-gray-400">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-[#FF9F66] font-semibold hover:underline">
                로그인
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
