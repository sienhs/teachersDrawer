import Spinner from '../ui/Spinner';

// 업로드/HWP 분석 중 전체 화면 오버레이
export default function UploadProgressOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-xl">
        <Spinner className="h-8 w-8" />
        <p className="text-sm font-semibold text-gray-700">HWP를 분석하고 있습니다…</p>
        <p className="text-xs text-gray-400">잠시만 기다려 주세요.</p>
      </div>
    </div>
  );
}
