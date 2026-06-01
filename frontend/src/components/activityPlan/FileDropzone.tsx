import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { FileRejection } from 'react-dropzone';

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

interface Props {
  file: File | null;
  onFileSelected: (file: File) => void;
  onError: (msg: string) => void;
}

// HWP/HWPX 전용 파일 드롭존
export default function FileDropzone({ file, onFileSelected, onError }: Props) {
  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length > 0) {
        const first = rejected[0];
        if (first.errors.some((e) => e.code === 'file-too-large')) {
          onError('파일 크기는 50MB 이하여야 합니다.');
        } else if (first.errors.some((e) => e.code === 'wrong-ext')) {
          onError('.hwp 또는 .hwpx 파일만 업로드할 수 있습니다.');
        } else {
          onError('파일을 처리할 수 없습니다. .hwp 또는 .hwpx 파일을 사용해 주세요.');
        }
        return;
      }
      if (accepted.length > 0) {
        onFileSelected(accepted[0]);
        onError('');
      }
    },
    [onFileSelected, onError],
  );

  const validator = (f: File) => {
    const name = f.name.toLowerCase();
    if (!name.endsWith('.hwp') && !name.endsWith('.hwpx')) {
      return { code: 'wrong-ext', message: '.hwp 또는 .hwpx만 가능합니다.' };
    }
    return null;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_SIZE,
    validator,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragActive
          ? 'border-[#FF9F66] bg-orange-50'
          : 'border-gray-200 bg-gray-50 hover:border-[#FF9F66] hover:bg-orange-50/40'
      }`}
    >
      <input {...getInputProps()} />
      <div className="mb-3 text-3xl">{isDragActive ? '📂' : '📄'}</div>
      <p className="text-sm font-medium text-gray-700">
        {isDragActive ? '여기에 놓으세요!' : '파일을 여기에 끌어다 놓거나 클릭하세요'}
      </p>
      <p className="mt-1 text-xs text-gray-400">.hwp, .hwpx 파일 · 최대 50MB</p>
      {file && (
        <div className="mt-4 rounded-xl bg-white px-4 py-2.5 shadow-sm">
          <p className="text-sm font-semibold text-[#FF9F66]">선택됨: {file.name}</p>
          <p className="text-xs text-gray-400">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
      )}
    </div>
  );
}
