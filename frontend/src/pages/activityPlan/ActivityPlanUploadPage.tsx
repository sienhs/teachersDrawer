import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { classroomApi } from '../../api/classroom';
import { activityPlanApi } from '../../api/activityPlan';
import FileDropzone from '../../components/activityPlan/FileDropzone';
import UploadProgressOverlay from '../../components/activityPlan/UploadProgressOverlay';
import type { Classroom } from '../../types/classroom';

export default function ActivityPlanUploadPage() {
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomId, setClassroomId] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    classroomApi
      .list('ACTIVE')
      .then(setClassrooms)
      .catch(() => {/* 필터용이므로 실패해도 무시 */});
  }, []);

  // 업로드 진행 중 페이지 이탈 경고
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  const handleUpload = async () => {
    if (!file) {
      setError('.hwp 또는 .hwpx 파일을 선택해 주세요.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const result = await activityPlanApi.upload(
        file,
        classroomId !== '' ? classroomId : undefined,
      );
      navigate(`/activity-plans/${result.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        '업로드에 실패했습니다. 파일을 확인해 주세요.';
      setError(msg);
      setUploading(false);
    }
  };

  return (
    <>
      {uploading && <UploadProgressOverlay />}

      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="뒤로 가기"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold text-gray-800">활동계획안 업로드</h1>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm shadow-orange-50 space-y-5">
          {/* 반 선택 */}
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

          {/* 파일 드롭존 */}
          <FileDropzone
            file={file}
            onFileSelected={setFile}
            onError={setFileError}
          />
          {fileError && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{fileError}</p>
          )}

          {/* 에러 */}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500">{error}</p>
          )}

          {/* 업로드 버튼 */}
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !file || !!fileError}
            className="w-full rounded-xl bg-[#FF9F66] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#f08c52] disabled:cursor-not-allowed disabled:opacity-60"
          >
            업로드하기
          </button>
        </div>
      </div>
    </>
  );
}
