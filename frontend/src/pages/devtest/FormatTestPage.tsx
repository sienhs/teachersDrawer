/**
 * /_format-test
 * applyCharFormat / applyParaFormat props_json 형식 검증 페이지
 *
 * 각 케이스: 빈 HWP → insertText("테스트") → apply서식 → exportHwp
 * 반환값 + SVG 미리보기 + 다운로드 제공
 */
import { useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';

// measureTextWidth 전역 콜백
let _ctx: CanvasRenderingContext2D | null = null;
(globalThis as Record<string, unknown>)['measureTextWidth'] = (font: string, text: string): number => {
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  if (!_ctx) return text.length * 10;
  _ctx.font = font;
  return _ctx.measureText(text).width;
};

// ── 테스트 케이스 정의 ──────────────────────────────────────────────────────

interface FormatCase {
  id: string;
  label: string;
  group: string;
  apply: (doc: HwpDocument, para: number) => string; // returns raw JSON result
}

// getCharPropertiesAt 반환 구조 조회 케이스 (특별)

function makeCharCases(): FormatCase[] {
  const variants = (label: string, group: string, builds: Array<[string, Record<string, unknown>]>): FormatCase[] =>
    builds.map(([suffix, obj]) => ({
      id: `${group}_${suffix}`,
      label: `${label} — ${suffix}`,
      group,
      apply: (doc, para) => doc.applyCharFormat(0, para, 0, 3, JSON.stringify(obj)),
    }));

  return [
    // ── bold ────────────────────────────────────────────────
    ...variants('bold', 'bold', [
      ['camel_true',      { bold: true }],
      ['camel_1',         { bold: 1 }],
      ['pascal_true',     { Bold: true }],
      ['charShape_bold',  { charShape: { bold: true } }],
      ['props_bold',      { props: { bold: true } }],
    ]),

    // ── italic ──────────────────────────────────────────────
    ...variants('italic', 'italic', [
      ['camel_true',      { italic: true }],
      ['camel_1',         { italic: 1 }],
    ]),

    // ── underline ───────────────────────────────────────────
    ...variants('underline', 'underline', [
      ['camel_true',      { underline: true }],
      ['kind_single',     { underline: 'single' }],
      ['underlineKind',   { underlineKind: 'single' }],
    ]),

    // ── 복합 (bold + italic) ─────────────────────────────────
    {
      id: 'combo_bold_italic',
      label: 'bold + italic 동시',
      group: 'combo',
      apply: (doc, para) => doc.applyCharFormat(0, para, 0, 3, JSON.stringify({ bold: true, italic: true })),
    },

    // ── textColor ───────────────────────────────────────────
    // HWP 색상: 보통 BGR 24비트 정수 또는 RGB
    // 빨강: RGB 0xFF0000=16711680, BGR 0x0000FF=255
    ...variants('textColor(빨강)', 'textColor', [
      ['rgb_num',         { textColor: 16711680 }],           // 0xFF0000 RGB
      ['bgr_num',         { textColor: 255 }],                 // 0x0000FF BGR = 빨강
      ['hex_hash',        { textColor: '#FF0000' }],
      ['hex_nohash',      { textColor: 'FF0000' }],
      ['rgb_obj',         { textColor: { r: 255, g: 0, b: 0 } }],
      ['color_rgb_num',   { color: 16711680 }],
      ['foreColor',       { foreColor: 16711680 }],
    ]),

    // ── fontSize ─────────────────────────────────────────────
    // HWPUNIT: 1pt = 200 HWPUNIT. 14pt = 2800, 12pt = 2400
    ...variants('fontSize', 'fontSize', [
      ['hwpunit_2800',    { fontSize: 2800 }],    // 14pt in HWPUNIT
      ['pt_14',           { fontSize: 14 }],       // 14pt 직접
      ['pt_1400',         { fontSize: 1400 }],     // 7pt? or 14pt * 100?
    ]),

    // ── fontFamily / fontName ────────────────────────────────
    // fontFamilies는 7개 배열(언어 카테고리별)
    ...variants('fontFamily', 'fontFamily', [
      ['fontFamily_str',   { fontFamily: '굴림' }],
      ['fontName_str',     { fontName: '굴림' }],
      ['font_str',         { font: '굴림' }],
      ['fontId_num',       { fontId: 2 }],
      ['fontFamilies_arr', { fontFamilies: ['굴림','굴림','굴림','굴림','굴림','굴림','굴림'] }],
    ]),

    // ── strikethrough ────────────────────────────────────────
    {
      id: 'strike_true',
      label: 'strikethrough',
      group: 'strike',
      apply: (doc, para) => doc.applyCharFormat(0, para, 0, 3, JSON.stringify({ strikethrough: true })),
    },
  ];
}

function makeParaCases(): FormatCase[] {
  return [
    // ── alignment ────────────────────────────────────────────
    // 한컴: 0=왼쪽, 1=가운데, 2=오른쪽, 3=양쪽(justify)
    { id: 'align_num_1',    label: 'alignment=1 (가운데?)', group: 'align',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ alignment: 1 })) },
    { id: 'align_num_2',    label: 'alignment=2 (오른쪽?)', group: 'align',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ alignment: 2 })) },
    { id: 'align_str_c',    label: 'alignment="center"', group: 'align',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ alignment: 'center' })) },
    { id: 'align_field',    label: 'align=1', group: 'align',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ align: 1 })) },
    { id: 'align_justify',  label: 'alignment=3 (양쪽)', group: 'align',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ alignment: 3 })) },

    // ── lineSpacing ──────────────────────────────────────────
    { id: 'ls_pct_160',     label: 'lineSpacing=160 (160%?)', group: 'lineSpacing',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ lineSpacing: 160 })) },
    { id: 'ls_pct_200',     label: 'lineSpacing=200', group: 'lineSpacing',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ lineSpacing: 200 })) },
    { id: 'ls_obj',         label: 'lineSpacing={type,value}', group: 'lineSpacing',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ lineSpacing: { type: 0, value: 160 } })) },

    // ── indent / margin ──────────────────────────────────────
    { id: 'indent_300',     label: 'indent=300', group: 'indent',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ indent: 300 })) },
    { id: 'marginLeft_300', label: 'marginLeft=300', group: 'indent',
      apply: (doc, para) => doc.applyParaFormat(0, para, JSON.stringify({ marginLeft: 300 })) },
  ];
}

