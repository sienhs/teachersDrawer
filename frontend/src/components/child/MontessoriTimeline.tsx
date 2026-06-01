import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { MontessoriHistoryItem } from '../../types/activityPlan';

interface Props {
  history: MontessoriHistoryItem[];
  highlightDate?: string | null; // yyyy-MM-dd, 미니 캘린더 날짜 클릭 시 강조
}

const ALL = 'all' as const;

// 영역별 배지 색 (area 값은 HWP에서 추출된 한글)
const AREA_COLORS = [
  'bg-orange-100 text-orange-700',
  'bg-sky-100 text-sky-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-yellow-100 text-yellow-700',
  'bg-pink-100 text-pink-700',
];

function areaColor(area: string, areas: string[]): string {
  const idx = areas.indexOf(area);
  return AREA_COLORS[idx % AREA_COLORS.length];
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'yyyy.MM.dd (EEE)', { locale: ko });
  } catch {
    return dateStr;
  }
}

// 아이 상세용 몬테소리 활동 타임라인. 영역 탭 필터 + 날짜 강조 지원.
export default function MontessoriTimeline({ history, highlightDate }: Props) {
  const areas = useMemo(() => {
    const set = new Set(history.map((h) => h.area ?? '미분류'));
    return [ALL, ...Array.from(set)];
  }, [history]);

  const [areaFilter, setAreaFilter] = useState<string | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    const base =
      areaFilter === ALL ? history : history.filter((h) => (h.area ?? '미분류') === areaFilter);
    // 내림차순 (최신 먼저)
    return [...base].sort((a, b) => b.planDate.localeCompare(a.planDate));
  }, [history, areaFilter]);

  if (history.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400">
        아직 이 아이의 몬테소리 활동 기록이 없습니다.
      </p>
    );
  }

  const areaList = areas.filter((a) => a !== ALL) as string[];

  return (
    <div className="space-y-4">
      {/* 영역 탭 */}
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAreaFilter(a)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              areaFilter === a
                ? 'bg-[#FF9F66] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-[#FF9F66]'
            }`}
          >
            {a === ALL ? '전체' : a} {a !== ALL && `(${history.filter((h) => (h.area ?? '미분류') === a).length})`}
          </button>
        ))}
      </div>

      {/* 타임라인 */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const isHighlighted = highlightDate === item.planDate;
          return (
            <div
              key={item.id}
              id={`montessori-${item.planDate}`}
              className={`rounded-xl border p-4 transition-colors ${
                isHighlighted
                  ? 'border-[#FF9F66] bg-orange-50'
                  : 'border-gray-100 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">{formatDate(item.planDate)}</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {item.material || '교구 미기록'}
                  </p>
                  {item.area && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${areaColor(item.area, areaList)}`}
                    >
                      {item.area}
                    </span>
                  )}
                </div>
                {item.confirmed && (
                  <span className="shrink-0 text-xs text-gray-400">확인: {item.confirmed}</span>
                )}
              </div>
              {/* 해당 활동계획안 링크 — planDate 기준으로 목록 조회 링크 (상세 id 없음) */}
              <div className="mt-2">
                <Link
                  to={`/activity-plans?from=${item.planDate}&to=${item.planDate}`}
                  className="text-xs text-[#FF9F66] hover:underline"
                >
                  활동계획안 보기 →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
