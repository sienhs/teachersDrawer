/**
 * /_rhwp-core-test — @rhwp/core 저수준 WASM API 탐색 페이지
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEffect, useRef, useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';
import { extractActivityPlan } from '../../lib/hwp/extractor';
import type { ParsedActivityPlan } from '../../lib/hwp/types';

// ── WASM 초기화 전 필수: 텍스트 폭 측정 콜백 등록 ───────────────────────
let _ctx: CanvasRenderingContext2D | null = null;
let _lastFont = '';
(globalThis as Record<string, unknown>)['measureTextWidth'] = (
  font: string,
  text: string,
): number => {
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    _ctx = canvas.getContext('2d');
  }
  if (!_ctx) return text.length * 10;
  if (font !== _lastFont) {
    _ctx.font = font;
    _lastFont = font;
  }
  return _ctx.measureText(text).width;
};

// ── 표 탐색 결과 타입 ────────────────────────────────────────────────────
interface TableInfo {
  sec: number;
  para: number;
  ctrl: number;
  rowCount: number;
  colCount: number;
  cellCount: number;
  cells: CellInfo[];
}

interface CellInfo {
  cellIdx: number;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  text: string;
}

interface NestedTableInfo {
  parentSec: number;
  parentPara: number;
  parentCtrl: number;
  parentCell: number;
  rowCount: number;
  colCount: number;
  cells: CellInfo[];
}

// ── pathJson 테스트 타입 (Step 3-E-2-b-1) ────────────────────────────────
interface PathAttempt {
  path: string;
  result?: { rowCount: number; colCount: number; cellCount: number };
  error?: string;
  success: boolean; // outer table(14×9)와 다른 결과
}

interface PathJsonTestResult {
  outerDims: { rowCount: number; colCount: number; cellCount: number } | null;
  montessoriCellIdx: number;     // row=6, col=1 의 cellIdx (-1이면 미발견)
  montessoriCellInfo: unknown;
  montessoriCellParaCount: number;
  attempts: PathAttempt[];
  successPath: string | null;    // 성공한 path (있으면)
  layerTreeHint: string;         // getPageLayerTree에서 "Table" 포함 여부 요약
}

interface ExplorationResult {
  wasmInitMs: number;
  docLoadMs: number;
  docInfo: unknown;
  pageCount: number;
  sectionCount: number;
  pageTrees: Record<number, unknown>;
  pageLayers: Record<number, unknown>;
  pageHtmls: Record<number, string>;
  pageTextLayouts: Record<number, unknown>;
  tables: TableInfo[];
  nestedTables: NestedTableInfo[];
  pathJsonTest: PathJsonTestResult | null;
  parsed: ParsedActivityPlan | null;
  parseError: string | null;
  errors: string[];
}

// ── HWP 문서 분석 ────────────────────────────────────────────────────────
async function exploreDocument(bytes: Uint8Array): Promise<ExplorationResult> {
  const errors: string[] = [];
  const t0 = performance.now();

  let wasmInitMs = 0;
  let docLoadMs = 0;

  // WASM 초기화
  const initStart = performance.now();
  await init();
  wasmInitMs = performance.now() - initStart;

  // 문서 로드
  const loadStart = performance.now();
  const doc = new HwpDocument(bytes);
  docLoadMs = performance.now() - loadStart;

  const result: ExplorationResult = {
    wasmInitMs,
    docLoadMs,
    docInfo: null,
    pageCount: 0,
    sectionCount: 0,
    pageTrees: {},
    pageLayers: {},
    pageHtmls: {},
    pageTextLayouts: {},
    tables: [],
    nestedTables: [],
    pathJsonTest: null,
    parsed: null,
    parseError: null,
    errors,
  };

  try { result.docInfo = JSON.parse(doc.getDocumentInfo()); } catch (e) { errors.push(`getDocumentInfo: ${e}`); }
  try { result.pageCount = doc.pageCount(); } catch (e) { errors.push(`pageCount: ${e}`); }
  try { result.sectionCount = doc.getSectionCount(); } catch (e) { errors.push(`getSectionCount: ${e}`); }

  // 페이지별 렌더 트리/레이어/HTML/텍스트 레이아웃
  for (let p = 0; p < Math.min(result.pageCount, 3); p++) {
    try { result.pageTrees[p] = JSON.parse(doc.getPageRenderTree(p)); } catch (e) { errors.push(`getPageRenderTree(${p}): ${e}`); }
    try { result.pageLayers[p] = JSON.parse(doc.getPageLayerTree(p)); } catch (e) { errors.push(`getPageLayerTree(${p}): ${e}`); }
    try { result.pageHtmls[p] = doc.renderPageHtml(p); } catch (e) { errors.push(`renderPageHtml(${p}): ${e}`); }
    try { result.pageTextLayouts[p] = JSON.parse(doc.getPageTextLayout(p)); } catch (e) { errors.push(`getPageTextLayout(${p}): ${e}`); }
  }

  // 표 탐색: 모든 (sec, para, ctrl) 순회
  const secCount = result.sectionCount || 1;
  for (let sec = 0; sec < secCount; sec++) {
    let paraCount = 0;
    try { paraCount = doc.getParagraphCount(sec); } catch (e) { errors.push(`getParagraphCount(${sec}): ${e}`); continue; }

    for (let para = 0; para < paraCount; para++) {
      // 컨트롤 탐색: ctrl 0~9 시도
      for (let ctrl = 0; ctrl < 10; ctrl++) {
        let dims: { rowCount: number; colCount: number; cellCount: number } | null = null;
        try {
          dims = JSON.parse(doc.getTableDimensions(sec, para, ctrl));
        } catch {
          break; // 이 ctrl 이상은 없음
        }

        if (!dims || dims.rowCount === 0) continue;

        const cells: CellInfo[] = [];
        const nestedTables: NestedTableInfo[] = [];

        for (let cellIdx = 0; cellIdx < dims.cellCount; cellIdx++) {
          let row = 0, col = 0, rowSpan = 1, colSpan = 1;
          try {
            const info = JSON.parse(doc.getCellInfo(sec, para, ctrl, cellIdx));
            row = info.row;
            col = info.col;
            rowSpan = info.rowSpan ?? 1;
            colSpan = info.colSpan ?? 1;
          } catch (e) { errors.push(`getCellInfo(${sec},${para},${ctrl},${cellIdx}): ${e}`); }

          // 셀 텍스트 추출 (문단 수 먼저 확인)
          let text = '';
          try {
            const cellParaCount = doc.getCellParagraphCount(sec, para, ctrl, cellIdx);
            const parts: string[] = [];
            for (let cp = 0; cp < cellParaCount; cp++) {
              try {
                const len = doc.getCellParagraphLength(sec, para, ctrl, cellIdx, cp);
                if (len > 0) {
                  const t = doc.getTextInCell(sec, para, ctrl, cellIdx, cp, 0, len);
                  parts.push(t);
                }
              } catch { /* 빈 문단 */ }
            }
            text = parts.join('\n');
          } catch (e) { errors.push(`getText cell(${sec},${para},${ctrl},${cellIdx}): ${e}`); }

          cells.push({ cellIdx, row, col, rowSpan, colSpan, text });

          // 중첩 표 탐색: 셀 내부 컨트롤에서 표 찾기
          try {
            const cellParaCount = doc.getCellParagraphCount(sec, para, ctrl, cellIdx);
            for (let cp = 0; cp < cellParaCount; cp++) {
              for (let innerCtrl = 0; innerCtrl < 5; innerCtrl++) {
                try {
                  const pathJson = JSON.stringify([{ controlIndex: ctrl, cellIndex: cellIdx, cellParaIndex: cp }]);
                  const innerDims = JSON.parse(doc.getTableDimensionsByPath(sec, para, pathJson));
                  if (innerDims && innerDims.rowCount > 0) {
                    const innerCells: CellInfo[] = [];
                    for (let ic = 0; ic < innerDims.cellCount; ic++) {
                      try {
                        const iInfo = JSON.parse(doc.getCellInfoByPath(sec, para, pathJson));
                        let iText = '';
                        try {
                          const iLen = doc.getCellParagraphLengthByPath(sec, para, pathJson);
                          if (iLen > 0) iText = doc.getTextInCellByPath(sec, para, pathJson, 0, iLen);
                        } catch { /* */ }
                        innerCells.push({ cellIdx: ic, row: iInfo.row ?? 0, col: iInfo.col ?? 0, rowSpan: 1, colSpan: 1, text: iText });
                      } catch { /* */ }
                    }
                    nestedTables.push({ parentSec: sec, parentPara: para, parentCtrl: ctrl, parentCell: cellIdx, ...innerDims, cells: innerCells });
                    break;
                  }
                } catch { break; }
              }
            }
          } catch { /* 중첩 표 탐색 실패 */ }
        }

        result.tables.push({ sec, para, ctrl, ...dims, cells });
        result.nestedTables.push(...nestedTables);
      }
    }
  }

  // ── pathJson 형식 발견 테스트 (Step 3-E-2-b-1) ─────────────────────────
  // 발견된 결론 (2026-06-03):
  //   - 몬테소리 학생 기록 표: cellIdx=20 (row=6, col=4, colSpan=5) 안에 존재
  //   - 2-레벨 path 필요: [{ctrl:0, cell:20, para:0}, {ctrl:0, cell:X, para:0}]
  //   - 형식 출처: getCursorRectByPath 주석
  //     [{"controlIndex":N,"cellIndex":N,"cellParaIndex":N}, ...]
  // 외부 표: sec=0, para=1, ctrl=0 (14×9, 35셀)
  try {
    const pTest: PathJsonTestResult = {
      outerDims: null,
      montessoriCellIdx: -1,
      montessoriCellInfo: null,
      montessoriCellParaCount: 0,
      attempts: [],
      successPath: null,
      layerTreeHint: '',
    };

    // 외부 표 차원 (비교 기준)
    try {
      pTest.outerDims = JSON.parse(doc.getTableDimensions(0, 1, 0));
    } catch (e) { errors.push(`outerDims: ${e}`); }

    // 몬테소리 셀 위치 찾기 (row=6, col=1)
    if (pTest.outerDims) {
      for (let ci = 0; ci < pTest.outerDims.cellCount; ci++) {
        try {
          const info = JSON.parse(doc.getCellInfo(0, 1, 0, ci));
          if (info.row === 6 && info.col === 1) {
            pTest.montessoriCellIdx = ci;
            pTest.montessoriCellInfo = info;
            break;
          }
        } catch { /* skip */ }
      }
    }

    if (pTest.montessoriCellIdx >= 0) {
      try {
        pTest.montessoriCellParaCount = doc.getCellParagraphCount(0, 1, 0, pTest.montessoriCellIdx);
      } catch { /* */ }

      const outerRowCount = pTest.outerDims?.rowCount ?? 14;
      const outerColCount = pTest.outerDims?.colCount ?? 9;
      const cellIdx = pTest.montessoriCellIdx;

      // --- 가설 1: [{"controlIndex":C, "cellIndex":X, "cellParaIndex":Y}] ---
      // getCursorRectByPath 주석에서 확인한 공식 형식
      for (let ci = 0; ci <= 3; ci++) {
        for (let cp = 0; cp < Math.max(pTest.montessoriCellParaCount, 4); cp++) {
          const path = JSON.stringify([{ controlIndex: ci, cellIndex: cellIdx, cellParaIndex: cp }]);
          try {
            const dims: { rowCount: number; colCount: number; cellCount: number } = JSON.parse(
              doc.getTableDimensionsByPath(0, 1, path)
            );
            const success = dims.rowCount > 0 &&
              (dims.rowCount !== outerRowCount || dims.colCount !== outerColCount);
            pTest.attempts.push({ path, result: dims, success });
            if (success && !pTest.successPath) pTest.successPath = path;
          } catch (e) {
            pTest.attempts.push({ path, error: String(e), success: false });
          }
        }
      }

      // --- 가설 2: 두 레벨 path (outer ctrl 명시 + inner navigation) ---
      for (let outerCtrl = 0; outerCtrl <= 1; outerCtrl++) {
        for (let innerCtrl = 0; innerCtrl <= 2; innerCtrl++) {
          for (let cp = 0; cp < Math.max(pTest.montessoriCellParaCount, 3); cp++) {
            const path = JSON.stringify([
              { controlIndex: outerCtrl, cellIndex: cellIdx, cellParaIndex: cp },
              { controlIndex: innerCtrl, cellIndex: 0, cellParaIndex: 0 },
            ]);
            try {
              const dims: { rowCount: number; colCount: number; cellCount: number } = JSON.parse(
                doc.getTableDimensionsByPath(0, 1, path)
              );
              const success = dims.rowCount > 0 &&
                (dims.rowCount !== outerRowCount || dims.colCount !== outerColCount);
              pTest.attempts.push({ path, result: dims, success });
              if (success && !pTest.successPath) pTest.successPath = path;
            } catch (e) {
              pTest.attempts.push({ path, error: String(e), success: false });
            }
          }
        }
      }

      // --- 가설 3: 다른 필드명 시도 ---
      const altFormats = [
        JSON.stringify([{ ctrl: 0, cell: cellIdx, para: 0 }]),
        JSON.stringify({ controlIndex: 0, cellIndex: cellIdx, cellParaIndex: 0 }),
        JSON.stringify([cellIdx, 0, 0]),
        JSON.stringify([0, cellIdx, 0]),
        String(cellIdx),
        JSON.stringify({ path: [{ ctrl: 0, cell: cellIdx, para: 0 }] }),
      ];
      for (const path of altFormats) {
        try {
          const dims: { rowCount: number; colCount: number; cellCount: number } = JSON.parse(
            doc.getTableDimensionsByPath(0, 1, path)
          );
          const success = dims.rowCount > 0 &&
            (dims.rowCount !== outerRowCount || dims.colCount !== outerColCount);
          pTest.attempts.push({ path, result: dims, success });
          if (success && !pTest.successPath) pTest.successPath = path;
        } catch (e) {
          pTest.attempts.push({ path, error: String(e), success: false });
        }
      }

      // --- 보조: getTableCellBboxesByPath 시도 (path 형식 동일 가정) ---
      try {
        const path1 = JSON.stringify([{ controlIndex: 0, cellIndex: cellIdx, cellParaIndex: 0 }]);
        const bboxResult = doc.getTableCellBboxesByPath(0, 1, path1);
        const bboxParsed = JSON.parse(bboxResult);
        if (Array.isArray(bboxParsed) && bboxParsed.length > 0) {
          pTest.attempts.push({
            path: `[bboxByPath] ${path1}`,
            result: { rowCount: bboxParsed.length, colCount: 0, cellCount: bboxParsed.length },
            success: bboxParsed.length !== outerRowCount * outerColCount,
          });
        }
      } catch { /* */ }
    }

    // ── 검증된 경로로 직접 테스트 (2026-06-03 발견) ──────────────────────
    // cellIdx=20 (row=6, col=4, colSpan=5) 에 중첩 표 존재
    try {
      const verifiedPath = JSON.stringify([
        { controlIndex: 0, cellIndex: 20, cellParaIndex: 0 },
        { controlIndex: 0, cellIndex: 0, cellParaIndex: 0 },
      ]);
      const innerDims: { rowCount: number; colCount: number; cellCount: number } = JSON.parse(
        doc.getTableDimensionsByPath(0, 1, verifiedPath)
      );
      const isSuccess = innerDims.rowCount !== (pTest.outerDims?.rowCount ?? 14) ||
                        innerDims.colCount !== (pTest.outerDims?.colCount ?? 9);
      pTest.attempts.unshift({
        path: `[VERIFIED] ${verifiedPath}`,
        result: innerDims,
        success: isSuccess,
      });
      if (isSuccess && !pTest.successPath) pTest.successPath = verifiedPath;
    } catch (e) {
      pTest.attempts.unshift({ path: '[VERIFIED] 2-level path cellIdx=20', error: String(e), success: false });
    }

    // LayerTree 힌트: page 0 레이어 트리에서 중첩 표 관련 키워드 탐색
    try {
      const layerRaw = doc.getPageLayerTree(0);
      const nestedCount = (layerRaw.match(/"type"\s*:\s*"Table"/g) ?? []).length;
      const cellCount = (layerRaw.match(/"type"\s*:\s*"Cell"/g) ?? []).length;
      pTest.layerTreeHint = `LayerTree: Table 노드 ${nestedCount}개, Cell 노드 ${cellCount}개 (총 ${layerRaw.length}자)`;
    } catch (e) {
      pTest.layerTreeHint = `LayerTree 오류: ${e}`;
    }

    result.pathJsonTest = pTest;
  } catch (e) {
    errors.push(`pathJsonTest 전체 오류: ${e}`);
  }

  // ── 양식 파싱 (Step 3-E-2-b-2) ──────────────────────────────────────────
  try {
    const t1 = performance.now();
    result.parsed = extractActivityPlan(doc);
    console.log(`파싱 완료 (${Math.round(performance.now() - t1)}ms)`, result.parsed);
  } catch (e) {
    result.parseError = String(e);
    errors.push(`extractActivityPlan: ${e}`);
  }

  doc.free();
  console.log(`탐색 완료 (총 ${Math.round(performance.now() - t0)}ms)`, result);
  return result;
}