// ── 결과 타입 ───────────────────────────────────────────────────────────────

interface CaseResult {
  id: string;
  label: string;
  group: string;
  rawResult: string;       // apply 반환값
  ok: boolean;             // {"ok":true} 이면 true
  error: string;           // catch된 오류
  svg: string;             // 렌더링 SVG
  hwpBytes: Uint8Array | null;
  inspectBefore?: string;  // getCharPropertiesAt (적용 전)
  inspectAfter?: string;   // getCharPropertiesAt (적용 후)
  paraProps?: string;      // getParaPropertiesAt (적용 전)
  paraPropsAfter?: string; // getParaPropertiesAt (적용 후, para 케이스용)
}

// ── 실행 로직 ───────────────────────────────────────────────────────────────

async function runOneCase(
  testCase: FormatCase,
  _isChar: boolean,
): Promise<CaseResult> {
  const doc = HwpDocument.createEmpty();
  const result: CaseResult = {
    id: testCase.id,
    label: testCase.label,
    group: testCase.group,
    rawResult: '',
    ok: false,
    error: '',
    svg: '',
    hwpBytes: null,
  };

  try {
    doc.createBlankDocument();
    const para = 0;
    // 텍스트 삽입: "테스트" (3글자)
    doc.insertText(0, para, 0, '테스트');

    // 적용 전 속성 조회
    result.inspectBefore = doc.getCharPropertiesAt(0, para, 0);
    result.paraProps = doc.getParaPropertiesAt(0, para);

    // 서식 적용
    result.rawResult = testCase.apply(doc, para);
    const parsed = JSON.parse(result.rawResult) as Record<string, unknown>;
    result.ok = parsed['ok'] === true;

    // 적용 후 속성 조회
    result.inspectAfter = doc.getCharPropertiesAt(0, para, 0);
    result.paraPropsAfter = doc.getParaPropertiesAt(0, para);

    // SVG 미리보기
    result.svg = doc.renderPageSvg(0);

    // HWP 내보내기
    result.hwpBytes = doc.exportHwp();
  } catch (e: unknown) {
    result.error = String(e);
    result.ok = false;
    // 에러가 있어도 SVG 시도
    try { result.svg = doc.renderPageSvg(0); } catch { /* ignore */ }
  } finally {
    try { doc.free(); } catch { /* ignore */ }
  }

  return result;
}

