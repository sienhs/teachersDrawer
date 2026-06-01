import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { differenceInYears, parseISO } from 'date-fns';
import { childApi } from '../../api/child';
import { enrollmentApi } from '../../api/enrollment';
import { activityPlanApi } from '../../api/activityPlan';
import MontessoriTimeline from '../../components/child/MontessoriTimeline';
import MiniCalendar from '../../components/calendar/MiniCalendar';
import Spinner from '../../components/ui/Spinner';
import type { Child } from '../../types/child';
import type { Enrollment } from '../../types/enrollment';
import type { MontessoriHistoryItem } from '../../types/activityPlan';

const GENDER_LABEL: Record<string, string> = {
  MALE: '남',
  FEMALE: '여',
  M: '남',
  F: '여',
};

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return '';
  try {
    return `만 ${differenceInYears(new Date(), parseISO(birthDate))}세`;
  } catch {
    return '';
  }
}

export default function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [history, setHistory] = useState<MontessoriHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (!childId) return;
    const id = Number(childId);

    Promise.all([
      childApi.get(id),
      enrollmentApi.listByChild(id),
      activityPlanApi.listChildMontessori(id),
    ])
      .then(([c, enr, hist]) => {
        setChild(c);
        setEnrollments(enr);
        setHistory(hist);
      })
      .catch(() => setError('정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [childId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !child) {
    return (
      <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-500">
        {error || '데이터를 불러올 수 없습니다.'}
      </div>
    );
  }

  // 가장 최근 반 (year 내림차순)
  const latestEnrollment = [...enrollments].sort((a, b) => b.year - a.year)[0];

  const metaParts = [
    calcAge(child.birthDate),
    child.gender ? (GENDER_LABEL[child.gender] ?? child.gender) : null,
    latestEnrollment
      ? `${latestEnrollment.classroomName} (${latestEnrollment.year})`
      : null,
  ].filter(Boolean);

  const highlightedDates = [...new Set(history.map((h) => h.planDate))];

  const handleDateSelect = (date: string) => {
    setSelectedDate((prev) => (prev === date ? null : date));
    // 타임라인의 해당 날짜 카드로 스크롤
    setTimeout(() => {
      const el = document.getElementById(`montessori-${date}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="space-y-5">
      {/* 뒤로 가기 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#FF9F66] transition-colors"
      >
        ← 뒤로
      </button>

      {/* 기본 정보 */}
      <div className="rounded-2xl bg-white p-6 shadow-sm shadow-orange-50">
        <h1 className="text-2xl font-bold text-gray-800">{child.name}</h1>
        {metaParts.length > 0 && (
          <p className="mt-1 text-sm text-[#FF9F66]">{metaParts.join(' · ')}</p>
        )}
        {child.memo && (
          <p className="mt-3 text-sm text-gray-500">{child.memo}</p>
        )}
      </div>

      {/* 2단 레이아웃 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {/* 미니 캘린더 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-orange-50">
          <h2 className="mb-3 text-base font-bold text-gray-800">활동한 날</h2>
          <MiniCalendar
            highlightedDates={highlightedDates}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
          />
          {highlightedDates.length > 0 && (
            <p className="mt-3 text-center text-xs text-gray-400">
              총 {highlightedDates.length}일 · 주황 점 표시
            </p>
          )}
        </div>

        {/* 몬테소리 타임라인 */}
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-orange-50">
          <h2 className="mb-3 text-base font-bold text-gray-800">
            영역별 교구 활동 ({history.length})
          </h2>
          <MontessoriTimeline history={history} highlightDate={selectedDate} />
        </div>
      </div>
    </div>
  );
}
