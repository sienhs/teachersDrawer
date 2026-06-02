import { useCallback, useEffect, useState } from 'react';
import { activityPlanApi } from '../../api/activityPlan';
import type { ActivityPlanAnalysis, ActivityPlanConfirmRequest } from '../../types/activityPlan';
import AnalysisConfirmModal from './AnalysisConfirmModal';
import RhwpEmbed from './RhwpEmbed';
import Spinner from '../ui/Spinner';

interface Props {
  planId: number;
  fileName: string;
  classroomId?: number | null;
  defaultOpen?: boolean;
  onReflected?: () => void;
}

type LoadStatus = 'idle' | 'loading' | 'done' | 'error';

function FileIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return '방금';
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}분 전`;
}

export default function RhwpViewerPanel({ planId, fileName, defaultOpen, onReflected }: Props) { // classroomId unused while [정리화면에 반영] is disabled
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem('rhwp-panel-open');
    if (stored !== null) return stored === 'true';
    return defaultOpen ?? false;
  });

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('idle');
  const [hwpBytes, setHwpBytes] = useState<Uint8Array | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 편집 모드 상태
  const [editMode, setEditMode] = useState(false);
  const [, setPendingBytes] = useState<Uint8Array | null>(null); // getter unused while [정리화면에 반영] is disabled
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [, setSavedSinceLastReflect] = useState(false); // getter unused while [정리화면에 반영] is disabled
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // [정리화면에 반영] 모달
  // const [reflecting, setReflecting] = useState(false); // TODO(Phase 4): 재활성화 시 주석 해제
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ActivityPlanAnalysis | null>(null);

  // 상대 시간 갱신을 위한 tick
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!lastSavedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, [lastSavedAt]);

  // localStorage에 펼침 상태 저장
  useEffect(() => {
    localStorage.setItem('rhwp-panel-open', String(isOpen));
  }, [isOpen]);

  // planId가 바뀌면 캐시 리셋
  useEffect(() => {
    setLoadStatus('idle');
    setHwpBytes(null);
    setErrorMsg('');
    setEditMode(false);
    setPendingBytes(null);
    setLastSavedAt(null);
    setSavedSinceLastReflect(false);
  }, [planId]);

  // 편집 모드 OFF 시 pendingBytes 초기화
  useEffect(() => {
    if (!editMode) {
      setPendingBytes(null);
    }
  }, [editMode]);

  // 첫 펼침 시 lazy load
  useEffect(() => {
    if (!isOpen || loadStatus !== 'idle') return;
    setLoadStatus('loading');
    activityPlanApi
      .downloadFile(planId)
      .then(({ blob }) => blob.arrayBuffer())
      .then((buf) => {
        setHwpBytes(new Uint8Array(buf));
        setLoadStatus('done');
      })
      .catch((e: Error) => {
        setErrorMsg(e.message ?? '파일 로드 실패');
        setLoadStatus('error');
      });
  }, [isOpen, loadStatus, planId]);

  const handleRetry = () => {
    setLoadStatus('idle');
    setErrorMsg('');
  };

  // polling에서 변경 감지 시 호출 → 즉시 자동 저장 (3초 polling 자체가 debounce)
  const handleChange = useCallback(async (newBytes: Uint8Array) => {
    setPendingBytes(newBytes);
    setSaving(true);
    setSaveError(false);
    try {
      const file = new File([newBytes.buffer as ArrayBuffer], fileName, { type: 'application/x-hwp' });
      await activityPlanApi.updateFile(planId, file);
      setLastSavedAt(new Date());
      setSavedSinceLastReflect(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, [planId, fileName]);

  // TODO(Phase 4): [정리화면에 반영] 재활성화 시 아래 주석 해제
  // const handleReflect = async () => {
  //   setReflecting(true);
  //   try {
  //     const bytes = pendingBytes ?? hwpBytes;
  //     if (!bytes) return;
  //     const file = new File([bytes.buffer as ArrayBuffer], fileName, { type: 'application/x-hwp' });
  //     const analysis = await activityPlanApi.analyze(file, classroomId ?? undefined);
  //     setAnalysisResult(analysis);
  //     setShowConfirmModal(true);
  //   } catch {
  //     alert('분석에 실패했습니다. 다시 시도해주세요.');
  //   } finally {
  //     setReflecting(false);
  //   }
  // };

  // 모달에서 [수락하고 저장] 클릭
  const handleConfirmReflect = async (request: ActivityPlanConfirmRequest) => {
    await activityPlanApi.confirm(request);
    setSavedSinceLastReflect(false);
    setShowConfirmModal(false);
    setAnalysisResult(null);
    if (onReflected) {
      onReflected();
    } else {
      window.location.reload();
    }
  };

  // 모달 닫기 (거부 — 자동 저장 파일은 그대로 유지, DB만 갱신 안 함)
  const handleCancelReflect = async () => {
    if (analysisResult) {
      // analyze에서 생성된 임시 파일 정리 (confirm 호출하면 백엔드에서 정리하지만 거부 시 직접 정리)
      try {
        await activityPlanApi.cancelTemp(analysisResult.fileKey);
      } catch {
        // 무시
      }
    }
    setShowConfirmModal(false);
    setAnalysisResult(null);
  };

  // ── 접힘 상태 ─────────────────────────────────────────────
  if (!isOpen) {
    return (
      <div className="h-full shrink-0">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="원본 HWP 보기"
          className="flex h-full w-12 flex-col items-center justify-start gap-1.5 border-l border-orange-100 bg-white pt-6 text-gray-400 transition-colors hover:bg-orange-50 hover:text-[#FF9F66]"
        >
          <FileIcon size={20} />
          <span
            className="text-[10px] font-semibold tracking-wider text-current"
            style={{ writingMode: 'vertical-lr' }}
          >
            원본
          </span>
        </button>
      </div>
    );
  }

  // ── 펼침 상태 ─────────────────────────────────────────────
  return (
    <>
      {showConfirmModal && analysisResult && (
        <AnalysisConfirmModal
          analysis={analysisResult}
          existingPlanId={planId}
          onConfirm={handleConfirmReflect}
          onCancel={handleCancelReflect}
        />
      )}

      <aside className="flex h-full w-2/5 min-w-[320px] shrink-0 flex-col border-l border-orange-100 bg-white transition-all duration-300">
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[#FF9F66]">
              <FileIcon size={16} />
            </span>
            <h3 className="text-sm font-bold text-gray-700">원본 HWP</h3>
            {fileName && (
              <span className="max-w-[120px] truncate text-xs text-gray-400">{fileName}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* 편집모드 토글 */}
            <button
              type="button"
              onClick={() => setEditMode((v) => !v)}
              disabled={loadStatus !== 'done'}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 ${
                editMode
                  ? 'bg-orange-500 text-white hover:bg-orange-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              편집 {editMode ? 'ON' : 'OFF'}
            </button>

            {/* [정리화면에 반영] — 임시 비활성화 (rhwp export ↔ pyhwp 비호환, Phase 4에서 해결) */}
            <button
              type="button"
              disabled
              title="준비 중인 기능입니다"
              className="cursor-not-allowed rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-400 opacity-60"
            >
              정리화면에 반영
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="닫기"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="relative flex-1 overflow-hidden">
          {loadStatus === 'loading' && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
              <Spinner />
              <p className="text-sm text-gray-400">원본 파일 불러오는 중…</p>
            </div>
          )}
          {loadStatus === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-2xl">⚠️</p>
              <p className="text-sm text-gray-500">{errorMsg || '파일을 불러올 수 없습니다.'}</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-xl bg-orange-50 px-4 py-2 text-sm font-semibold text-[#FF9F66] transition-colors hover:bg-orange-100"
              >
                다시 시도
              </button>
            </div>
          )}
          {loadStatus === 'done' && hwpBytes && (
            <RhwpEmbed
              hwpBytes={hwpBytes}
              fileName={fileName}
              editable={editMode}
              onChange={handleChange}
            />
          )}
        </div>

        {/* 하단 상태 표시 */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-1.5 text-xs text-gray-400">
          {saving && <span>저장 중…</span>}
          {saveError && !saving && (
            <span className="text-red-400">저장 실패 — 네트워크를 확인해주세요</span>
          )}
          {!saving && !saveError && lastSavedAt && (
            <span>
              {formatRelativeTime(lastSavedAt)} 자동 저장됨 (원본 파일만 갱신, 정리화면은 첫 업로드 기준)
            </span>
          )}
          {!saving && !saveError && !lastSavedAt && editMode && (
            <span>편집 후 3초 뒤 자동 저장됩니다</span>
          )}
        </div>
      </aside>
    </>
  );
}
