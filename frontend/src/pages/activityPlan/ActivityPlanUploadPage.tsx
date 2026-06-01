import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomApi } from '../../api/classroom';
import { activityPlanApi } from '../../api/activityPlan';
import FileDropzone from '../../components/activityPlan/FileDropzone';
import UploadProgressOverlay from '../../components/activityPlan/UploadProgressOverlay';
import AnalysisConfirmModal from '../../components/activityPlan/AnalysisConfirmModal';
import type { Classroom } from '../../types/classroom';
import type { ActivityPlanAnalysis, ActivityPlanConfirmRequest } from '../../types/activityPlan';

export default function ActivityPlanUploadPage() {
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ActivityPlanAnalysis | null>(null);
  const [error, setError] = useState('');

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    classroomApi
      .list('ACTIVE')
      .then(setClassrooms)
      .catch(() => {});
  }, []);

  // 분석 중 이탈 경고
  useEffect(() => {
    if (!analyzing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [analyzing]);

  // 1단계: 분석 요청 → 모달 열기
  const handleAnalyze = async () => {
    if (!file) {
      setError('.hwp 또는 .hwpx 파일을 선택해 주세요.');
      return;
    }
    setError('');
    setAnalyzing(true);
    try {
      const result = await activityPlanApi.analyze(
        file,
        classroomId !== '' ? classroomId : undefined,
      );
      setAnalysis(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'HWP 분석에 실패했습니다. 파일을 확인해 주세요.';
      setError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // 2단계: 수락 → 확정 저장
  const handleConfirm = async (request: ActivityPlanConfirmRequest) => {
    const result = await activityPlanApi.confirm(request);
    navigate(`/activity-plans/${result.id}`);
  };

  // 거부 → 임시 파일 삭제 후 초기화
  const handleCancel = async () => {
    if (analysis) {
      try {
        await activityPlanApi.cancelTemp(analysis.fileKey);
      } catch {
        // 삭제 실패해도 UI는 닫음
      }
    }
    setAnalysis(null);
    setFile(null);
  };

  return (
    <>
      {analyzing && <UploadProgressOverlay />}

      {analysis && (
        <AnalysisConfirmModal
          analysis={analysis}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="뒤로 가기"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-800">활동계획안 업로드</h1>
        </div>

        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm shadow-orange-50">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
              어떤 반의 활동계획안인가요?
              <span className="ml-1 text-xs text-gray-400">(선택 사항 — 파일에서 자동 매칭)</span>
            </label>
            <select
              value={classroomId}
              onChange={(e) =>
                setClassroomId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:border-[#FF9F66] focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              <option value="">자동 매칭</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.year}년 {c.name}
                </option>
              ))}
            </select>
          </div>

          <FileDropzone
            file={file}
            onFileSelected={setFile}
            onError={setFileError}
          />
          {fileError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{fileError}</p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !file || !!fileError}
            className="w-full rounded-xl bg-[#FF9F66] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52] disabled:cursor-not-allowed disabled:opacity-60"
          >
            업로드하기
          </button>
        </div>
      </div>
    </>
  );
}
