// 꿈열매유치원 양식 전용 — rhwp/core 기반 활동계획안 파싱
// HwpDocument → ParsedActivityPlan
// 일반화는 후속 작업 (Phase 4)

import init, { HwpDocument } from '@rhwp/core';
import { loadTable } from './tableFinder';
import { parseMeta, extractTeacherFromRenderTree } from './parsers/metaParser';
import { parseSections } from './parsers/sectionsParser';
import { parseMontessori } from './parsers/montessoriParser';
import type { ParsedActivityPlan } from './types';

// 꿈열매유치원 양식 고정 위치
const MAIN_TABLE = { sec: 0, para: 1, ctrl: 0 } as const;

// ── WASM 텍스트 폭 측정 콜백 (rhwp/core 필수, 중복 등록 무해) ─────────────
function ensureMeasureCallback(): void {
  if (typeof (globalThis as Record<string, unknown>)['measureTextWidth'] === 'function') return;
  let ctx: CanvasRenderingContext2D | null = null;
  let lastFont = '';
  (globalThis as Record<string, unknown>)['measureTextWidth'] = (font: string, text: string): number => {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return text.length * 10;
    if (font !== lastFont) { ctx.font = font; lastFont = font; }
    return ctx.measureText(text).width;
  };
}

// WASM 초기화 + 파싱 원스텝 헬퍼 (호출자가 init/free를 직접 다룰 필요 없음)
export async function parseHwpFile(bytes: Uint8Array): Promise<ParsedActivityPlan> {
  ensureMeasureCallback();
  await init();
  const doc = new HwpDocument(bytes);
  try {
    return extractActivityPlan(doc);
  } finally {
    doc.free();
  }
}

export function extractActivityPlan(doc: HwpDocument): ParsedActivityPlan {
  const mainTable = loadTable(doc, MAIN_TABLE.sec, MAIN_TABLE.para, MAIN_TABLE.ctrl);

  const meta = parseMeta(mainTable);
  // 결제란 교사명: 표 셀에 없음 → 렌더 트리 TextRun 폴백
  if (!meta.teacherName) {
    meta.teacherName = extractTeacherFromRenderTree(doc);
  }
  const sections = parseSections(mainTable);
  const montessoriRecords = parseMontessori(doc);

  // rawJson: 파싱 원본 디버깅용 (셀 텍스트 요약)
  const rawJson = JSON.stringify({
    tableInfo: {
      rowCount: mainTable.rowCount,
      colCount: mainTable.colCount,
      cellCount: mainTable.cellCount,
    },
    cells: mainTable.cells.map(c => ({
      ci: c.ci,
      row: c.row,
      col: c.col,
      colSpan: c.colSpan,
      text: c.text.slice(0, 80),
    })),
  });

  return {
    ...meta,
    sections,
    montessoriRecords,
    rawJson,
  };
}
