import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { EventInput } from '@fullcalendar/core';
import DashboardCalendar from '../../components/calendar/DashboardCalendar';
import ActivityDetailPanel from '../../components/calendar/ActivityDetailPanel';
import Spinner from '../../components/ui/Spinner';
import { activityPlanApi } from '../../api/activityPlan';
import { classroomApi } from '../../api/classroom';
import { childApi } from '../../api/child';
import type { ActivityPlanDetail, ActivityPlanSummary } from '../../types/activityPlan';
import type { Classroom } from '../../types/classroom';
import type { Child } from '../../types/child';

const ALL = 'all' as const;

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export default function DashboardPage() {
  const navigate = useNavigate();

  // 데이터
  const [plans, setPlans] = useState<ActivityPlanSummary[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [children, setChildren] = useState<Child[]>([]);

  // 상태
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 필터
  const [classroomFilter, setClassroomFilter] = useState<number | typeof ALL>(ALL);
  const [childFilter, setChildFilter] = useState<number | typeof ALL>(ALL);
  // 아이 필터 선택 시, 그 아이의 몬테소리 활동이 있는 날짜 집합 (null = 필터 없음)
  const [childPlanDates, setChildPlanDates] = useState<Set<string> | null>(null);

  // 우측 패널
  const [detail, setDetail] = useState<ActivityPlanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  // 같은 범위 중복 fetch 방지 (StrictMode 이중 실행 대비)
  const lastRangeKey = useRef<string>('');

  // 반·아이 목록은 마운트 시 1회 로드 (필터용)
  const metaLoaded = useRef(false);
  useEffect(() => {
    if (metaLoaded.current) return;
    metaLoaded.current = true;

    (async () => {
      try {
        const [cls, kids] = await Promise.all([classroomApi.list(), childApi.list()]);
        setClassrooms(cls);
        setChildren(kids);
      } catch {
        // 필터 메타 로드 실패는 치명적이지 않음 — 캘린더는 계속 동작
      }
    })();
  }, []);

  // 보이는 달이 바뀔 때마다 그 범위의 활동계획안 조회
  const handleRangeChange = useCallback((start: Date, end: Date) => {
    const from = ymd(start);
    const to = ymd(end);
    const key = `${from}_${to}`;
    if (lastRangeKey.current === key) return;
    lastRangeKey.current = key;

    setLoading(true);
    setError('');
    activityPlanApi
      .list({ from, to })
      .then(setPlans)
      .catch(() => setError('활동계획안을 불러오지 못했습니다. 새로고침해 주세요.'))
      .finally(() => setLoading(false));
  }, []);

  // 아이 필터 변경 → 그 아이의 몬테소리 이력에서 날짜 집합 추출
  useEffect(() => {
    if (childFilter === ALL) {
      setChildPlanDates(null);
      return;
    }
    let cancelled = false;
    activityPlanApi
      .listChildMontessori(childFilter)
      .then((history) => {
        if (!cancelled) setChildPlanDates(new Set(history.map((h) => h.planDate)));
      })
      .catch(() => {
        if (!cancelled) setChildPlanDates(new Set()); // 실패 시 빈 집합 → 표시 없음
      });
    return () => {
      cancelled = true;
    };
  }, [childFilter]);

  // 필터 적용된 캘린더 이벤트
  const events = useMemo<EventInput[]>(() => {
    return plans
      .filter((p) => classroomFilter === ALL || p.classroomId === classroomFilter)
      .filter((p) => childPlanDates === null || childPlanDates.has(p.planDate))
      .map((p) => ({
        id: String(p.id),
        title: p.subject || p.fileName.replace(/\.(hwpx?|HWPX?)$/, ''),
        date: p.planDate,
        extendedProps: {
          planId: p.id,
          classroomId: p.classroomId,
          classNameRaw: p.classNameRaw,
        },
      }));
  }, [plans, classroomFilter, childPlanDates]);

  const handleEventClick = useCallback((planId: number) => {
    setPanelOpen(true);
    setDetailLoading(true);
    activityPlanApi
      .get(planId)
      .then((d) => setDetail(d))
      .catch(() => {
        setDetail(null);
        setPanelOpen(false);
        alert('활동계획안 상세를 불러오지 못했습니다.');
      })
      .finally(() => setDetailLoading(false));
  }, []);

  const isEmpty = !loading && !error && plans.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">대시보드</h1>
        {loading && <Spinner className="h-5 w-5" />}
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-orange-50">
        <select
          value={classroomFilter}
          onChange={(e) =>
            setClassroomFilter(e.target.value === ALL ? ALL : Number(e.target.value))
          }
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value={ALL}>전체 반</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.year} {c.name}
            </option>
          ))}
        </select>

        <select
          value={childFilter}
          onChange={(e) => setChildFilter(e.target.value === ALL ? ALL : Number(e.target.value))}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value={ALL}>전체 아이</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {childFilter !== ALL && (
          <span className="text-xs text-gray-400">
            선택한 아이의 몬테소리 활동이 있는 날만 표시 중
          </span>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
      )}

      {/* 빈 상태 안내 (캘린더는 그대로 표시) */}
      {isEmpty && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-5 py-4">
          <p className="text-sm text-gray-500">
            이번 달에 업로드된 활동계획안이 없습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate('/activity-plans')}
            className="rounded-xl bg-[#FF9F66] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52]"
          >
            업로드하기
          </button>
        </div>
      )}

      {/* 캘린더 + 우측 슬라이드 패널 */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm shadow-orange-50">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60">
            <Spinner />
          </div>
        )}
        <DashboardCalendar
          events={events}
          onEventClick={handleEventClick}
          onRangeChange={handleRangeChange}
        />
        <ActivityDetailPanel
          detail={detail}
          open={panelOpen}
          loading={detailLoading}
          onClose={() => setPanelOpen(false)}
        />
      </div>
    </div>
  );
}
