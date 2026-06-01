import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { ActivityPlanSummary } from '../../types/activityPlan';

interface Props {
  plan: ActivityPlanSummary;
  onClick: () => void;
}

function formatDate(planDate: string): string {
  try {
    return format(parseISO(planDate), 'yyyy년 M월 d일 (EEE)', { locale: ko });
  } catch {
    return planDate;
  }
}

// 활동계획안 목록 카드. 호버 시 살짝 떠오름.
export default function ActivityPlanCard({ plan, onClick }: Props) {
  const meta = [plan.classNameRaw, plan.teacherName].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-2 rounded-2xl bg-white p-5 text-left shadow-sm shadow-orange-50 transition-all hover:-translate-y-1 hover:shadow-md hover:shadow-orange-100"
    >
      <p className="text-xs font-medium text-[#FF9F66]">{formatDate(plan.planDate)}</p>
      <h3 className="text-base font-bold text-gray-800 group-hover:text-[#FF9F66]">
        {plan.subject || '주제 미입력'}
      </h3>
      {meta && <p className="text-sm text-gray-500">{meta}</p>}
      <p className="text-xs text-gray-400 truncate">{plan.fileName}</p>
    </button>
  );
}
