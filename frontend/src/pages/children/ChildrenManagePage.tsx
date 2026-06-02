import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { childApi } from '../../api/child';
import type { Child } from '../../types/child';
import Spinner from '../../components/ui/Spinner';

// ── 나이 계산 ────────────────────────────────────────────────
function calcAge(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `만 ${age}세`;
}

// ── 확인 모달 ────────────────────────────────────────────────
interface ConfirmModalProps {
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, confirmLabel, confirmClass, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function ChildrenManagePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') === 'pending' ? 'pending' : 'enrolled';
  const [tab, setTab] = useState<'enrolled' | 'pending'>(initialTab);

  const [enrolled, setEnrolled] = useState<Child[]>([]);
  const [pending, setPending] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  // 확인 모달 상태
  const [deleteTarget, setDeleteTarget] = useState<Child | null>(null);
  const [bulkAction, setBulkAction] = useState<'confirm-all' | 'delete-all' | null>(null);

  const fetched = useRef(false);

  const fetchData = useCallback(async () => {
    setError('');
    try {
      const [enrolledList, pendingList] = await Promise.all([
        childApi.listByStatus('ENROLLED'),
        childApi.listByStatus('PENDING'),
      ]);
      setEnrolled(enrolledList);
      setPending(pendingList);
    } catch {
      setError('아이 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchData();
  }, [fetchData]);

  // ── 단일 확정 ─────────────────────────────────────────
  const handleConfirm = async (child: Child) => {
    setProcessing(true);
    try {
      await childApi.update(child.id, {
        name: child.name,
        birthDate: child.birthDate ?? undefined,
        gender: child.gender ?? undefined,
        memo: child.memo ?? undefined,
        status: 'ENROLLED',
      });
      await fetchData();
      setTab('enrolled');
    } catch {
      alert('확정 처리에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // ── 단일 삭제 ─────────────────────────────────────────
  const handleDelete = async (child: Child) => {
    setDeleteTarget(null);
    setProcessing(true);
    try {
      await childApi.delete(child.id);
      setPending((prev) => prev.filter((c) => c.id !== child.id));
    } catch {
      alert('삭제에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // ── 일괄 확정 ─────────────────────────────────────────
  const handleConfirmAll = async () => {
    setBulkAction(null);
    setProcessing(true);
    try {
      await childApi.confirmAllPending();
      await fetchData();
      setTab('enrolled');
    } catch {
      alert('일괄 확정에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // ── 일괄 삭제 ─────────────────────────────────────────
  const handleDeleteAll = async () => {
    setBulkAction(null);
    setProcessing(true);
    try {
      await childApi.deleteAllPending();
      setPending([]);
    } catch {
      alert('일괄 삭제에 실패했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800">아이 관리</h1>
          {(loading || processing) && <Spinner className="h-5 w-5" />}
        </div>

        {/* 일괄 처리 (확인 필요 탭에서만) */}
        {tab === 'pending' && pending.length > 0 && !processing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBulkAction('confirm-all')}
              className="rounded-xl bg-[#FF9F66] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52]"
            >
              모두 확정
            </button>
            <button
              type="button"
              onClick={() => setBulkAction('delete-all')}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-100"
            >
              모두 삭제
            </button>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 rounded-2xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('enrolled')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === 'enrolled' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          전체 아이 ({enrolled.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('pending')}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
            tab === 'pending'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          확인 필요{' '}
          {pending.length > 0 && (
            <span
              className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                tab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-amber-200 text-amber-700'
              }`}
            >
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {/* 에러 */}
      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</div>
      )}

      {/* 본문 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : tab === 'enrolled' ? (
        <EnrolledTab children={enrolled} onClickChild={(id) => navigate(`/children/${id}`)} />
      ) : (
        <PendingTab
          children={pending}
          processing={processing}
          onConfirm={handleConfirm}
          onDeleteRequest={setDeleteTarget}
        />
      )}

      {/* 단일 삭제 확인 모달 */}
      {deleteTarget && (
        <ConfirmModal
          message={`"${deleteTarget.name}"을(를) 삭제하시겠습니까?\n삭제된 아이는 복구할 수 없습니다.`}
          confirmLabel="삭제"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* 일괄 확정 확인 모달 */}
      {bulkAction === 'confirm-all' && (
        <ConfirmModal
          message={`확인 필요한 아이 ${pending.length}명을 모두 확정하시겠습니까?`}
          confirmLabel="모두 확정"
          confirmClass="bg-[#FF9F66] hover:bg-[#f08c52]"
          onConfirm={handleConfirmAll}
          onCancel={() => setBulkAction(null)}
        />
      )}

      {/* 일괄 삭제 확인 모달 */}
      {bulkAction === 'delete-all' && (
        <ConfirmModal
          message={`확인 필요한 아이 ${pending.length}명을 모두 삭제하시겠습니까?\n삭제된 아이는 복구할 수 없습니다.`}
          confirmLabel="모두 삭제"
          confirmClass="bg-red-500 hover:bg-red-600"
          onConfirm={handleDeleteAll}
          onCancel={() => setBulkAction(null)}
        />
      )}
    </div>
  );
}

// ── 전체 아이 탭 ────────────────────────────────────────────────
interface EnrolledTabProps {
  children: Child[];
  onClickChild: (id: number) => void;
}

function EnrolledTab({ children, onClickChild }: EnrolledTabProps) {
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 py-16 text-gray-400">
        <p className="text-sm">등록된 아이가 없습니다.</p>
        <p className="mt-1 text-xs">HWP를 업로드하면 자동으로 등록됩니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children.map((child) => {
        const age = calcAge(child.birthDate);
        return (
          <button
            key={child.id}
            type="button"
            onClick={() => onClickChild(child.id)}
            className="flex flex-col items-start rounded-2xl bg-white p-4 text-left shadow-sm shadow-orange-50 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-[#FF9F66]">
              {child.name.charAt(0)}
            </div>
            <p className="mt-3 font-semibold text-gray-800">{child.name}</p>
            {age && <p className="mt-0.5 text-xs text-gray-400">{age}</p>}
          </button>
        );
      })}
    </div>
  );
}

// ── 확인 필요(PENDING) 탭 ────────────────────────────────────────
interface PendingTabProps {
  children: Child[];
  processing: boolean;
  onConfirm: (child: Child) => void;
  onDeleteRequest: (child: Child) => void;
}

function PendingTab({ children, processing, onConfirm, onDeleteRequest }: PendingTabProps) {
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-16 text-gray-400">
        <p className="text-sm">확인 필요한 아이가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm shadow-orange-50">
      <div className="border-b border-gray-100 px-5 py-3 text-xs font-semibold text-gray-400">
        HWP 업로드 시 자동 생성된 아이입니다. 확정 또는 삭제해 주세요.
      </div>
      <ul className="divide-y divide-gray-50">
        {children.map((child) => (
          <li key={child.id} className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-700">
              {child.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-800">{child.name}</p>
              {child.birthDate && (
                <p className="text-xs text-gray-400">{calcAge(child.birthDate)}</p>
              )}
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              PENDING
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={processing}
                onClick={() => onConfirm(child)}
                className="rounded-xl bg-[#FF9F66] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#f08c52] disabled:opacity-50"
              >
                확정
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => onDeleteRequest(child)}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
