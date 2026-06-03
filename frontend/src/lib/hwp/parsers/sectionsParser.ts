// 꿈열매유치원 양식 전용 — 시간대별 활동 추출
// 외부 표 row 2 = 헤더(활동계획/활동내용) → 건너뜀
// 외부 표 rows 3-13 = 활동 섹션 (label col=0, content col=1)

import type { TableData } from '../tableFinder';
import { mapCategory } from '../categoryMapper';
import type { ParsedSection } from '../types';

// 헤더 라벨 (공백 제거 후 매칭)
const HEADER_KEYS = new Set(['활동계획', '활동내용', '구분', '시간']);

function norm(text: string): string {
  return text.replace(/\s+/g, '');
}

function normContent(text: string): string {
  return text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

export function parseSections(table: TableData): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let orderIndex = 0;

  // rows 0-2는 메타/헤더 → 건너뜀
  // rows 3+를 row 번호 순으로 처리
  const dataRows = new Map<number, typeof table.cells>();
  for (const cell of table.cells) {
    if (cell.row <= 2) continue;
    const bucket = dataRows.get(cell.row) ?? [];
    bucket.push(cell);
    dataRows.set(cell.row, bucket);
  }

  for (const rowNum of [...dataRows.keys()].sort((a, b) => a - b)) {
    const rowCells = dataRows.get(rowNum)!.sort((a, b) => a.col - b.col);

    const labelCell = rowCells[0]; // col=0
    if (!labelCell) continue;

    const labelKey = norm(labelCell.text);
    if (!labelKey) continue;
    if (HEADER_KEYS.has(labelKey)) continue;

    // content: col=1 셀 (row 6은 col=1~3, row 3 등은 col=1~8, 모두 col=1 시작)
    const contentCell = rowCells.find(c => c.col === 1);
    const content = contentCell ? normContent(contentCell.text) : '';

    sections.push({
      orderIndex: orderIndex++,
      label: labelCell.text.replace(/\s+/g, ' ').trim(),
      content,
      category: mapCategory(labelCell.text),
    });
  }

  return sections;
}
