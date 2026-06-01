import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ActivityPlanDetail, SectionCategory } from '../../types/activityPlan';
import Spinner from '../ui/Spinner';

interface Props {
  detail: ActivityPlanDetail | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
}

// 카테고리별 살짝 다른 색 (라벨 점)
const CATEGORY_COLOR: Record<SectionCategory, string> = {
  MORNING: 'bg-amber-400',
  SAFETY: 'bg-red-400',
  LUNCH: 'bg-green-400',
  OUTDOOR: 'bg-sky-400',
  EVALUATION: 'bg-purple-400',
  OTHER: 'bg-gray-300',
};

function formatPlanDate(planDate?: string | null): string {
  if (!planDate) return '';
  try {
    return format(parseISO(planDate), 'yyyy년 M월 d일 (EEE)', { locale: ko });
  } catch {
    return planDate;
  }
}

export default function ActivityDetailPanel({ detail, open, loading, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className={`absolute right-0 top-0 z-10 h-full w-[400px] max-w-[90vw] transform border-l border-orange-100 bg-white shadow-xl transition-transform duration-300 ${
        open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
      }`}
      aria-hidden={!open}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      ) : detail ? (
        <div className="flex h-full flex-col">
          {/* 헤더 */}
          <div className="flex items-start justify-between border-b border-gray-100 p-5">
            <div>
              <p className="text-xs text-gray-400">{formatPlanDate(detail.planDate)}</p>
              <h2 className="mt-1 text-lg font-bold text-gray-800">
                {detail.subject || detail.fileName}
              </h2>
              <p className="mt-0.5 text-sm text-[#FF9F66]">
                {detail.classNameRaw || '학급 미지정'}
                {detail.teacherName ? ` · ${detail.teacherName}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* 본문 (스크롤) */}
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* 시간대별 활동 */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                시간대별 활동 ({detail.sections.length})
              </h3>
              <div className="space-y-1">
                {detail.sections.map((section) => (
                  <details
                    key={section.id}
                    className="group rounded-xl border border-gray-100 px-3 py-2"
                  >
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-gray-700">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_COLOR[section.category]}`}
                      />
                      <span className="flex-1 font-medium">{section.label}</span>
                      <span className="text-gray-300 transition-transform group-open:rotate-90">
                        ›
                      </span>
                    </summary>
                    {section.content && (
                      <p className="mt-2 whitespace-pre-wrap pl-4 text-sm text-gray-500">
                        {section.content}
                      </p>
                    )}
                  </details>
                ))}
              </div>
            </section>

            {/* 몬테소리 활동 */}
            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">
                몬테소리 ({detail.montessoriRecords.length}명)
              </h3>
              <ul className="space-y-1.5">
                {detail.montessoriRecords.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-baseline gap-2 rounded-xl bg-orange-50/50 px-3 py-2 text-sm"
                  >
                    <span className="font-semibold text-gray-700">{record.childNameRaw}</span>
                    <span className="text-gray-500">
                      {[record.area, record.material].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 하단: 상세 보기 */}
          <div className="border-t border-gray-100 p-4">
            <button
              type="button"
              onClick={() => navigate(`/activity-plans/${detail.id}`)}
              className="w-full rounded-xl bg-[#FF9F66] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52]"
            >
              상세 보기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
