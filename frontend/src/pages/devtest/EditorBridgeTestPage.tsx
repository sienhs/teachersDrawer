/**
 * /_editor-bridge-test — Tiptap JSON → rhwp/core → HWP 변환 브릿지 PoC
 * (Step 4-A-1 3단계, 우선순위 1 > 3 > 2)
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';
import type { JSONContent } from '@tiptap/react';

// ── WASM 측정 콜백 (RhwpCoreTestPage와 동일한 패턴) ─────────────────────
let _ctx: CanvasRenderingContext2D | null = null;
let _lastFont = '';
(globalThis as Record<string, unknown>)['measureTextWidth'] = (font: string, text: string): number => {
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    _ctx = canvas.getContext('2d');
  }
  if (!_ctx) return text.length * 10;
  if (font !== _lastFont) { _ctx.font = font; _lastFont = font; }
  return _ctx.measureText(text).width;
};

// ── Tiptap JSON → rhwp/core 변환 ─────────────────────────────────────────
interface BridgeLog {
  action: string;
  detail: string;
  ok: boolean;
}

interface BridgeResult {
  logs: BridgeLog[];
  errors: string[];
  hwpBytes: Uint8Array | null;
  previewHtml: string | null;
  elapsedMs: number;
}

async function convertTiptapToHwp(json: JSONContent): Promise<BridgeResult> {
  await init();
  const t0 = performance.now();
  const logs: BridgeLog[] = [];
  const errors: string[] = [];
  let hwpBytes: Uint8Array | null = null;
  let previewHtml: string | null = null;

  const doc = HwpDocument.createEmpty();

  // createBlankDocument로 유효한 DocInfo 확보
  try {
    const r = doc.createBlankDocument();
    logs.push({ action: 'createBlankDocument()', detail: r, ok: true });
  } catch (e) {
    logs.push({ action: 'createBlankDocument()', detail: String(e), ok: false });
    errors.push(String(e));
  }

  // 첫 문단 인덱스 추적
  let currentPara = 0;

  // Tiptap doc.content 순회
  const nodes = json.type === 'doc' ? (json.content ?? []) : [];

  for (const node of nodes) {
    try {
      if (node.type === 'paragraph' || node.type === 'heading') {
        const text = extractText(node);
        if (text) {
          const r = doc.insertText(0, currentPara, 0, text);
          logs.push({ action: `insertText(para=${currentPara}, "${text.slice(0, 30)}${text.length > 30 ? '…' : ''}")`, detail: r, ok: true });
        }
        // 다음 노드를 위해 새 문단 추가
        const len = doc.getParagraphLength(0, currentPara);
        const r2 = doc.splitParagraph(0, currentPara, len);
        logs.push({ action: `splitParagraph(para=${currentPara})`, detail: r2, ok: true });
        currentPara++;
      } else if (node.type === 'table') {
        // 표 생성
        const { rowCount, colCount, cells } = parseTiptapTable(node);
        const r = doc.createTable(0, currentPara, 0, rowCount, colCount);
        const parsed = JSON.parse(r);
        const tableParaIdx: number = parsed.paraIdx ?? currentPara;
        const tableCtrlIdx: number = parsed.controlIdx ?? 0;
        logs.push({ action: `createTable(para=${currentPara}, ${rowCount}×${colCount})`, detail: r, ok: true });

        // 셀 텍스트 삽입
        let cellIdx = 0;
        for (const cellText of cells) {
          try {
            const r2 = doc.insertTextInCell(0, tableParaIdx, tableCtrlIdx, cellIdx, 0, 0, cellText);
            logs.push({ action: `insertTextInCell(cell=${cellIdx}, "${cellText.slice(0, 20)}…")`, detail: r2, ok: true });
          } catch (e) {
            logs.push({ action: `insertTextInCell(cell=${cellIdx})`, detail: String(e), ok: false });
            errors.push(String(e));
          }
          cellIdx++;
        }

        // 표 다음 문단 추가
        const paraCountAfterTable = doc.getParagraphCount(0);
        currentPara = paraCountAfterTable;
        try {
          doc.splitParagraph(0, currentPara - 1, doc.getParagraphLength(0, currentPara - 1));
          currentPara++;
        } catch { /* 마지막 문단이면 skip */ }
      } else if (node.type === 'bulletList' || node.type === 'orderedList') {
        // 목록: 각 listItem을 별도 문단으로
        for (const item of node.content ?? []) {
          const text = extractText(item);
          if (text) {
            const r = doc.insertText(0, currentPara, 0, `• ${text}`);
            logs.push({ action: `insertText(list item, para=${currentPara})`, detail: r, ok: true });
            const len = doc.getParagraphLength(0, currentPara);
            const r2 = doc.splitParagraph(0, currentPara, len);
            logs.push({ action: `splitParagraph(para=${currentPara})`, detail: r2, ok: true });
            currentPara++;
          }
        }
      }
    } catch (e) {
      logs.push({ action: `node(${node.type})`, detail: String(e), ok: false });
      errors.push(String(e));
    }
  }

  // HWP export
  try {
    hwpBytes = doc.exportHwp();
    logs.push({ action: 'exportHwp()', detail: `${hwpBytes.length.toLocaleString()} bytes`, ok: true });
  } catch (e) {
    logs.push({ action: 'exportHwp()', detail: String(e), ok: false });
    errors.push(String(e));
  }

  // 재로드 검증
  if (hwpBytes) {
    try {
      const verifyDoc = new HwpDocument(hwpBytes);
      const pc = verifyDoc.pageCount();
      previewHtml = verifyDoc.renderPageHtml(0);
      logs.push({ action: '재로드 검증', detail: `pageCount=${pc} ✅`, ok: true });
      verifyDoc.free();
    } catch (e) {
      logs.push({ action: '재로드 검증', detail: String(e), ok: false });
      errors.push(String(e));
    }
  }

  doc.free();
  return { logs, errors, hwpBytes, previewHtml, elapsedMs: performance.now() - t0 };
}