// ── 그리드 렌더 ─────────────────────────────────────────────────────────
function TableGrid({ table }: { table: TableInfo }) {
  if (table.cells.length === 0) return <p className="text-xs text-gray-400">셀 없음</p>;

  const maxRow = Math.max(...table.cells.map((c) => c.row)) + 1;
  const maxCol = Math.max(...table.cells.map((c) => c.col)) + 1;

  const grid: (CellInfo | null)[][] = Array.from({ length: maxRow }, () => Array(maxCol).fill(null));
  for (const cell of table.cells) {
    if (cell.row < maxRow && cell.col < maxCol) {
      grid[cell.row][cell.col] = cell;
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[11px]">
        <tbody>
          {grid.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) =>
                cell ? (
                  <td
                    key={ci}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                    className="border border-gray-300 px-1.5 py-1 align-top max-w-[200px]"
                    title={`cellIdx=${cell.cellIdx} row=${cell.row} col=${cell.col}`}
                  >
                    <span className="text-gray-400 mr-1">[{cell.row},{cell.col}]</span>
                    <span className="whitespace-pre-wrap break-words">{cell.text || <em className="text-gray-300">빈 셀</em>}</span>
                  </td>
                ) : (
                  <td key={ci} className="border border-gray-100 bg-gray-50 px-1 py-0.5 text-gray-300 text-[9px]">
                    병합
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── JSON 섹션 ──────────────────────────────────────────────────────────
function JsonSection({ title, data, maxLen = 8000 }: { title: string; data: unknown; maxLen?: number }) {
  const raw = JSON.stringify(data, null, 2);
  const truncated = raw.length > maxLen;
  const text = truncated ? raw.slice(0, maxLen) + '\n... (잘림)' : raw;

  return (
    <details className="mb-2">
      <summary className="cursor-pointer select-none rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
        {title}
        <span className="ml-2 text-gray-400 font-normal">{raw.length.toLocaleString()}자</span>
      </summary>
      <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-3 text-[10px] text-gray-700 leading-relaxed border border-gray-200">
        {text}
      </pre>
    </details>
  );
}

// ── 쓰기 API 테스트 타입 (Step 4-A-1) ────────────────────────────────────
interface WriteStep {
  name: string;
  result: string;
  ok: boolean;
}

interface WriteTestResult {
  steps: WriteStep[];
  errors: string[];
  exportedBytes: Uint8Array | null;
  verifyPageCount: number | null;
  verifyHtml: string | null;
  elapsedMs: number;
}

async function runWriteApiTest(): Promise<WriteTestResult> {
  await init();
  const t0 = performance.now();
  const steps: WriteStep[] = [];
  const errors: string[] = [];
  let exportedBytes: Uint8Array | null = null;
  let verifyPageCount: number | null = null;
  let verifyHtml: string | null = null;

  // 1. 빈 문서 생성
  const doc = HwpDocument.createEmpty();
  try {
    const r = doc.createBlankDocument();
    steps.push({ name: 'createBlankDocument()', result: r, ok: true });
  } catch (e) {
    steps.push({ name: 'createBlankDocument()', result: String(e), ok: false });
    errors.push(`createBlankDocument: ${e}`);
  }

  // 2. 본문 첫 문단에 텍스트 삽입
  try {
    const r = doc.insertText(0, 0, 0, '안녕하세요, rhwp/core 쓰기 API 테스트입니다.');
    steps.push({ name: 'insertText(0, 0, 0, "안녕하세요...")', result: r, ok: true });
  } catch (e) {
    steps.push({ name: 'insertText', result: String(e), ok: false });
    errors.push(`insertText: ${e}`);
  }

  // 3. 문단 분할 (표를 삽입할 두 번째 문단 생성)
  try {
    const len = doc.getParagraphLength(0, 0);
    const r = doc.splitParagraph(0, 0, len);
    steps.push({ name: `splitParagraph(0, 0, ${len})`, result: r, ok: true });
  } catch (e) {
    steps.push({ name: 'splitParagraph', result: String(e), ok: false });
    errors.push(`splitParagraph: ${e}`);
  }

  // 4. 3행 2열 표 생성
  let tableParaIdx = 1;
  let tableCtrlIdx = 0;
  try {
    const r = doc.createTable(0, 1, 0, 3, 2);
    const parsed = JSON.parse(r);
    tableParaIdx = parsed.paraIdx ?? 1;
    tableCtrlIdx = parsed.controlIdx ?? 0;
    steps.push({ name: 'createTable(0, 1, 0, rows=3, cols=2)', result: r, ok: true });
  } catch (e) {
    steps.push({ name: 'createTable', result: String(e), ok: false });
    errors.push(`createTable: ${e}`);
  }

  // 5. 표 셀에 텍스트 삽입 (6셀)
  const cellTexts = ['이름', '나이', '김철수', '7세', '이영희', '6세'];
  for (let i = 0; i < cellTexts.length; i++) {
    try {
      const r = doc.insertTextInCell(0, tableParaIdx, tableCtrlIdx, i, 0, 0, cellTexts[i]);
      steps.push({ name: `insertTextInCell(cell=${i}, "${cellTexts[i]}")`, result: r, ok: true });
    } catch (e) {
      steps.push({ name: `insertTextInCell(cell=${i})`, result: String(e), ok: false });
      errors.push(`insertTextInCell[${i}]: ${e}`);
    }
  }

  // 6. HWP export
  try {
    exportedBytes = doc.exportHwp();
    steps.push({ name: 'exportHwp()', result: `${exportedBytes.length.toLocaleString()} bytes`, ok: true });
  } catch (e) {
    steps.push({ name: 'exportHwp()', result: String(e), ok: false });
    errors.push(`exportHwp: ${e}`);
  }

  // 7. 자기 재로드 검증 (export된 bytes를 다시 로드)
  if (exportedBytes) {
    try {
      const verifyDoc = new HwpDocument(exportedBytes);
      verifyPageCount = verifyDoc.pageCount();
      try { verifyHtml = verifyDoc.renderPageHtml(0); } catch { /* pass */ }
      steps.push({ name: 'exportHwp() 재로드 검증', result: `pageCount=${verifyPageCount} ✅`, ok: true });
      verifyDoc.free();
    } catch (e) {
      steps.push({ name: 'exportHwp() 재로드 검증', result: String(e), ok: false });
      errors.push(`재로드 검증: ${e}`);
    }
  }

  doc.free();
  return { steps, errors, exportedBytes, verifyPageCount, verifyHtml, elapsedMs: performance.now() - t0 };
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function RhwpCoreTestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [writeStatus, setWriteStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [writeResult, setWriteResult] = useState<WriteTestResult | null>(null);
  const [writeError, setWriteError] = useState('');
  const autoLoadedRef = useRef(false);

  const runExploration = async (bytes: Uint8Array) => {
    setStatus('loading');
    setResult(null);
    setErrorMsg('');
    try {
      const r = await exploreDocument(bytes);
      setResult(r);
      setStatus('done');
    } catch (e) {
      setErrorMsg(String(e));
      setStatus('error');
    }
  };

  // 자동 로드: /hwp-samples/CASE_5_8.hwp
  useEffect(() => {
    if (autoLoadedRef.current) return;
    autoLoadedRef.current = true;
    setStatus('loading');
    fetch('/hwp-samples/CASE_5_8.hwp')
      .then((r) => {
        if (!r.ok) throw new Error(`fetch 실패: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => runExploration(new Uint8Array(buf)))
      .catch((e) => {
        setStatus('idle');
        console.warn('자동 로드 실패 (파일 직접 선택 필요):', e);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.arrayBuffer().then((buf) => runExploration(new Uint8Array(buf)));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-mono text-sm">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">@rhwp/core 탐색</h1>
          <p className="text-xs text-gray-500 mt-1">
            Phase 3 Step 3-E-2-a — WASM 저수준 API로 HWP 구조 탐색
          </p>
        </div>

        {/* 파일 선택 */}
        <div className="mb-4 flex items-center gap-3">
          <label className="rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-50">
            HWP 파일 선택
            <input type="file" accept=".hwp,.hwpx" className="hidden" onChange={handleFileChange} />
          </label>
          {status === 'loading' && <span className="text-blue-500 text-xs animate-pulse">분석 중…</span>}
          {status === 'error' && <span className="text-red-500 text-xs">{errorMsg}</span>}
        </div>

        {status === 'done' && result && (
          <>
            {/* 타이밍 */}
            <div className="mb-4 rounded-lg bg-white border border-gray-200 p-4">
              <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">초기화 타이밍</h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-500">{Math.round(result.wasmInitMs)}ms</div>
                  <div className="text-xs text-gray-400">WASM init()</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-500">{Math.round(result.docLoadMs)}ms</div>
                  <div className="text-xs text-gray-400">HwpDocument 로드</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">{result.pageCount}p / {result.sectionCount}sec</div>
                  <div className="text-xs text-gray-400">페이지 / 구역</div>
                </div>
              </div>
            </div>

            {/* 에러 로그 */}
            {result.errors.length > 0 && (
              <details className="mb-4">
                <summary className="cursor-pointer text-xs font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded">
                  에러 {result.errors.length}건
                </summary>
                <ul className="mt-1 space-y-0.5 pl-4">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-[10px] text-red-600">{e}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* 문서 정보 */}
            <div className="mb-4">
              <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">문서 정보</h2>
              <JsonSection title="getDocumentInfo()" data={result.docInfo} />
            </div>

            {/* 페이지 구조 */}
            <div className="mb-4">
              <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">페이지 구조</h2>
              {Object.entries(result.pageTrees).map(([p, tree]) => (
                <JsonSection key={p} title={`getPageRenderTree(${p})`} data={tree} maxLen={5000} />
              ))}
              {Object.entries(result.pageLayers).map(([p, layer]) => (
                <JsonSection key={p} title={`getPageLayerTree(${p})`} data={layer} maxLen={5000} />
              ))}
              {Object.entries(result.pageTextLayouts).map(([p, layout]) => (
                <JsonSection key={p} title={`getPageTextLayout(${p})`} data={layout} maxLen={5000} />
              ))}
            </div>

            {/* HTML 렌더링 */}
            <div className="mb-4">
              <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">HTML 렌더링</h2>
              {Object.entries(result.pageHtmls).map(([p, html]) => (
                <details key={p} className="mb-2">
                  <summary className="cursor-pointer select-none rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
                    renderPageHtml({p})
                    <span className="ml-2 text-gray-400 font-normal">{html.length.toLocaleString()}자</span>
                  </summary>
                  <div className="mt-1 border border-gray-200 rounded bg-white" style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '400px', overflow: 'hidden' }}>
                    <iframe srcDoc={html} className="w-full h-full border-none" title={`page ${p} html`} />
                  </div>
                  <pre className="mt-1 overflow-x-auto rounded bg-gray-50 p-2 text-[9px] text-gray-600 border border-gray-200 max-h-32">
                    {html.slice(0, 2000)}{html.length > 2000 ? '\n... (잘림)' : ''}
                  </pre>
                </details>
              ))}
            </div>

            {/* 표 목록 */}
            <div className="mb-4">
              <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                발견된 표 ({result.tables.length}개)
              </h2>
              {result.tables.length === 0 ? (
                <p className="text-xs text-red-500">표 발견 실패</p>
              ) : (
                result.tables.map((table, i) => (
                  <details key={i} className="mb-3" open={i < 4}>
                    <summary className="cursor-pointer select-none rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      Table {i} — sec={table.sec} para={table.para} ctrl={table.ctrl} —
                      {table.rowCount}행 × {table.colCount}열 ({table.cellCount}셀)
                    </summary>
                    <div className="mt-2 ml-3">
                      <TableGrid table={table} />
                    </div>
                  </details>
                ))
              )}
            </div>

            {/* 중첩 표 */}
            {result.nestedTables.length > 0 && (
              <div className="mb-4">
                <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  중첩 표 ({result.nestedTables.length}개)
                </h2>
                {result.nestedTables.map((nt, i) => (
                  <details key={i} className="mb-3">
                    <summary className="cursor-pointer select-none rounded bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                      Nested {i} — 부모 sec={nt.parentSec} para={nt.parentPara} ctrl={nt.parentCtrl} cell={nt.parentCell} —
                      {nt.rowCount}행 × {nt.colCount}열
                    </summary>
                    <div className="mt-2 ml-3">
                      <TableGrid table={{ ...nt, sec: nt.parentSec, para: nt.parentPara, ctrl: nt.parentCtrl, cellCount: nt.cells.length }} />
                    </div>
                  </details>
                ))}
              </div>
            )}

            {/* pathJson 형식 테스트 (Step 3-E-2-b-1) */}
            {result.pathJsonTest && (
              <div className="mb-4">
                <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
                  pathJson 형식 발견 시도 (Step 3-E-2-b-1)
                </h2>
                <div className="rounded-lg bg-white border border-gray-200 p-4 mb-3">
                  {/* 결과 요약 */}
                  <div className={`mb-3 rounded px-3 py-2 text-sm font-bold ${result.pathJsonTest.successPath ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>
                    {result.pathJsonTest.successPath
                      ? `✅ 발견: ${result.pathJsonTest.successPath}`
                      : '❌ 미발견 — 시도한 모든 형식이 외부 표(14×9) 반환'}
                  </div>

                  {/* 셀 정보 */}
                  <div className="text-xs text-gray-600 mb-3 space-y-1">
                    <div>외부 표 차원: {result.pathJsonTest.outerDims
                      ? `${result.pathJsonTest.outerDims.rowCount}행 × ${result.pathJsonTest.outerDims.colCount}열 (${result.pathJsonTest.outerDims.cellCount}셀)`
                      : '미확인'}</div>
                    <div>몬테소리 셀 (row=6,col=1): cellIdx={result.pathJsonTest.montessoriCellIdx === -1
                      ? '미발견'
                      : result.pathJsonTest.montessoriCellIdx}, cellParaCount={result.pathJsonTest.montessoriCellParaCount}
                    </div>
                    <div className="text-gray-400">{result.pathJsonTest.layerTreeHint}</div>
                  </div>

                  {/* 시도 결과 테이블 */}
                  <details open={!!result.pathJsonTest.successPath}>
                    <summary className="cursor-pointer text-xs font-semibold text-gray-500 mb-2">
                      전체 시도 ({result.pathJsonTest.attempts.length}개)
                    </summary>
                    <div className="overflow-x-auto mt-2">
                      <table className="border-collapse text-[10px] w-full">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-2 py-1 text-left">#</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">path</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">결과</th>
                            <th className="border border-gray-300 px-2 py-1 text-left">판정</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.pathJsonTest.attempts.map((a, i) => (
                            <tr key={i} className={a.success ? 'bg-green-50' : ''}>
                              <td className="border border-gray-200 px-2 py-0.5">{i + 1}</td>
                              <td className="border border-gray-200 px-2 py-0.5 font-mono max-w-[300px] break-all">{a.path}</td>
                              <td className="border border-gray-200 px-2 py-0.5">
                                {a.error
                                  ? <span className="text-red-500">{a.error.slice(0, 80)}</span>
                                  : a.result
                                    ? `${a.result.rowCount}×${a.result.colCount} (${a.result.cellCount}셀)`
                                    : '—'}
                              </td>
                              <td className="border border-gray-200 px-2 py-0.5">
                                {a.success
                                  ? <span className="text-green-600 font-bold">✅ 성공</span>
                                  : a.error
                                    ? <span className="text-red-400">에러</span>
                                    : <span className="text-gray-400">외부표</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 양식 파싱 결과 (Step 3-E-2-b-2) ── */}
        {status === 'done' && result && (
          <div className="mb-4">
            <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">
              양식 파싱 결과 (Step 3-E-2-b-2)
            </h2>

            {result.parseError && (
              <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-3">
                파싱 오류: {result.parseError}
              </div>
            )}

            {result.parsed && (
              <>
                {/* 메타 검증 체크리스트 */}
                <div className="rounded-lg bg-white border border-gray-200 p-4 mb-3">
                  <h3 className="text-xs font-bold text-gray-600 mb-2">메타정보</h3>
                  {(() => {
                    const p = result.parsed!;
                    const checks = [
                      { label: 'planDate', value: p.planDate, expected: /^\d{4}-\d{2}-\d{2}$/ },
                      { label: 'subject', value: p.subject, expected: /.+/ },
                      { label: 'teacherName', value: p.teacherName, expected: /.+/ },
                      { label: 'classNameRaw', value: p.classNameRaw, expected: /.+/ },
                      { label: 'classTimeRaw', value: p.classTimeRaw, expected: /.+/ },
                      { label: 'classDayCount', value: String(p.classDayCount), expected: /^\d+$/ },
                    ];
                    return (
                      <table className="border-collapse text-[11px] w-full">
                        <tbody>
                          {checks.map(c => {
                            const ok = c.expected.test(c.value);
                            return (
                              <tr key={c.label}>
                                <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-500 w-32">{c.label}</td>
                                <td className="border border-gray-200 px-2 py-0.5 font-mono">{c.value || <em className="text-gray-300">비어있음</em>}</td>
                                <td className="border border-gray-200 px-2 py-0.5 w-10 text-center">{ok ? '✅' : '❌'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                {/* 섹션 */}
                <details className="mb-3" open>
                  <summary className="cursor-pointer select-none rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                    시간대별 활동 ({result.parsed.sections.length}개)
                    {result.parsed.sections.length === 11 ? ' ✅' : ' ❌ (11개 기대)'}
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="border-collapse text-[10px] w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1">#</th>
                          <th className="border border-gray-300 px-2 py-1">label</th>
                          <th className="border border-gray-300 px-2 py-1">category</th>
                          <th className="border border-gray-300 px-2 py-1">content (앞 60자)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.parsed.sections.map(s => (
                          <tr key={s.orderIndex}>
                            <td className="border border-gray-200 px-2 py-0.5">{s.orderIndex}</td>
                            <td className="border border-gray-200 px-2 py-0.5">{s.label}</td>
                            <td className="border border-gray-200 px-2 py-0.5">
                              <span className={`rounded px-1 text-[9px] ${s.category === 'OTHER' ? 'bg-gray-100' : 'bg-blue-100 text-blue-700'}`}>
                                {s.category}
                              </span>
                            </td>
                            <td className="border border-gray-200 px-2 py-0.5 text-gray-500 max-w-[300px] truncate">
                              {s.content.slice(0, 60) || <em className="text-gray-300">빈 셀</em>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                {/* 몬테소리 */}
                <details className="mb-3" open>
                  <summary className="cursor-pointer select-none rounded bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100">
                    몬테소리 기록 ({result.parsed.montessoriRecords.length}명)
                    {result.parsed.montessoriRecords.length >= 1 ? ' ✅' : ' ❌ (1명 이상 기대)'}
                  </summary>
                  <div className="mt-2 overflow-x-auto">
                    <table className="border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-1">#</th>
                          <th className="border border-gray-300 px-2 py-1">이름</th>
                          <th className="border border-gray-300 px-2 py-1">영역</th>
                          <th className="border border-gray-300 px-2 py-1">교구명</th>
                          <th className="border border-gray-300 px-2 py-1">확인</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.parsed.montessoriRecords.map((r, i) => (
                          <tr key={i}>
                            <td className="border border-gray-200 px-2 py-0.5 text-gray-400">{i + 1}</td>
                            <td className="border border-gray-200 px-2 py-0.5 font-medium">{r.childNameRaw}</td>
                            <td className="border border-gray-200 px-2 py-0.5">{r.area ?? ''}</td>
                            <td className="border border-gray-200 px-2 py-0.5">{r.material ?? ''}</td>
                            <td className="border border-gray-200 px-2 py-0.5">{r.confirmed ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </>
            )}
          </div>
        )}

        {status === 'idle' && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p>자동 로드 실패 — HWP 파일을 직접 선택하거나</p>
            <p className="text-xs mt-1">/hwp-samples/CASE_5_8.hwp 를 확인하세요</p>
          </div>
        )}

        {/* ── 쓰기 API 시험 (Step 4-A-1) ── */}
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              쓰기 API 시험 — Step 4-A-1
            </h2>
            <button
              onClick={async () => {
                setWriteStatus('running');
                setWriteResult(null);
                setWriteError('');
                try {
                  const r = await runWriteApiTest();
                  setWriteResult(r);
                  setWriteStatus('done');
                } catch (e) {
                  setWriteError(String(e));
                  setWriteStatus('error');
                }
              }}
              disabled={writeStatus === 'running'}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {writeStatus === 'running' ? '실행 중…' : '쓰기 API 테스트 실행'}
            </button>
            {writeStatus === 'error' && <span className="text-xs text-red-500">{writeError}</span>}
          </div>

          {writeResult && (
            <div className="rounded-lg bg-white border border-gray-200 p-4">
              {/* 요약 */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`rounded px-3 py-1 text-sm font-bold ${writeResult.errors.length === 0 ? 'bg-green-100 text-green-800' : 'bg-red-50 text-red-700'}`}>
                  {writeResult.errors.length === 0 ? '✅ 전 단계 성공' : `❌ 에러 ${writeResult.errors.length}건`}
                </div>
                <div className="text-xs text-gray-500">{Math.round(writeResult.elapsedMs)}ms 소요</div>
                {writeResult.exportedBytes && (
                  <button
                    onClick={() => downloadBytes(writeResult.exportedBytes!, 'write-test-output.hwp')}
                    className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    HWP 다운로드 ({(writeResult.exportedBytes.length / 1024).toFixed(1)}KB)
                  </button>
                )}
              </div>

              {/* 단계별 결과 */}
              <table className="border-collapse text-[11px] w-full mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-2 py-1 text-left w-6">#</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">API 호출</th>
                    <th className="border border-gray-200 px-2 py-1 text-left">결과</th>
                    <th className="border border-gray-200 px-2 py-1 w-10">판정</th>
                  </tr>
                </thead>
                <tbody>
                  {writeResult.steps.map((s, i) => (
                    <tr key={i} className={s.ok ? '' : 'bg-red-50'}>
                      <td className="border border-gray-200 px-2 py-0.5 text-gray-400">{i + 1}</td>
                      <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-700">{s.name}</td>
                      <td className="border border-gray-200 px-2 py-0.5 text-gray-500 max-w-xs truncate">{s.result}</td>
                      <td className="border border-gray-200 px-2 py-0.5 text-center">
                        {s.ok ? '✅' : '❌'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* 재로드 검증 HTML 미리보기 */}
              {writeResult.verifyHtml && (
                <details className="mb-2">
                  <summary className="cursor-pointer text-xs font-semibold text-gray-600 hover:text-gray-800">
                    export → 재로드 렌더링 미리보기 (page 0)
                  </summary>
                  <div className="mt-2 border border-gray-200 rounded bg-white" style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '400px', overflow: 'hidden' }}>
                    <iframe srcDoc={writeResult.verifyHtml} className="w-full h-full border-none" title="write test output" />
                  </div>
                </details>
              )}

              {/* API 이름 비교표 */}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-gray-500">
                  제미나이 추정 API명 vs 실제 .d.ts 확인 결과
                </summary>
                <table className="border-collapse text-[11px] w-full mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-2 py-1 text-left">제미나이 추정</th>
                      <th className="border border-gray-200 px-2 py-1 text-left">실제 API 이름</th>
                      <th className="border border-gray-200 px-2 py-1 w-10">일치</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['InsertText', 'insertText(sec, para, char_offset, text)', '🔶 카멜케이스 차이'],
                      ['TableCreate', 'createTable(sec, para, char_offset, rows, cols)', '🔶 순서 뒤집힘'],
                      ['CharShape', 'applyCharFormat(sec, para, start, end, props_json)', '❌ 이름 완전히 다름 (한컴 OLE 혼동)'],
                      ['ParagraphShape', 'applyParaFormat(sec, para, props_json)', '❌ 이름 완전히 다름'],
                      ['export(저장)', 'exportHwp() → Uint8Array', '✅ 존재'],
                      ['blank.hwp 템플릿', 'createBlankDocument() — 내장 blank2010.hwp', '✅ 존재'],
                    ].map(([gemini, actual, match]) => (
                      <tr key={gemini}>
                        <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-500">{gemini}</td>
                        <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-700">{actual}</td>
                        <td className="border border-gray-200 px-2 py-0.5">{match}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
