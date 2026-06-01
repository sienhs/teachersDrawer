import { useState } from 'react';
import type { ActivitySection, SectionCategory } from '../../types/activityPlan';

const CATEGORY_COLOR: Record<SectionCategory, string> = {
  MORNING: 'bg-orange-200',
  SAFETY: 'bg-red-200',
  LUNCH: 'bg-yellow-200',
  OUTDOOR: 'bg-green-200',
  EVALUATION: 'bg-purple-200',
  OTHER: 'bg-gray-200',
};

interface Props {
  section: ActivitySection;
  initialOpen?: boolean;
}

// 시간대별 활동 카드. 접힘/펼침 토글.
export default function SectionCard({ section, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span
          className={`h-3 w-3 shrink-0 rounded-full ${CATEGORY_COLOR[section.category]}`}
        />
        <span className="flex-1 text-sm font-medium text-gray-800">{section.label}</span>
        <span
          className={`text-gray-400 transition-transform duration-200 text-xs ${open ? 'rotate-90' : ''}`}
        >
          ›
        </span>
      </button>
      {open && section.content && (
        <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3">
          <p
            className="whitespace-pre-wrap text-sm text-gray-600"
            style={{ wordBreak: 'keep-all' }}
          >
            {section.content}
          </p>
        </div>
      )}
    </div>
  );
}