// ── 특별: getCharPropertiesAt 구조 조회 ────────────────────────────────────

async function runInspect(): Promise<{ before: string; after: string; para: string }> {
  const doc = HwpDocument.createEmpty();
  try {
    doc.createBlankDocument();
    doc.insertText(0, 0, 0, '테스트');
    const before = doc.getCharPropertiesAt(0, 0, 0);
    // 기본 bold 시도
    try { doc.applyCharFormat(0, 0, 0, 3, JSON.stringify({ bold: true })); } catch { /* ignore */ }
    const after = doc.getCharPropertiesAt(0, 0, 0);
    const para = doc.getParaPropertiesAt(0, 0);
    return { before, after, para };
  } finally {
    try { doc.free(); } catch { /* ignore */ }
  }
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.slice()], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── UI 컴포넌트 ─────────────────────────────────────────────────────────────

type Phase = 'idle' | 'initing' | 'inspect' | 'running' | 'done';

interface State {
  phase: Phase;
  progress: number;
  total: number;
  inspect: { before: string; after: string; para: string } | null;
  charResults: CaseResult[];
  paraResults: CaseResult[];
  selectedId: string | null;
}

export default function FormatTestPage() {
  const [state, setState] = useState<State>({
    phase: 'idle',
    progress: 0,
    total: 0,
    inspect: null,
    charResults: [],
    paraResults: [],
    selectedId: null,
  });

  const charCases = makeCharCases();
  const paraCases = makeParaCases();

  const runAll = async () => {
    setState(s => ({ ...s, phase: 'initing', progress: 0, charResults: [], paraResults: [], inspect: null }));

    await init();

    // 1. inspect
    setState(s => ({ ...s, phase: 'inspect' }));
    const inspect = await runInspect();
    setState(s => ({ ...s, inspect }));

    // 2. char 케이스
    setState(s => ({ ...s, phase: 'running', total: charCases.length + paraCases.length }));
    const charResults: CaseResult[] = [];
    for (let i = 0; i < charCases.length; i++) {
      const r = await runOneCase(charCases[i], true);
      charResults.push(r);
      setState(s => ({ ...s, charResults: [...charResults], progress: i + 1 }));
    }

    // 3. para 케이스
    const paraResults: CaseResult[] = [];
    for (let i = 0; i < paraCases.length; i++) {
      const r = await runOneCase(paraCases[i], false);
      paraResults.push(r);
      setState(s => ({ ...s, paraResults: [...paraResults], progress: charCases.length + i + 1 }));
    }

    setState(s => ({ ...s, phase: 'done' }));

    // Playwright 자동화용: 결과를 window에 노출
    (window as unknown as Record<string, unknown>)['__testResults'] = {
      inspect,
      charResults: charResults.map(r => ({
        id: r.id, label: r.label, group: r.group,
        ok: r.ok, error: r.error, rawResult: r.rawResult,
        before: r.inspectBefore, after: r.inspectAfter,
        paraProps: r.paraProps, paraPropsAfter: r.paraPropsAfter,
      })),
      paraResults: paraResults.map(r => ({
        id: r.id, label: r.label, group: r.group,
        ok: r.ok, error: r.error, rawResult: r.rawResult,
        before: r.inspectBefore, after: r.inspectAfter,
        paraProps: r.paraProps, paraPropsAfter: r.paraPropsAfter,
      })),
    };
  };

  const selected =
    state.selectedId
      ? ([...state.charResults, ...state.paraResults].find(r => r.id === state.selectedId) ?? null)
      : null;

  const groupedChar = groupBy(state.charResults, r => r.group);
  const groupedPara = groupBy(state.paraResults, r => r.group);

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#E2E8F0', fontFamily: 'monospace', fontSize: 13, padding: 16 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
            applyCharFormat / applyParaFormat props_json 검증
          </h1>
          <span style={{ fontSize: 11, color: '#64748B' }}>/_format-test</span>
        </div>

        {/* Inspect 결과 */}
        {state.inspect && (
          <div style={{ background: '#1E293B', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#94A3B8', marginBottom: 8, fontSize: 11, textTransform: 'uppercase' }}>
              getCharPropertiesAt 반환 구조 (insert 직후)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>charProps (before bold)</div>
                <pre style={{ margin: 0, color: '#86EFAC', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {prettyJson(state.inspect.before)}
                </pre>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>charProps (after bold attempt)</div>
                <pre style={{ margin: 0, color: '#FCD34D', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {prettyJson(state.inspect.after)}
                </pre>
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>paraProps</div>
                <pre style={{ margin: 0, color: '#93C5FD', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {prettyJson(state.inspect.para)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 실행 버튼 + 진행률 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => void runAll()}
            disabled={state.phase === 'running' || state.phase === 'initing' || state.phase === 'inspect'}
            style={{
              padding: '8px 20px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: '#22C55E', color: '#fff', fontWeight: 700, fontSize: 13,
              opacity: (state.phase === 'running' || state.phase === 'initing' || state.phase === 'inspect') ? 0.5 : 1,
            }}
          >
            {state.phase === 'idle' ? '전체 실행' :
             state.phase === 'initing' ? 'WASM 초기화 중…' :
             state.phase === 'inspect' ? '구조 조회 중…' :
             state.phase === 'running' ? `실행 중 (${state.progress}/${state.total})` :
             '다시 실행'}
          </button>
          {state.phase === 'done' && (
            <span style={{ color: '#22C55E', fontSize: 12 }}>
              ✅ 완료 — char {state.charResults.filter(r => r.ok).length}/{state.charResults.length}건 성공,
              para {state.paraResults.filter(r => r.ok).length}/{state.paraResults.length}건 성공
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 12 }}>

          {/* 왼쪽: 결과 목록 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* applyCharFormat */}
            <SectionHeader label="applyCharFormat" count={state.charResults.length} ok={state.charResults.filter(r => r.ok).length} />
            {Object.entries(groupedChar).map(([group, results]) => (
              <GroupBlock
                key={group}
                group={group}
                results={results}
                selectedId={state.selectedId}
                onSelect={id => setState(s => ({ ...s, selectedId: id === s.selectedId ? null : id }))}
              />
            ))}

            {/* applyParaFormat */}
            {state.paraResults.length > 0 && (
              <>
                <SectionHeader label="applyParaFormat" count={state.paraResults.length} ok={state.paraResults.filter(r => r.ok).length} />
                {Object.entries(groupedPara).map(([group, results]) => (
                  <GroupBlock
                    key={group}
                    group={group}
                    results={results}
                    selectedId={state.selectedId}
                    onSelect={id => setState(s => ({ ...s, selectedId: id === s.selectedId ? null : id }))}
                  />
                ))}
              </>
            )}
          </div>

          {/* 오른쪽: 선택된 케이스 상세 */}
          <div style={{ background: '#1E293B', borderRadius: 8, padding: 12, alignSelf: 'start', position: 'sticky', top: 16 }}>
            {selected ? (
              <CaseDetail result={selected} />
            ) : (
              <div style={{ color: '#475569', textAlign: 'center', padding: '40px 0', fontSize: 12 }}>
                케이스를 클릭하면 상세 정보가 표시됩니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function SectionHeader({ label, count, ok }: { label: string; count: number; ok: number }) {
  return (
    <div style={{
      padding: '6px 10px', borderRadius: 6, background: '#1E3A5F',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontWeight: 700, color: '#93C5FD', fontSize: 12 }}>{label}</span>
      {count > 0 && (
        <span style={{ fontSize: 11, color: ok === count ? '#22C55E' : '#F87171' }}>
          {ok}/{count}
        </span>
      )}
    </div>
  );
}

function GroupBlock({
  group, results, selectedId, onSelect,
}: {
  group: string;
  results: CaseResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ background: '#1E293B', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '4px 10px', background: '#0F2034', fontSize: 11, color: '#64748B', fontWeight: 700 }}>
        {group}
      </div>
      {results.map(r => (
        <ResultRow key={r.id} result={r} selected={selectedId === r.id} onSelect={() => onSelect(r.id)} />
      ))}
    </div>
  );
}

function ResultRow({ result, selected, onSelect }: { result: CaseResult; selected: boolean; onSelect: () => void }) {
  const bg = selected ? '#1D4ED8' : result.ok ? '#052E16' : result.error ? '#450A0A' : '#1E293B';
  const statusColor = result.ok ? '#22C55E' : result.error ? '#F87171' : '#64748B';
  const status = result.ok ? '✅' : result.error ? '💥' : '⏳';

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '5px 10px', cursor: 'pointer', background: bg,
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid #0F172A',
        transition: 'background 0.1s',
      }}
    >
      <span style={{ width: 20, flexShrink: 0, fontSize: 13 }}>{status}</span>
      <span style={{ flex: 1, color: selected ? '#fff' : '#CBD5E1', fontSize: 12 }}>{result.label}</span>
      {result.ok && (
        <span style={{ fontSize: 10, color: statusColor }}>ok</span>
      )}
      {result.error && (
        <span style={{ fontSize: 10, color: '#F87171', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {result.error.slice(0, 40)}
        </span>
      )}
    </div>
  );
}

function CaseDetail({ result }: { result: CaseResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 14 }}>{result.label}</div>
          <div style={{ color: '#64748B', fontSize: 11 }}>id: {result.id}</div>
        </div>
        {result.hwpBytes && (
          <button
            onClick={() => downloadBytes(result.hwpBytes!, `${result.id}.hwp`)}
            style={{
              padding: '5px 12px', borderRadius: 5, border: 'none', cursor: 'pointer',
              background: '#3B82F6', color: '#fff', fontWeight: 700, fontSize: 12,
            }}
          >
            다운로드 ({(result.hwpBytes.length / 1024).toFixed(1)}KB)
          </button>
        )}
      </div>

      {/* 상태 배지 */}
      <div style={{ padding: '6px 10px', borderRadius: 5, background: result.ok ? '#052E16' : result.error ? '#450A0A' : '#1E293B' }}>
        <span style={{ color: result.ok ? '#22C55E' : result.error ? '#F87171' : '#64748B', fontWeight: 700, fontSize: 12 }}>
          {result.ok ? '✅ ok:true 반환' : result.error ? `💥 에러: ${result.error}` : '⏳ 대기'}
        </span>
      </div>

      {/* rawResult */}
      {result.rawResult && (
        <InfoBlock label="apply 반환값 (rawResult)" color="#FCD34D">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {prettyJson(result.rawResult)}
          </pre>
        </InfoBlock>
      )}

      {/* getCharPropertiesAt before/after */}
      {result.inspectBefore && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <InfoBlock label="charProps (before)" color="#94A3B8">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11 }}>
              {prettyJson(result.inspectBefore)}
            </pre>
          </InfoBlock>
          <InfoBlock label="charProps (after)" color={result.ok ? '#86EFAC' : '#94A3B8'}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11 }}>
              {prettyJson(result.inspectAfter ?? '')}
            </pre>
          </InfoBlock>
        </div>
      )}

      {/* paraProps */}
      {result.paraProps && (
        <InfoBlock label="paraProps (before apply)" color="#93C5FD">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11 }}>
            {prettyJson(result.paraProps)}
          </pre>
        </InfoBlock>
      )}

      {/* SVG 미리보기 */}
      {result.svg && (
        <div>
          <div style={{ color: '#64748B', fontSize: 11, marginBottom: 4 }}>SVG 미리보기</div>
          <div style={{ background: '#fff', borderRadius: 4, overflow: 'hidden', maxHeight: 300 }}>
            <img
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
              alt="preview"
              style={{ width: '100%', objectFit: 'contain', objectPosition: 'top', maxHeight: 300 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0F172A', borderRadius: 5, padding: 8 }}>
      <div style={{ color, fontSize: 10, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#CBD5E1', fontSize: 12 }}>{children}</div>
    </div>
  );
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
