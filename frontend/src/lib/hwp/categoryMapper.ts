import type { SectionCategory } from './types';

// pyhwp _CATEGORY_RULES 에서 직접 이식 (hwp-parser/parser/activity_plan.py)
const CATEGORY_RULES: [string[], SectionCategory][] = [
  [['등원', '출석'], 'MORNING'],
  [['나침반', '안전교육', '안전', '화재대피'], 'SAFETY'],
  [['점심', '식사', '급식'], 'LUNCH'],
  [['바깥놀이', '운동장'], 'OUTDOOR'],
  [['평가', '일일평가'], 'EVALUATION'],
];

export function mapCategory(label: string): SectionCategory {
  const key = label.replace(/\s+/g, '');
  for (const [keywords, category] of CATEGORY_RULES) {
    for (const kw of keywords) {
      if (key.includes(kw)) return category;
    }
  }
  return 'OTHER';
}
