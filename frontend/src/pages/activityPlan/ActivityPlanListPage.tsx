import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityPlanApi } from '../../api/activityPlan';
import { classroomApi } from '../../api/classroom';
import ActivityPlanCard from '../../components/activityPlan/ActivityPlanCard';
import Spinner from '../../components/ui/Spinner';
import type { ActivityPlanSummary } from '../../types/activityPlan';
import type { Classroom } from '../../types/classroom';

const ALL = '' as const;

export default function ActivityPlanListPage() {
  const navigate = useNavigate();

  const [plans, setPlans] = useState<ActivityPlanSummary[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [classroomFilter, setClassroomFilter] = useState<string>(ALL);
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  const metaLoaded = useRef(false);

  const fetchPlans = useCallback(
    (cid: string, from: string, to: string) => {
      setLoading(true);
      setError('');
      activityPlanApi
        .list({
          classroomId: cid ? Number(cid) : undefined,
          from: from || undefined,
          to: to || undefined,
        })
        .then(setPlans)
        .catch(() => setError('목록을 불러오지 못했습니다. 새로고침해 주세요.'))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (!metaLoaded.current) {
      metaLoaded.current = true;
      classroomApi.list().then(setClassrooms).catch(() => {});
    }
    fetchPlans(classroomFilter, fromFilter, toFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = () => fetchPlans(classroomFilter, fromFilter, toFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">활동계획안</h1>
        <button
          type="button"
          onClick={() => navigate('/activity-plans/new')}
          className="rounded-xl bg-[#FF9F66] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52]"
        >
          + 업로드하기
        </button>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-orange-50">
        <select
          value={classroomFilter}
          onChange={(e) => setClassroomFilter(e.target.value)}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
        >
          <option value="">전체 반</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.year}년 {c.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <span className="text-gray-400">~</span>
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>

        <button
          type="button"
          onClick={handleFilter}
          className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-orange-50 hover:text-[#FF9F66] transition-colors"
        >
          검색
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && plans.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 py-16 text-center">
          <p className="text-sm text-gray-500">아직 업로드된 활동계획안이 없습니다.</p>
          <button
            type="button"
            onClick={() => navigate('/activity-plans/new')}
            className="rounded-xl bg-[#FF9F66] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52]"
          >
            업로드하기
          </button>
        </div>
      )}

      {/* 카드 그리드 */}
      {!loading && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <ActivityPlanCard
              key={plan.id}
              plan={plan}
              onClick={() => navigate(`/activity-plans/${plan.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
