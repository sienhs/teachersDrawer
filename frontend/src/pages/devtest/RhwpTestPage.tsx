/**
 * /_rhwp-test — @rhwp/editor 안정성 검증 스파이크
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEffect, useRef, useState } from 'react';
import { createEditor } from '@rhwp/editor';
import type { RhwpEditor, HwpVerifyResult } from '@rhwp/editor';

// ── 샘플 정의 ────────────────────────────────────────────────
const SAMPLES = [
  {
    label: 'CASE_5_8 (2026-05-08)',
    hwpUrl: '/hwp-samples/CASE_5_8.hwp',
    fileName: 'CASE_5_8.hwp',
    imgUrl: '/hwp-samples/screenshots/hwp_5_8_screenshot.png',
  },
  {
    label: 'CASE_5_26 (2026-05-26)',
    hwpUrl: '/hwp-samples/CASE_5_26.hwp',
    fileName: 'CASE_5_26.hwp',
    imgUrl: '/hwp-samples/screenshots/hwp_5_26_screenshot.png',
  },
] as const;

// ── 체크리스트 정의 ──────────────────────────────────────────
type CheckVal = '' | '✅' | '⚠️' | '❌';
const CHECK_CYCLE: CheckVal[] = ['', '✅', '⚠️', '❌'];

const CHECKLIST = [
  {
    phase: 'A',
    category: '기본 레이아웃',
    items: [
      { id: 'page-size', label: '페이지 크기·여백' },
      { id: 'font', label: '폰트 종류·크기·색상' },
      { id: 'line-spacing', label: '줄 간격·자간' },
      { id: 'alignment', label: '정렬 (좌/우/중앙)' },
      { id: 'text-style', label: '굵게·기울임·밑줄' },
    ],
  },
  {
    phase: 'A',
    category: '표 (핵심)',
    items: [
      { id: 'table-structure', label: '표 구조 (행·열 개수)' },
      { id: 'cell-merge', label: '셀 병합 (rowspan/colspan) — 결제란' },
      { id: 'nested-table', label: '중첩 표 — 몬테소리 자유놀이 셀 안의 표' },
      { id: 'cell-size', label: '셀 너비·높이' },
      { id: 'cell-style', label: '셀 배경색·테두리' },
    ],
  },
  {
    phase: 'A',
    category: '텍스트',
    items: [
      { id: 'line-break', label: '한글 줄바꿈 위치' },
      { id: 'special-chars', label: '특수문자 (— · ▲ 등)' },
      { id: 'bullets', label: '글머리 기호' },
    ],
  },
  {
    phase: 'B',
    category: '편집 동작',
    items: [
      { id: 'edit-add-text', label: '텍스트 추가' },
      { id: 'edit-delete-text', label: '텍스트 삭제' },
      { id: 'edit-cell', label: '셀 내용 수정' },
      { id: 'edit-cell-add', label: '셀에 텍스트 추가' },
      { id: 'edit-add-row', label: '행 추가' },
      { id: 'edit-delete-row', label: '행 삭제' },
      { id: 'edit-merge', label: '셀 병합/분할' },
      { id: 'edit-undo', label: 'Undo/Redo' },
      { id: 'edit-copy', label: '복사/붙여넣기' },
    ],
  },
  {
    phase: 'C',
    category: 'Export 결과',
    items: [
      { id: 'export-download', label: '다운로드 자체 동작' },
      { id: 'export-open', label: '한컴오피스에서 열림' },
      { id: 'export-content', label: '수정한 내용 반영됨' },
      { id: 'export-structure', label: '원본 구조 유지 (표·폰트·레이아웃)' },
      { id: 'export-unchanged', label: '수정하지 않은 부분도 그대로' },
      { id: 'export-size', label: '파일 크기 합리적 (원본의 5배 이내)' },
    ],
  },
] as const;

type EditorStatus = 'initializing' | 'loading' | 'ready' | 'error';
type ActiveTab = 'view' | 'edit' | 'export';

// ── 메인 페이지 ──────────────────────────────────────────────
export default function RhwpTestPage() {
  const [selectedSample, setSelectedSample] = useState(0);
  const [editorStatus, setEditorStatus] = useState<EditorStatus>('initializing');
  const [editorError, setEditorError] = useState('');
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('view');

  const [checks, setChecks] = useState<Record<string, CheckVal>>(() => {
    try {
      return JSON.parse(localStorage.getItem('rhwp-test-checks') || '{}');
    } catch {
      return {};
    }
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('rhwp-test-notes') || '{}');
    } catch {
      return {};
    }
  });

  const [exportStatus, setExportStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [verifyResult, setVerifyResult] = useState<HwpVerifyResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditor | null>(null);

  // ── 에디터 초기화 ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;

      setEditorStatus('initializing');
      setEditorError('');

      try {
        const editor = await createEditor(containerRef.current);
        if (cancelled) {
          editor.destroy();
          return;
        }
        editorRef.current = editor;
        await loadHwp(editor, 0, cancelled);
      } catch (e) {
        if (!cancelled) {
          setEditorStatus('error');
          setEditorError(String(e));
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHwp = async (editor: RhwpEditor, idx: number, cancelled: boolean) => {
    setEditorStatus('loading');
    setEditorError('');
    const sample = SAMPLES[idx];
    const resp = await fetch(sample.hwpUrl);
    if (!resp.ok) throw new Error(`HWP 파일 로드 실패: ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    if (cancelled) return;
    const result = await editor.loadFile(buffer, sample.fileName);
    if (cancelled) return;
    setPageCount(result.pageCount);
    setEditorStatus('ready');
  };

  // ── 샘플 전환 ────────────────────────────────────────────
  const handleSampleChange = async (idx: number) => {
    if (!editorRef.current || idx === selectedSample) return;
    setSelectedSample(idx);
    try {
      await loadHwp(editorRef.current, idx, false);
    } catch (e) {
      setEditorStatus('error');
      setEditorError(String(e));
    }
  };

  // ── 체크리스트 토글 ──────────────────────────────────────
  const toggleCheck = (id: string) => {
    setChecks((prev) => {
      const cur = prev[id] ?? '';
      const next = CHECK_CYCLE[(CHECK_CYCLE.indexOf(cur) + 1) % CHECK_CYCLE.length];
      const updated = { ...prev, [id]: next };
      localStorage.setItem('rhwp-test-checks', JSON.stringify(updated));
      return updated;
    });
  };

  const updateNote = (id: string, val: string) => {
    setNotes((prev) => {
      const updated = { ...prev, [id]: val };
      localStorage.setItem('rhwp-test-notes', JSON.stringify(updated));
      return updated;
    });
  };

  // ── Export ───────────────────────────────────────────────
  const handleExportHwp = async () => {
    if (!editorRef.current) return;
    setExportStatus('running');
    setVerifyResult(null);
    try {
      const verify = await editorRef.current.exportHwpVerify();
      setVerifyResult(verify);

      const bytes = await editorRef.current.exportHwp();
      downloadBlob(bytes, `export_${SAMPLES[selectedSample].fileName}`, 'application/x-hwp');
      setExportStatus('done');
    } catch (e) {
      setExportStatus('error');
    }
  };

  const handleExportHwpx = async () => {
    if (!editorRef.current) return;
    setExportStatus('running');
    try {
      const bytes = await editorRef.current.exportHwpx();
      downloadBlob(
        bytes,
        `export_${SAMPLES[selectedSample].fileName.replace('.hwp', '.hwpx')}`,
        'application/vnd.hancom.hwpx',
      );
      setExportStatus('done');
    } catch (e) {
      setExportStatus('error');
    }
  };

  // ── 보고서 생성 ──────────────────────────────────────────
  const handleGenerateReport = () => {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [
      '# rhwp 안정성 검증 결과',
      '',
      `작성일: ${today}`,
      '검증 대상: @rhwp/editor v0.7.13',
      '샘플 파일: CASE_5_8.hwp, CASE_5_26.hwp',
      '',
      '## 요약',
      '',
      '전체 평가: (작성 필요)',
      '권고 방향: (작성 필요)',
      '',
    ];

    for (const section of CHECKLIST) {
      lines.push(`## ${section.phase === 'A' ? 'A. 렌더링 정확성' : section.phase === 'B' ? 'B. 편집 가능성' : 'C. Export 동일성'} — ${section.category}`);
      lines.push('');
      lines.push('| 항목 | 결과 | 메모 |');
      lines.push('|------|------|------|');
      for (const item of section.items) {
        const check = checks[item.id] || '-';
        const note = notes[item.id] || '';
        lines.push(`| ${item.label} | ${check} | ${note} |`);
      }
      lines.push('');
    }

    lines.push('## 발견된 주요 이슈');
    lines.push('');
    lines.push('1. ');
    lines.push('');
    lines.push('## 권고 사항');
    lines.push('');
    lines.push('- ');
    lines.push('');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '20260601-rhwp-evaluation.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const visiblePhase = activeTab === 'view' ? 'A' : activeTab === 'edit' ? 'B' : 'C';
  const visibleSections = CHECKLIST.filter((s) => s.phase === visiblePhase);

  const statusLabel: Record<EditorStatus, string> = {
    initializing: '에디터 초기화 중… (WASM 로딩, 최대 15초)',
    loading: 'HWP 파일 로드 중…',
    ready: `${pageCount}페이지 로드 완료`,
    error: '오류 발생',
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-950 text-gray-100">
      {/* ── 헤더 ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="rounded bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-black">DEV</span>
          <h1 className="text-base font-bold">rhwp 검증 페이지 — /_rhwp-test</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                editorStatus === 'ready'
                  ? 'bg-green-400'
                  : editorStatus === 'error'
                    ? 'bg-red-400'
                    : 'animate-pulse bg-yellow-400'
              }`}
            />
            <span className="text-gray-400">{statusLabel[editorStatus]}</span>
            {editorStatus === 'error' && editorError && (
              <span className="text-red-400">— {editorError}</span>
            )}
          </div>
          <select
            value={selectedSample}
            onChange={(e) => handleSampleChange(Number(e.target.value))}
            disabled={editorStatus !== 'ready'}
            className="rounded bg-gray-800 px-3 py-1.5 text-sm text-gray-200 disabled:opacity-50"
          >
            {SAMPLES.map((s, i) => (
              <option key={i} value={i}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ── 메인 패널 (좌: 원본 / 우: 에디터) ── */}
      <div className="flex min-h-0 flex-1">
        {/* 원본 스크린샷 */}
        <div className="w-1/2 overflow-auto border-r border-gray-800 bg-gray-950 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            원본 (한컴오피스 스크린샷)
          </p>
          <img
            src={SAMPLES[selectedSample].imgUrl}
            alt="원본 스크린샷"
            className="w-full rounded border border-gray-800"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* rhwp 에디터 */}
        <div className="relative w-1/2 bg-white">
          <p className="absolute left-3 top-2 z-10 rounded bg-gray-900/80 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            @rhwp/editor
          </p>
          {/* 로딩 오버레이 */}
          {(editorStatus === 'initializing' || editorStatus === 'loading') && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/60">
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                <p className="text-sm text-gray-300">{statusLabel[editorStatus]}</p>
              </div>
            </div>
          )}
          {editorStatus === 'error' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80">
              <div className="rounded-xl border border-red-800 bg-gray-900 p-6 text-center">
                <p className="text-2xl">❌</p>
                <p className="mt-2 font-semibold text-red-400">에디터 초기화 실패</p>
                <p className="mt-1 text-sm text-gray-400">{editorError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-4 rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
                >
                  새로고침
                </button>
              </div>
            </div>
          )}
          {/* 에디터 컨테이너 — createEditor가 iframe을 여기에 추가 */}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>

      {/* ── 하단 패널 (탭 + 체크리스트) ── */}
      <div className="flex h-72 shrink-0 flex-col border-t border-gray-800 bg-gray-900">
        {/* 탭 바 */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-2">
          <div className="flex gap-1">
            {(
              [
                { id: 'view', label: 'A. 원본 비교 (렌더링)' },
                { id: 'edit', label: 'B. 편집 모드' },
                { id: 'export', label: 'C. Export 테스트' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === t.id
                    ? 'bg-amber-500 text-black'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleGenerateReport}
            className="rounded bg-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-600"
          >
            📄 보고서 내보내기
          </button>
        </div>

        {/* 탭 본문 */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'export' ? (
            <ExportPanel
              status={exportStatus}
              verifyResult={verifyResult}
              onExportHwp={handleExportHwp}
              onExportHwpx={handleExportHwpx}
              disabled={editorStatus !== 'ready'}
              checks={checks}
              notes={notes}
              onToggleCheck={toggleCheck}
              onUpdateNote={updateNote}
              sections={visibleSections}
            />
          ) : (
            <ChecklistPanel
              sections={visibleSections}
              checks={checks}
              notes={notes}
              onToggleCheck={toggleCheck}
              onUpdateNote={updateNote}
              hint={
                activeTab === 'edit'
                  ? '에디터에서 직접 수정한 후 각 항목을 체크하세요. 편집은 항상 활성화되어 있습니다.'
                  : '우측 에디터와 좌측 원본을 비교하여 각 항목을 체크하세요.'
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── 체크리스트 패널 ──────────────────────────────────────────
interface ChecklistPanelProps {
  sections: typeof CHECKLIST[number][];
  checks: Record<string, CheckVal>;
  notes: Record<string, string>;
  onToggleCheck: (id: string) => void;
  onUpdateNote: (id: string, val: string) => void;
  hint?: string;
}

function ChecklistPanel({ sections, checks, notes, onToggleCheck, onUpdateNote, hint }: ChecklistPanelProps) {
  return (
    <div className="px-4 py-3">
      {hint && <p className="mb-3 text-xs text-amber-400">{hint}</p>}
      {sections.map((section) => (
        <div key={section.category} className="mb-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-500">
            {section.category}
          </p>
          <div className="space-y-1">
            {section.items.map((item) => (
              <CheckRow
                key={item.id}
                id={item.id}
                label={item.label}
                check={checks[item.id] ?? ''}
                note={notes[item.id] ?? ''}
                onToggle={() => onToggleCheck(item.id)}
                onNote={(v) => onUpdateNote(item.id, v)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 체크 행 ──────────────────────────────────────────────────
interface CheckRowProps {
  id: string;
  label: string;
  check: CheckVal;
  note: string;
  onToggle: () => void;
  onNote: (v: string) => void;
}

const CHECK_STYLE: Record<CheckVal, string> = {
  '': 'border-gray-600 text-gray-500',
  '✅': 'border-green-600 bg-green-900/40 text-green-400',
  '⚠️': 'border-yellow-600 bg-yellow-900/40 text-yellow-400',
  '❌': 'border-red-600 bg-red-900/40 text-red-400',
};

function CheckRow({ label, check, note, onToggle, onNote }: CheckRowProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 rounded border px-2 py-0.5 text-xs font-bold transition-colors ${CHECK_STYLE[check]}`}
        title="클릭하여 전환: — → ✅ → ⚠️ → ❌"
      >
        {check || '—'}
      </button>
      <span className="w-52 shrink-0 text-xs text-gray-300">{label}</span>
      <input
        type="text"
        value={note}
        onChange={(e) => onNote(e.target.value)}
        placeholder="메모…"
        className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-200 placeholder-gray-600 focus:border-amber-500 focus:outline-none"
      />
    </div>
  );
}

// ── Export 패널 ──────────────────────────────────────────────
interface ExportPanelProps {
  status: 'idle' | 'running' | 'done' | 'error';
  verifyResult: HwpVerifyResult | null;
  onExportHwp: () => void;
  onExportHwpx: () => void;
  disabled: boolean;
  sections: typeof CHECKLIST[number][];
  checks: Record<string, CheckVal>;
  notes: Record<string, string>;
  onToggleCheck: (id: string) => void;
  onUpdateNote: (id: string, val: string) => void;
}

function ExportPanel({
  status,
  verifyResult,
  onExportHwp,
  onExportHwpx,
  disabled,
  sections,
  checks,
  notes,
  onToggleCheck,
  onUpdateNote,
}: ExportPanelProps) {
  return (
    <div className="px-4 py-3">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={onExportHwp}
          disabled={disabled || status === 'running'}
          className="rounded bg-amber-500 px-4 py-1.5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {status === 'running' ? '처리 중…' : 'Export HWP'}
        </button>
        <button
          type="button"
          onClick={onExportHwpx}
          disabled={disabled || status === 'running'}
          className="rounded border border-amber-600 px-4 py-1.5 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-900/30 disabled:opacity-50"
        >
          Export HWPX
        </button>

        {verifyResult && (
          <div className="flex items-center gap-4 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs">
            <span>
              <span className="text-gray-500">recovered: </span>
              <span className={verifyResult.recovered ? 'text-green-400' : 'text-red-400'}>
                {String(verifyResult.recovered)}
              </span>
            </span>
            <span>
              <span className="text-gray-500">pagesBefore: </span>
              <span className="text-gray-200">{verifyResult.pageCountBefore}</span>
            </span>
            <span>
              <span className="text-gray-500">pagesAfter: </span>
              <span className={verifyResult.pageCountBefore === verifyResult.pageCountAfter ? 'text-green-400' : 'text-red-400'}>
                {verifyResult.pageCountAfter}
              </span>
            </span>
            <span>
              <span className="text-gray-500">bytes: </span>
              <span className="text-gray-200">{(verifyResult.bytesLen / 1024).toFixed(1)} KB</span>
            </span>
          </div>
        )}

        {status === 'done' && <span className="text-xs text-green-400">✅ 다운로드 완료</span>}
        {status === 'error' && <span className="text-xs text-red-400">❌ Export 실패</span>}
      </div>

      <ChecklistPanel
        sections={sections}
        checks={checks}
        notes={notes}
        onToggleCheck={onToggleCheck}
        onUpdateNote={onUpdateNote}
        hint="Export 후 한컴오피스에서 열어서 각 항목을 체크하세요."
      />
    </div>
  );
}

// ── 헬퍼 ─────────────────────────────────────────────────────
function downloadBlob(data: Uint8Array, name: string, type: string) {
  // TS6: Blob constructor requires ArrayBuffer, not ArrayBufferLike; WASM 반환값은 항상 ArrayBuffer
  const blob = new Blob([data.buffer as ArrayBuffer], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
