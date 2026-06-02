import { useEffect, useRef, useState } from 'react';
import { createEditor } from '@rhwp/editor';
import type { RhwpEditor } from '@rhwp/editor';
import Spinner from '../ui/Spinner';

interface Props {
  hwpBytes: Uint8Array;
  fileName: string;
  editable?: boolean;
  onChange?: (newBytes: Uint8Array) => void;
}

type Status = 'initializing' | 'ready' | 'error';

// rhwp에 onChange 이벤트가 없으므로 polling으로 변경 감지
// 샘플링 비교: 전체를 매번 비교하는 대신 1000 포인트 샘플링
function bytesChanged(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return true;
  const step = Math.max(1, Math.floor(a.length / 1000));
  for (let i = 0; i < a.length; i += step) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

export default function RhwpEmbed({ hwpBytes, fileName, editable, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<RhwpEditor | null>(null);
  const [status, setStatus] = useState<Status>('initializing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;
      try {
        const editor = await createEditor(containerRef.current);
        if (cancelled) {
          editor.destroy();
          return;
        }
        editorRef.current = editor;
        await editor.loadFile(hwpBytes, fileName);
        if (!cancelled) setStatus('ready');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setErrorMsg(String(e));
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [hwpBytes, fileName]);

  // 편집 모드 ON 시 3초 polling으로 변경 감지
  useEffect(() => {
    if (status !== 'ready' || !editable || !onChange) return;

    let baselineBytes: Uint8Array | null = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || !editorRef.current) return;
      try {
        const bytes = await editorRef.current.exportHwp();
        if (cancelled) return;
        if (baselineBytes === null) {
          baselineBytes = bytes;
          return;
        }
        if (bytesChanged(bytes, baselineBytes)) {
          baselineBytes = bytes;
          onChange(bytes);
        }
      } catch {
        // export 실패는 무시 (편집 중 일시적 실패 가능)
      }
    };

    const intervalId = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [status, editable, onChange]);

  return (
    <div className="relative h-full w-full bg-white">
      {status === 'initializing' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white">
          <Spinner />
          <p className="text-sm text-gray-400">HWP 뷰어 초기화 중… (최대 15초)</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6">
          <div className="text-center">
            <p className="text-2xl">❌</p>
            <p className="mt-2 text-sm font-semibold text-red-500">뷰어 로드 실패</p>
            {errorMsg && <p className="mt-1 text-xs text-gray-400">{errorMsg}</p>}
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
