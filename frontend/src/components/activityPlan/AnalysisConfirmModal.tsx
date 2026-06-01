import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import type {
  ActivityPlanAnalysis,
  ActivityPlanConfirmRequest,
  ChildMatch,
} from '../../types/activityPlan';

interface Props {
  analysis: ActivityPlanAnalysis;
  onConfirm: (request: ActivityPlanConfirmRequest) => Promise<void>;
  onCancel: () => void;
}

type ChildChoice =
  | { action: 'USE_EXISTING'; existingChildId: number }
  | { action: 'CREATE_NEW' }
  | { action: 'MERGE_WITH'; mergeTargetId: number };

function formatPlanDate(d: string) {
  try {
    return format(parseISO(d), 'yyyy년 M월 d일 (EEE)', { locale: ko });
  } catch {
    return d;
  }
}

function defaultChoice(cm: ChildMatch): ChildChoice {
  if (cm.exactMatchId != null) return { action: 'USE_EXISTING', existingChildId: cm.exactMatchId };
  return { action: 'CREATE_NEW' };
}

export default function AnalysisConfirmModal({ analysis, onConfirm, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);

  // 각 아이별 선택 상태
  const [choices, setChoices] = useState<Record<string, ChildChoice>>(() => {
    const init: Record<string, ChildChoice> = {};
    for (const cm of analysis.children) {
      init[cm.nameFromHwp] = defaultChoice(cm);
    }
    return init;
  });

  const newCount = useMemo(
    () => Object.values(choices).filter((c) => c.action === 'CREATE_NEW').length,
    [choices],
  );
  const existingCount = analysis.children.length - newCount;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const { classroom } = analysis;
      const classroomAction = classroom.existingId != null
        ? { useExisting: true, existingId: classroom.existingId }
        : { useExisting: false, newName: classroom.nameFromHwp, newYear: classroom.yearFromHwp };

      const childActions = analysis.children.map((cm) => {
        const choice = choices[cm.nameFromHwp] ?? { action: 'CREATE_NEW' };
        return {
          nameFromHwp: cm.nameFromHwp,
          action: choice.action,
          existingChildId: choice.action === 'USE_EXISTING' ? choice.existingChildId : null,
          mergeTargetId: choice.action === 'MERGE_WITH' ? choice.mergeTargetId : null,
        };
      });

      await onConfirm({
        fileKey: analysis.fileKey,
        fileName: analysis.fileName,
        planDate: analysis.planDate,
        subject: analysis.subject,
        teacherName: analysis.teacherName,
        classNameRaw: analysis.classNameRaw,
        classTimeRaw: analysis.classTimeRaw,
        classDayCount: analysis.classDayCount,
        rawJson: analysis.rawJson,
        sections: analysis.sections,
        montessoriRecords: analysis.montessoriRecords,
        classroomAction,
        childActions,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-start justify-between border-b border-gray-100 p-5">
          <div>
            <p className="text-xs text-gray-400">{formatPlanDate(analysis.planDate)}</p>
            <h2 className="mt-0.5 text-lg font-bold text-gray-800">활동계획안 분석 결과</h2>
            <p className="mt-0.5 text-sm text-[#FF9F66]">
              {analysis.classNameRaw || '반 미지정'}
              {analysis.teacherName ? ` · ${analysis.teacherName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* 반 */}
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">반</p>
            {analysis.classroom.willCreate ? (
              <div className="rounded-xl bg-orange-50 px-4 py-3 text-sm">
                <span className="font-semibold text-[#FF9F66]">+ </span>
                <span className="font-medium text-gray-800">
                  {analysis.classroom.nameFromHwp} ({analysis.classroom.yearFromHwp})
                </span>
                <span className="ml-2 text-gray-500">새로 생성됩니다</span>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                <span className="font-semibold text-green-600">✓ </span>
                <span className="font-medium text-gray-800">
                  {analysis.classroom.existingName} ({analysis.classroom.yearFromHwp})
                </span>
                <span className="ml-2 text-gray-500">기존 반 사용</span>
              </div>
            )}
          </section>

          {/* 아이 목록 */}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              아이 ({analysis.children.length}명 · 기존 {existingCount}명, 신규 {newCount}명)
            </p>
            <div className="space-y-1.5">
              {analysis.children.map((cm) => (
                <ChildRow
                  key={cm.nameFromHwp}
                  childMatch={cm}
                  choice={choices[cm.nameFromHwp]}
                  onChange={(c) => setChoices((prev) => ({ ...prev, [cm.nameFromHwp]: c }))}
                />
              ))}
            </div>
          </section>

          {/* 활동 요약 */}
          <section>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">활동</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              시간대별 {analysis.sections.length}개 · 몬테소리 {analysis.montessoriRecords.length}명 추출
            </div>
          </section>
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200 disabled:opacity-60"
          >
            거부
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 rounded-xl bg-[#FF9F66] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52] disabled:opacity-60"
          >
            {submitting ? '저장 중…' : '수락하고 저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 아이별 행 ──────────────────────────────────────────────

interface ChildRowProps {
  childMatch: ChildMatch;
  choice: ChildChoice;
  onChange: (c: ChildChoice) => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'PENDING',
  GRADUATED: '졸업',
  WITHDRAWN: '퇴소',
  ENROLLED: '재원',
};

function ChildRow({ childMatch, choice, onChange }: ChildRowProps) {
  const { nameFromHwp, exactMatchId, duplicateCandidates } = childMatch;

  // 정확 매칭 — 단순 표시
  if (exactMatchId != null) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-green-600">✓</span>
        <span className="font-medium text-gray-800">{nameFromHwp}</span>
        <span className="text-gray-400">기존 등록</span>
      </div>
    );
  }

  // 후보 없음 → 새로 추가 (단순 표시)
  if (duplicateCandidates.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2.5 text-sm">
        <span className="font-semibold text-[#FF9F66]">+</span>
        <span className="font-medium text-gray-800">{nameFromHwp}</span>
        <span className="text-gray-400">새로 추가 (PENDING)</span>
      </div>
    );
  }

  // 동명이인 후보 → 라디오 선택
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-4 py-3 text-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-base">⚠</span>
        <span className="font-semibold text-gray-800">{nameFromHwp}</span>
        <span className="text-gray-500">— 이름 중복</span>
      </div>
      <div className="space-y-1.5 pl-1">
        {duplicateCandidates.map((cand) => (
          <label key={cand.id} className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name={`child-${nameFromHwp}`}
              className="mt-0.5 accent-[#FF9F66]"
              checked={choice.action === 'MERGE_WITH' && choice.mergeTargetId === cand.id}
              onChange={() => onChange({ action: 'MERGE_WITH', mergeTargetId: cand.id })}
            />
            <span className="text-gray-700">
              {STATUS_LABEL[cand.status] ?? cand.status}의 {cand.name}
              {cand.lastClassroomName ? ` · ${cand.lastClassroomName}` : ''}
              {cand.birthDate ? ` · ${cand.birthDate}` : ''}
            </span>
          </label>
        ))}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name={`child-${nameFromHwp}`}
            className="accent-[#FF9F66]"
            checked={choice.action === 'CREATE_NEW'}
            onChange={() => onChange({ action: 'CREATE_NEW' })}
          />
          <span className="text-gray-700">새로운 아이로 등록 (PENDING)</span>
        </label>
      </div>
    </div>
  );
}