function extractText(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? '';
  return (node.content ?? []).map(extractText).join('');
}

function parseTiptapTable(tableNode: JSONContent): { rowCount: number; colCount: number; cells: string[] } {
  const rows = tableNode.content ?? [];
  const rowCount = rows.length;
  const colCount = rows[0]?.content?.length ?? 0;
  const cells: string[] = [];
  for (const row of rows) {
    for (const cell of row.content ?? []) {
      cells.push(extractText(cell));
    }
  }
  return { rowCount, colCount, cells };
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

// ── 메인 페이지 ─────────────────────────────────────────────────────────
export default function EditorBridgeTestPage() {
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null);
  const [bridgeError, setBridgeError] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: `<h2>테스트 문서</h2><p>안녕하세요. 이 텍스트는 HWP로 변환됩니다.</p>`,
  });

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
  };

  const runBridge = async () => {
    if (!editor) return;
    setBridgeStatus('running');
    setBridgeResult(null);
    setBridgeError('');
    try {
      const json = editor.getJSON();
      const r = await convertTiptapToHwp(json);
      setBridgeResult(r);
      setBridgeStatus('done');
    } catch (e) {
      setBridgeError(String(e));
      setBridgeStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-mono text-sm">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">에디터 브릿지 PoC</h1>
          <p className="text-xs text-gray-500 mt-1">Phase 4 Step 4-A-1 — 3단계: Tiptap JSON → rhwp/core → HWP</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* 왼쪽: Tiptap 에디터 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-gray-600 uppercase">Tiptap 에디터</h2>
              <button
                onClick={insertTable}
                className="rounded px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                표 삽입
              </button>
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className="rounded px-2 py-0.5 text-[10px] font-semibold bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                굵게
              </button>
            </div>
            <div className="rounded-lg border border-gray-300 bg-white min-h-[300px] p-4 prose prose-sm max-w-none">
              <EditorContent editor={editor} />
            </div>
            <button
              onClick={runBridge}
              disabled={bridgeStatus === 'running'}
              className="mt-3 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {bridgeStatus === 'running' ? '변환 중…' : 'HWP로 변환'}
            </button>
            {bridgeStatus === 'error' && (
              <p className="mt-1 text-xs text-red-500">{bridgeError}</p>
            )}
          </div>

          {/* 오른쪽: rhwp 뷰어 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xs font-bold text-gray-600 uppercase">HWP 미리보기</h2>
              {bridgeResult?.hwpBytes && (
                <button
                  onClick={() => downloadBytes(bridgeResult.hwpBytes!, 'bridge-output.hwp')}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  다운로드 ({(bridgeResult.hwpBytes.length / 1024).toFixed(1)}KB)
                </button>
              )}
            </div>
            <div className="rounded-lg border border-gray-300 bg-white min-h-[300px] overflow-hidden">
              {bridgeResult?.previewHtml ? (
                <iframe
                  srcDoc={bridgeResult.previewHtml}
                  className="w-full"
                  style={{ height: '400px', border: 'none' }}
                  title="hwp preview"
                />
              ) : (
                <div className="flex items-center justify-center h-72 text-gray-400 text-xs">
                  변환 결과가 여기에 표시됩니다
                </div>
              )}
            </div>

            {/* 변환 로그 */}
            {bridgeResult && (
              <details className="mt-3" open={bridgeResult.errors.length > 0}>
                <summary className={`cursor-pointer text-xs font-semibold px-3 py-1.5 rounded ${bridgeResult.errors.length === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  변환 로그 ({bridgeResult.logs.length}단계, {Math.round(bridgeResult.elapsedMs)}ms)
                  {bridgeResult.errors.length > 0 ? ` — 에러 ${bridgeResult.errors.length}건` : ' ✅'}
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto">
                  <table className="border-collapse text-[10px] w-full">
                    <tbody>
                      {bridgeResult.logs.map((l, i) => (
                        <tr key={i} className={l.ok ? '' : 'bg-red-50'}>
                          <td className="border border-gray-200 px-2 py-0.5 text-gray-400 w-6">{i + 1}</td>
                          <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-700">{l.action}</td>
                          <td className="border border-gray-200 px-2 py-0.5 text-gray-500 max-w-[150px] truncate">{l.detail}</td>
                          <td className="border border-gray-200 px-2 py-0.5 w-6 text-center">{l.ok ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </div>
        </div>

        {/* GO/NO-GO 판정 섹션 */}
        {bridgeResult && (
          <div className={`mt-6 rounded-lg p-4 border-2 ${bridgeResult.errors.length === 0 && bridgeResult.previewHtml ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
            <h2 className="text-sm font-bold mb-2">
              {bridgeResult.errors.length === 0 && bridgeResult.previewHtml
                ? '✅ GO: Tiptap → rhwp/core → HWP 변환 성공'
                : '❌ 막힌 부분 있음'}
            </h2>
            {bridgeResult.errors.length > 0 && (
              <ul className="text-xs text-red-700 space-y-0.5">
                {bridgeResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            )}
            {bridgeResult.errors.length === 0 && bridgeResult.previewHtml && (
              <p className="text-xs text-green-700">
                텍스트 + 표가 포함된 HWP 생성 완료. 다운로드 후 한컴오피스에서 검증 필요.
              </p>
            )}
          </div>
        )}
      </div>

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          min-width: 60px;
          vertical-align: top;
        }
        .ProseMirror table th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .ProseMirror p { margin: 4px 0; }
        .ProseMirror h2 { font-size: 1.2em; font-weight: 700; margin: 8px 0 4px; }
        .selectedCell { background: #dbeafe; }
      `}</style>
    </div>
  );
}
