// 꿈열매유치원 양식 전용 — 몬테소리 학생 기록 추출
// Step 3-E-2-b-1 발견: 외부 표 cellIdx=20 (row=6, col=4~8) 에 중첩 표 존재
// pathJson 형식: 2-레벨 [{"controlIndex":N,"cellIndex":N,"cellParaIndex":N}, ...]

import type { HwpDocument } from '@rhwp/core';
import type { ParsedMontessoriRecord } from '../types';

const OUTER_SEC = 0;
const OUTER_PARA = 1;
const MONTESSORI_CELL_IDX = 20;  // row=6, col=4, colSpan=5
const MONTESSORI_CELL_PARA = 0;
const INNER_CTRL = 0;
const INNER_COLS = 4; // 이름/영역/교구명/확인

function makePath(innerCellIdx: number, innerCellPara: number): string {
  return JSON.stringify([
    { controlIndex: 0, cellIndex: MONTESSORI_CELL_IDX, cellParaIndex: MONTESSORI_CELL_PARA },
    { controlIndex: INNER_CTRL, cellIndex: innerCellIdx, cellParaIndex: innerCellPara },
  ]);
}

function getInnerCellText(doc: HwpDocument, innerCellIdx: number): string {
  // 문단 수 먼저 확인
  let paraCount = 1;
  try {
    paraCount = doc.getCellParagraphCountByPath(OUTER_SEC, OUTER_PARA, makePath(innerCellIdx, 0));
  } catch {
    /* 기본 1 */
  }

  const parts: string[] = [];
  for (let cp = 0; cp < paraCount; cp++) {
    const path = makePath(innerCellIdx, cp);
    try {
      const len = doc.getCellParagraphLengthByPath(OUTER_SEC, OUTER_PARA, path);
      if (len > 0) {
        parts.push(doc.getTextInCellByPath(OUTER_SEC, OUTER_PARA, path, 0, len));
      }
    } catch {
      /* 빈 문단 */
    }
  }
  return parts.join('\n').trim();
}

export function parseMontessori(doc: HwpDocument): ParsedMontessoriRecord[] {
  const dimPath = JSON.stringify([
    { controlIndex: 0, cellIndex: MONTESSORI_CELL_IDX, cellParaIndex: MONTESSORI_CELL_PARA },
    { controlIndex: INNER_CTRL, cellIndex: 0, cellParaIndex: 0 },
  ]);

  let dims: { rowCount: number; colCount: number; cellCount: number };
  try {
    dims = JSON.parse(doc.getTableDimensionsByPath(OUTER_SEC, OUTER_PARA, dimPath));
  } catch (e) {
    throw new Error(`몬테소리 중첩 표 접근 실패: ${e}`);
  }

  const records: ParsedMontessoriRecord[] = [];

  // row 0 = 헤더(이름/영역/교구명/확인) → 건너뜀
  // rows 1-17 = 학생 데이터 (cell 인덱스: row*INNER_COLS + col)
  for (let row = 1; row < dims.rowCount; row++) {
    const base = row * INNER_COLS;
    const childNameRaw = getInnerCellText(doc, base + 0);
    const area = getInnerCellText(doc, base + 1);
    const material = getInnerCellText(doc, base + 2);
    const confirmed = getInnerCellText(doc, base + 3);

    if (childNameRaw) {
      records.push({
        childNameRaw,
        area: area || null,
        material: material || null,
        confirmed: confirmed || null,
      });
    }
  }

  return records;
}
