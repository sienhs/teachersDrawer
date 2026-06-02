/**
 * /_rhwp-core-test — @rhwp/core 저수준 WASM API 탐색 페이지
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEffect, useRef, useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';

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

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function RhwpCoreTestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<ExplorationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
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
          </>
        )}

        {status === 'idle' && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p>자동 로드 실패 — HWP 파일을 직접 선택하거나</p>
            <p className="text-xs mt-1">/hwp-samples/CASE_5_8.hwp 를 확인하세요</p>
          </div>
        )}
      </div>
    </div>
  );
}
