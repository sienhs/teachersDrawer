import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { classroomApi } from '../../api/classroom';
import { activityPlanApi } from '../../api/activityPlan';
import { convertEditorToHwp } from '../../lib/hwp/bridge';
import AnalysisConfirmModal from '../../components/activityPlan/AnalysisConfirmModal';
import EditorToolbar from './components/EditorToolbar';
import EditorBody from './components/EditorBody';
import HwpToolbar from './components/HwpToolbar';
import type { ActivityPlanAnalysis, ActivityPlanConfirmRequest } from '../../types/activityPlan';
import type { ParsedActivityPlan } from '../../lib/hwp/types';

function buildParsedPlan(title: string): ParsedActivityPlan {
  return {
    planDate: new Date().toISOString().slice(0, 10),
    subject: title,
    teacherName: '',
    classNameRaw: '',
    classTimeRaw: '',
    classDayCount: 0,
    sections: [],
    montessoriRecords: [],
    rawJson: JSON.stringify({ source: 'editor', title }),
  };
}

function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EditorPage() {
  const navigate = useNavigate();
  const editorRef = useRef<Editor | null>(null);
  // HwpToolbar에 전달하기 위해 editor를 state로도 보관
  const [editor, setEditor] = useState<Editor | null>(null);

  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysis, setAnalysis] = useState<ActivityPlanAnalysis | null>(null);
  const [error, setError] = useState('');

  const [classroomId, setClassroomId] = useState<number | null>(null);
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    classroomApi.list('ACTIVE').then((list) => {
      if (list.length > 0) setClassroomId(list[0].id);
    }).catch(() => {});
  }, []);

  const handleEditorReady = useCallback((e: Editor | null) => {
    editorRef.current = e;
    setEditor(e);
  }, []);

  const handleSaveAsHwp = async () => {
    const ed = editorRef.current;
    if (!ed) return;
    setError('');
    setSaving(true);
    try {
      const json: JSONContent = ed.getJSON();
      const hwpBytes = await convertEditorToHwp(json);
      const file = new File(
        [hwpBytes.buffer as ArrayBuffer],
        `${title.trim() || '새 문서'}.hwp`,
        { type: 'application/x-hwp' },
      );
      const parsed = buildParsedPlan(title.trim() || '새 문서');
      const result = await activityPlanApi.analyze(file, parsed);
      setAnalysis(result);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'HWP 저장에 실패했습니다.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    const ed = editorRef.current;
    if (!ed) return;
    setExporting(true);
    try {
      const bytes = await convertEditorToHwp(ed.getJSON());
      downloadBytes(bytes, `${title.trim() || '새 문서'}.hwp`);
    } catch {
      setError('HWP 내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const handleConfirm = async (request: ActivityPlanConfirmRequest) => {
    const result = await activityPlanApi.confirm(request);
    window.dispatchEvent(new CustomEvent('activity-plans-changed'));
    navigate(`/activity-plans/${result.id}`);
  };

  const handleCancel = async () => {
    if (analysis) {
      try { await activityPlanApi.cancelTemp(analysis.fileKey); } catch { /* ignore */ }
    }
    setAnalysis(null);
  };

  return (
    <>
      {analysis && (
        <AnalysisConfirmModal
          analysis={analysis}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      {/*
        px-8 py-7 = margin 32px left/right, 28px top 을 음수 마진으로 상쇄.
        전체 height: 100vh — 뷰포트 전체를 덮는 편집기 레이아웃.
      */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          margin: '-28px -32px 0 -32px',
          overflow: 'hidden',
        }}
      >
        {/* [1] 제목 바 */}
        <EditorToolbar
          title={title}
          onTitleChange={setTitle}
          onBack={() => navigate(-1)}
          onSave={() => void handleSaveAsHwp()}
          onExport={() => void handleExport()}
          saving={saving}
          exporting={exporting}
        />

        {/* [2] 3단 툴바 — 전체 폭 */}
        <HwpToolbar
          editor={editor}
          onSave={() => void handleSaveAsHwp()}
          onExport={() => void handleExport()}
        />

        {/* [3] 오류 */}
        {error && (
          <div style={{ flexShrink: 0, background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', padding: '8px 16px', fontSize: 13, color: '#DC2626' }}>
            {error}
          </div>
        )}

        {/* [4] 캔버스 영역 — 회색 배경, 스크롤 */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            background: '#BEBEBE',
            padding: '32px 24px 48px',
          }}
        >
          <EditorBody classroomId={classroomId} onEditorReady={handleEditorReady} />
        </div>
      </div>
    </>
  );
}
