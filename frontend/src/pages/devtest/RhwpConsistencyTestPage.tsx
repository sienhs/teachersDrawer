/**
 * /_rhwp-consistency-test — hwp-parser(Python) vs rhwp/core(WASM) 일관성 검증
 * Phase 3 Step 3-E-2-b-3
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useRef, useState } from 'react';
import init, { HwpDocument } from '@rhwp/core';
import { activityPlanApi } from '../../api/activityPlan';
import { extractActivityPlan } from '../../lib/hwp/extractor';
import type { ParsedActivityPlan } from '../../lib/hwp/types';
import type { ActivityPlanAnalysis, ParsedSection, ParsedMontessoriRecord } from '../../types/activityPlan';

// ── WASM 텍스트 폭 측정 콜백 (rhwp/core 필수) ──────────────────────────────
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

// ── 비교 결과 타입 ────────────────────────────────────────────────────────
interface ComparisonResult {
  field: string;
  status: 'match' | 'normalized-match' | 'mismatch';
  hwpParser: unknown;
  rhwpCore: unknown;
  note?: string;
}

// ── 비교 로직 ────────────────────────────────────────────────────────────
function normalize(s: unknown): string {
  if (s == null) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

function compareField(field: string, a: unknown, b: unknown): ComparisonResult {
  if (a === b) return { field, status: 'match', hwpParser: a, rhwpCore: b };
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) {
    return { field, status: 'normalized-match', hwpParser: a, rhwpCore: b, note: '공백/개행 차이' };
  }
  return { field, status: 'mismatch', hwpParser: a, rhwpCore: b };
}

function compareSections(
  hwpSections: ParsedSection[],
  rhwpSections: ParsedSection[],
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  results.push(compareField('sections.length', hwpSections.length, rhwpSections.length));

  const maxLen = Math.max(hwpSections.length, rhwpSections.length);
  for (let i = 0; i < maxLen; i++) {
    const a = hwpSections[i];
    const b = rhwpSections[i];
    if (!a) {
      results.push({ field: `sections[${i}]`, status: 'mismatch', hwpParser: null, rhwpCore: b, note: 'hwp-parser에 없음' });
      continue;
    }
    if (!b) {
      results.push({ field: `sections[${i}]`, status: 'mismatch', hwpParser: a, rhwpCore: null, note: 'rhwp/core에 없음' });
      continue;
    }
    results.push(compareField(`sections[${i}].label`, a.label, b.label));
    results.push(compareField(`sections[${i}].content`, a.content, b.content));
    results.push(compareField(`sections[${i}].category`, a.category, b.category));
  }
  return results;
}

function compareMontessori(
  hwpList: ParsedMontessoriRecord[],
  rhwpList: ParsedMontessoriRecord[],
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  results.push(compareField('montessori.count', hwpList.length, rhwpList.length));

  const hwpByName = new Map(hwpList.map((r) => [normalize(r.childNameRaw), r]));
  const rhwpByName = new Map(rhwpList.map((r) => [normalize(r.childNameRaw), r]));

  for (const name of hwpByName.keys()) {
    if (!rhwpByName.has(name)) {
      results.push({ field: `montessori[${name}]`, status: 'mismatch', hwpParser: hwpByName.get(name), rhwpCore: null, note: 'rhwp/core에 없음' });
    }
  }
  for (const name of rhwpByName.keys()) {
    if (!hwpByName.has(name)) {
      results.push({ field: `montessori[${name}]`, status: 'mismatch', hwpParser: null, rhwpCore: rhwpByName.get(name), note: 'hwp-parser에 없음' });
    }
  }
  for (const name of hwpByName.keys()) {
    if (!rhwpByName.has(name)) continue;
    const a = hwpByName.get(name)!;
    const b = rhwpByName.get(name)!;
    results.push(compareField(`montessori[${name}].area`, a.area, b.area));
    results.push(compareField(`montessori[${name}].material`, a.material, b.material));
    results.push(compareField(`montessori[${name}].confirmed`, a.confirmed, b.confirmed));
  }
  return results;
}

function compare(hwp: ActivityPlanAnalysis, rhwp: ParsedActivityPlan): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  // 메타 6개
  results.push(compareField('planDate', hwp.planDate, rhwp.planDate));
  results.push(compareField('subject', hwp.subject ?? '', rhwp.subject));
  results.push(compareField('teacherName', hwp.teacherName ?? '', rhwp.teacherName));
  results.push(compareField('classNameRaw', hwp.classNameRaw ?? '', rhwp.classNameRaw));
  results.push(compareField('classTimeRaw', hwp.classTimeRaw ?? '', rhwp.classTimeRaw));
  results.push(compareField('classDayCount', hwp.classDayCount ?? 0, rhwp.classDayCount));

  // sections
  results.push(...compareSections(hwp.sections, rhwp.sections));

  // montessori
  results.push(...compareMontessori(hwp.montessoriRecords, rhwp.montessoriRecords));

  return results;
}

// ── 비교 수행 함수 ──────────────────────────────────────────────────────
interface RunResult {
  hwp: ActivityPlanAnalysis;
  rhwp: ParsedActivityPlan;
  comparison: ComparisonResult[];
  hwpMs: number;
  rhwpMs: number;
}

async function runComparison(file: File): Promise<RunResult> {
  // 1. hwp-parser (백엔드)
  const t1 = performance.now();
  const hwp = await activityPlanApi.analyze(file);
  const hwpMs = performance.now() - t1;

  // 2. rhwp/core (WASM)
  const t2 = performance.now();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await init();
  const doc = new HwpDocument(bytes);
  const rhwp = extractActivityPlan(doc);
  doc.free();
  const rhwpMs = performance.now() - t2;

  // 3. 비교
  const comparison = compare(hwp, rhwp);

  return { hwp, rhwp, comparison, hwpMs, rhwpMs };
}

// ── UI 컴포넌트 ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ComparisonResult['status'] }) {
  if (status === 'match') return <span className="text-green-600 font-bold">✅</span>;
  if (status === 'normalized-match') return <span className="text-yellow-500 font-bold">🟡</span>;
  return <span className="text-red-500 font-bold">❌</span>;
}

function ValueCell({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <em className="text-gray-300">null</em>;
  const s = String(value);
  if (s.length > 80) {
    return (
      <span title={s} className="cursor-help">
        {s.slice(0, 80)}<span className="text-gray-400">…</span>
      </span>
    );
  }
  return <>{s}</>;
}

function ComparisonTable({ results, title }: { results: ComparisonResult[]; title: string }) {
  const mismatches = results.filter((r) => r.status === 'mismatch').length;
  const normMatches = results.filter((r) => r.status === 'normalized-match').length;

  const badgeColor =
    mismatches > 0 ? 'bg-red-50 text-red-700' :
    normMatches > 0 ? 'bg-yellow-50 text-yellow-700' :
    'bg-green-50 text-green-700';

  return (
    <details className="mb-3" open={mismatches > 0 || normMatches > 0}>
      <summary className={`cursor-pointer select-none rounded px-3 py-1.5 text-xs font-semibold hover:opacity-80 ${badgeColor}`}>
        {title}
        <span className="ml-3 font-normal">
          ✅ {results.filter((r) => r.status === 'match').length}
          {normMatches > 0 && <> · 🟡 {normMatches}</>}
          {mismatches > 0 && <> · ❌ {mismatches}</>}
        </span>
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="border-collapse text-[10px] w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 w-6"></th>
              <th className="border border-gray-300 px-2 py-1 text-left w-56">필드</th>
              <th className="border border-gray-300 px-2 py-1 text-left">hwp-parser</th>
              <th className="border border-gray-300 px-2 py-1 text-left">rhwp/core</th>
              <th className="border border-gray-300 px-2 py-1 text-left w-32">비고</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className={
                r.status === 'mismatch' ? 'bg-red-50' :
                r.status === 'normalized-match' ? 'bg-yellow-50' : ''
              }>
                <td className="border border-gray-200 px-2 py-0.5 text-center">
                  <StatusBadge status={r.status} />
                </td>
                <td className="border border-gray-200 px-2 py-0.5 font-mono text-gray-600">
                  {r.field}
                </td>
                <td className="border border-gray-200 px-2 py-0.5 font-mono whitespace-pre-wrap max-w-xs">
                  <ValueCell value={r.hwpParser} />
                </td>
                <td className="border border-gray-200 px-2 py-0.5 font-mono whitespace-pre-wrap max-w-xs">
                  <ValueCell value={r.rhwpCore} />
                </td>
                <td className="border border-gray-200 px-2 py-0.5 text-gray-400 text-[9px]">
                  {r.note ?? ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────────────
export default function RhwpConsistencyTestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<{ fileName: string; data: RunResult }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setStatus('loading');
    setErrorMsg('');

    const newResults: { fileName: string; data: RunResult }[] = [];

    for (const file of Array.from(files)) {
      let hwpFileKey: string | undefined;
      try {
        const data = await runComparison(file);
        hwpFileKey = data.hwp.fileKey;
        newResults.push({ fileName: file.name, data });
      } catch (e) {
        setErrorMsg(`${file.name}: ${e}`);
        setStatus('error');
        return;
      } finally {
        if (hwpFileKey) {
          activityPlanApi.cancelTemp(hwpFileKey).catch(() => {/* cleanup 실패는 무시 */});
        }
      }
    }

    setResults(newResults);
    setStatus('done');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-mono text-sm">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">일관성 검증</h1>
          <p className="text-xs text-gray-500 mt-1">
            Phase 3 Step 3-E-2-b-3 — hwp-parser(Python) vs rhwp/core(WASM) 비교
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            ※ 백엔드 API 호출 포함 — 로그인 후 사용 권장
          </p>
        </div>

        {/* 파일 선택 */}
        <div className="mb-6 rounded-lg bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-600 mb-3">
            HWP 파일을 선택하면 두 방식으로 분석 후 비교합니다. 여러 파일 동시 선택 가능.
          </p>
          <div className="flex items-center gap-3">
            <label className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-blue-700">
              HWP 파일 선택
              <input
                ref={fileInputRef}
                type="file"
                accept=".hwp,.hwpx"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
            {status === 'loading' && (
              <span className="text-blue-500 text-xs animate-pulse">
                분석 중… (백엔드 + WASM 순차 실행)
              </span>
            )}
            {status === 'error' && (
              <span className="text-red-500 text-xs">{errorMsg}</span>
            )}
          </div>
        </div>

        {/* 결과 */}
        {status === 'done' && results.map(({ fileName, data }) => {
          const { comparison, hwpMs, rhwpMs } = data;

          const totalMatch = comparison.filter((r) => r.status === 'match').length;
          const totalNorm = comparison.filter((r) => r.status === 'normalized-match').length;
          const totalMismatch = comparison.filter((r) => r.status === 'mismatch').length;
          const total = comparison.length;

          const metaResults = comparison.filter((r) =>
            ['planDate', 'subject', 'teacherName', 'classNameRaw', 'classTimeRaw', 'classDayCount'].includes(r.field)
          );
          const sectionResults = comparison.filter((r) => r.field.startsWith('sections'));
          const montessoriResults = comparison.filter((r) => r.field.startsWith('montessori'));

          const overallStatus =
            totalMismatch > 0 ? 'mismatch' :
            totalNorm > 0 ? 'normalized-match' : 'match';

          return (
            <div key={fileName} className="mb-8">
              {/* 파일 헤더 */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-base font-bold text-gray-800">{fileName}</h2>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${
                  overallStatus === 'match' ? 'bg-green-100 text-green-700' :
                  overallStatus === 'normalized-match' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {overallStatus === 'match' ? '✅ 완전 일치' :
                   overallStatus === 'normalized-match' ? '🟡 정규화 일치' :
                   '❌ 불일치 있음'}
                </span>
              </div>

              {/* 요약 카드 */}
              <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
                <div className="rounded bg-white border border-gray-200 p-3 text-center">
                  <div className="text-xl font-bold text-gray-700">{total}</div>
                  <div className="text-[10px] text-gray-400">전체 비교 항목</div>
                </div>
                <div className="rounded bg-green-50 border border-green-200 p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{totalMatch}</div>
                  <div className="text-[10px] text-green-500">완전 일치</div>
                </div>
                <div className="rounded bg-yellow-50 border border-yellow-200 p-3 text-center">
                  <div className="text-xl font-bold text-yellow-600">{totalNorm}</div>
                  <div className="text-[10px] text-yellow-500">정규화 일치</div>
                </div>
                <div className="rounded bg-red-50 border border-red-200 p-3 text-center">
                  <div className="text-xl font-bold text-red-600">{totalMismatch}</div>
                  <div className="text-[10px] text-red-500">불일치</div>
                </div>
              </div>

              {/* 타이밍 */}
              <div className="mb-3 rounded bg-white border border-gray-200 px-4 py-2 flex gap-6 text-[11px] text-gray-500">
                <span>hwp-parser: <b className="text-gray-700">{Math.round(hwpMs)}ms</b></span>
                <span>rhwp/core: <b className="text-gray-700">{Math.round(rhwpMs)}ms</b></span>
              </div>

              {/* 상세 비교 */}
              <ComparisonTable results={metaResults} title={`메타 (6개 필드)`} />
              <ComparisonTable results={sectionResults} title={`시간대별 활동 (sections)`} />
              <ComparisonTable results={montessoriResults} title={`몬테소리 기록`} />
            </div>
          );
        })}

        {status === 'idle' && (
          <div className="text-center py-16 text-gray-400 text-sm">
            HWP 파일을 선택하면 비교 결과가 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
