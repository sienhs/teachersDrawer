import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { activityPlanApi } from '../../api/activityPlan';
import SectionCard from '../../components/activityPlan/SectionCard';
import MontessoriTable from '../../components/activityPlan/MontessoriTable';
import RhwpViewerPanel from '../../components/activityPlan/RhwpViewerPanel';
import Spinner from '../../components/ui/Spinner';
import type { ActivityPlanDetail } from '../../types/activityPlan';

function formatDate(d?: string | null): string {
  if (!d) return '';
  try {
    return format(parseISO(d), 'yyyy년 M월 d일 (EEE)', { locale: ko });
  } catch {
    return d;
  }
}

// blob 다운로드 트리거
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ActivityPlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<ActivityPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    if (!planId) return;
    activityPlanApi
      .get(Number(planId))
      .then(setDetail)
      .catch(() => setError('활동계획안을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [planId]);

  const handleDownload = async () => {
    if (!planId || downloading) return;
    setDownloading(true);
    try {
      const { blob, filename } = await activityPlanApi.downloadFile(Number(planId));
      triggerDownload(blob, filename);
    } catch {
      alert('다운로드에 실패했습니다.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!planId || deleting) return;
    setDeleting(true);
    try {
      await activityPlanApi.delete(Number(planId));
      navigate('/activity-plans');
    } catch {
      alert('삭제에 실패했습니다.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-500">
        {error || '데이터를 불러올 수 없습니다.'}
      </div>
    );
  }

  const metaParts = [
    detail.classNameRaw,
    detail.teacherName,
    detail.classTimeRaw,
    detail.classDayCount != null ? `수업일수 ${detail.classDayCount}일` : null,
  ].filter(Boolean);

  return (
    <>
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-gray-800">활동계획안을 삭제할까요?</h2>
            <p className="mt-2 text-sm text-gray-500">
              원본 HWP 파일도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AppLayout p-6을 취소하고 h=[calc(100vh-88px)]로 뷰포트를 채움 (88px = header h-16 + pt-6) */}
      <div className="flex -mx-6 -mb-6 overflow-hidden h-[calc(100vh-88px)]">
        {/* 좌측: 기존 정리화면 */}
        <div className="flex-1 min-w-0 overflow-y-auto px-6 pt-0 pb-6 space-y-5">
        {/* 상단 바 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/activity-plans')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#FF9F66] transition-colors"
          >
            ← 목록으로
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-xl bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-orange-50 hover:text-[#FF9F66] transition-colors disabled:opacity-60"
            >
              {downloading ? '다운로드 중…' : '원본 다운로드'}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-100 transition-colors"
            >
              삭제
            </button>
          </div>
        </div>

        {/* 헤더 정보 */}
        <div className="rounded-2xl bg-white p-6 shadow-sm shadow-orange-50">
          <p className="text-sm text-gray-400">{formatDate(detail.planDate)}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-800">
            {detail.subject || '주제 미입력'}
          </h1>
          {metaParts.length > 0 && (
            <p className="mt-1 text-sm text-[#FF9F66]">{metaParts.join(' · ')}</p>
          )}
        </div>

        {/* 2단 레이아웃 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* 시간대별 활동 */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-orange-50 space-y-3">
            <h2 className="text-base font-bold text-gray-800">
              시간대별 활동 ({detail.sections.length})
            </h2>
            {detail.sections.length === 0 ? (
              <p className="text-sm text-gray-400">시간대별 활동이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {detail.sections.map((section, idx) => (
                  <SectionCard key={section.id} section={section} initialOpen={idx === 0} />
                ))}
              </div>
            )}
          </div>

          {/* 몬테소리 */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-orange-50 space-y-3">
            <h2 className="text-base font-bold text-gray-800">
              몬테소리 활동 ({detail.montessoriRecords.length}명)
            </h2>
            <MontessoriTable records={detail.montessoriRecords} />
          </div>
        </div>
        </div>{/* 좌측 끝 */}

        {/* 우측: rhwp 뷰어 사이드 패널 */}
        <RhwpViewerPanel planId={detail.id} fileName={detail.fileName} classroomId={detail.classroomId} />
      </div>
    </>
  );
}
