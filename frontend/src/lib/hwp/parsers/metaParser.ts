// 꿈열매유치원 양식 전용 — 메타정보 추출
// 외부 표 row 0: 일시/학급명/수업시간/수업일수
// 외부 표 row 1: 주제
// 결제란 영역: rhwp/core의 14×9 표 안에 별도 셀 없음 → 렌더 트리 TextRun 폴백

import type { HwpDocument } from '@rhwp/core';
import type { TableData } from '../tableFinder';

function norm(text: string): string {
  return text.replace(/\s+/g, '');
}

function normLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function parseDate(raw: string): string {
  const key = norm(raw);
  // 숫자 구분자: 2026.05.08 / 2026-05-08 / 2026/05/08
  let m = key.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // 한글 형식: 2026년5월8일(월요일)
  m = key.match(/(\d{4})년(\d{1,2})월(\d{1,2})일/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return raw.trim();
}

function parseDayCount(text: string): number {
  const m = text.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

const META_LABELS = [
  { key: '일시', field: 'planDate' },
  { key: '학급명', field: 'classNameRaw' },
  { key: '수업시간', field: 'classTimeRaw' },
  { key: '수업일수', field: 'classDayCount' },
] as const;

export interface MetaResult {
  planDate: string;
  subject: string;
  teacherName: string;
  classNameRaw: string;
  classTimeRaw: string;
  classDayCount: number;
}

const TITLE_LABELS = new Set(['담당', '원감', '원장']);

// 렌더 트리 TextRun 목록에서 "담당" 다음 텍스트를 교사명으로 추출
// 결제란이 rhwp/core 표 셀에 없고 글상자로 존재하는 양식 대응
export function extractTeacherFromRenderTree(doc: HwpDocument): string {
  try {
    const tree = JSON.parse(doc.getPageRenderTree(0));
    const runs: string[] = [];

    function collect(node: unknown): void {
      if (!node || typeof node !== 'object') return;
      const n = node as Record<string, unknown>;
      if (n.type === 'TextRun' && typeof n.text === 'string' && (n.text as string).trim()) {
        runs.push(n.text as string);
      }
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(collect);
        else if (typeof v === 'object') collect(v);
      }
    }

    collect(tree);

    for (let i = 0; i < runs.length; i++) {
      if (!norm(runs[i]).includes('담당')) continue;
      for (let j = i + 1; j < runs.length; j++) {
        const candidate = normLabel(runs[j]);
        if (candidate && !TITLE_LABELS.has(norm(candidate))) {
          return candidate;
        }
      }
    }
  } catch {
    /* 폴백 실패 → 빈 문자열 반환 */
  }
  return '';
}

export function parseMeta(table: TableData): MetaResult {
  const meta: MetaResult = {
    planDate: '',
    subject: '',
    teacherName: '',
    classNameRaw: '',
    classTimeRaw: '',
    classDayCount: 0,
  };

  // Row 0 셀을 col 순으로 정렬 → 라벨/값 쌍으로 스캔
  const row0 = table.cells.filter(c => c.row === 0).sort((a, b) => a.col - b.col);
  for (let i = 0; i < row0.length; i++) {
    const cellKey = norm(row0[i].text);
    const found = META_LABELS.find(ml => cellKey.includes(ml.key));
    if (found && i + 1 < row0.length) {
      const raw = row0[i + 1].text.trim();
      if (found.field === 'planDate') {
        meta.planDate = parseDate(raw);
      } else if (found.field === 'classDayCount') {
        meta.classDayCount = parseDayCount(raw);
      } else {
        (meta as unknown as Record<string, unknown>)[found.field] = normLabel(raw);
      }
      i++;
    }
  }

  // Row 1: 주제
  const row1 = table.cells.filter(c => c.row === 1).sort((a, b) => a.col - b.col);
  if (row1.length >= 2 && norm(row1[0].text).includes('주제')) {
    meta.subject = normLabel(row1[1].text);
  }

  // 담임 교사명: rhwp/core 14×9 표 안에 결제란 전용 셀 없음
  // → extractor.ts에서 extractTeacherFromRenderTree() 폴백으로 채움

  return meta;
}
