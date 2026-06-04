/**
 * /_tiptap-test — Tiptap 기본 동작 확인 (Step 4-A-1 2단계)
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useState } from 'react';

export default function TiptapTestPage() {
  const [jsonOutput, setJsonOutput] = useState<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    content: `<h2>Tiptap 에디터 테스트</h2><p>여기에 텍스트를 입력하세요.</p>`,
    onUpdate({ editor }) {
      setJsonOutput(JSON.stringify(editor.getJSON(), null, 2));
    },
  });

  const insertTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
  };

  const getJson = () => {
    if (editor) setJsonOutput(JSON.stringify(editor.getJSON(), null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-mono text-sm">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Tiptap 기본 테스트</h1>
          <p className="text-xs text-gray-500 mt-1">Phase 4 Step 4-A-1 — 2단계</p>
        </div>

        {/* 툴바 */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`rounded px-3 py-1 text-xs font-semibold border ${editor?.isActive('bold') ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            굵게
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`rounded px-3 py-1 text-xs font-semibold border ${editor?.isActive('heading', { level: 2 }) ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            H2
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`rounded px-3 py-1 text-xs font-semibold border ${editor?.isActive('bulletList') ? 'bg-gray-800 text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            목록
          </button>
          <button
            onClick={insertTable}
            className="rounded px-3 py-1 text-xs font-semibold border bg-blue-600 text-white hover:bg-blue-700"
          >
            표 삽입 (3×2)
          </button>
          {editor?.isActive('table') && (
            <>
              <button
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="rounded px-3 py-1 text-xs font-semibold border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                행 추가
              </button>
              <button
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="rounded px-3 py-1 text-xs font-semibold border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                열 추가
              </button>
              <button
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="rounded px-3 py-1 text-xs font-semibold border bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
              >
                표 삭제
              </button>
            </>
          )}
          <button
            onClick={getJson}
            className="rounded px-3 py-1 text-xs font-semibold border bg-emerald-600 text-white hover:bg-emerald-700 ml-auto"
          >
            JSON 출력
          </button>
        </div>

        {/* 에디터 */}
        <div className="rounded-lg border border-gray-300 bg-white min-h-[200px] p-4 mb-4 prose prose-sm max-w-none focus-within:ring-2 focus-within:ring-blue-400">
          <EditorContent editor={editor} />
        </div>

        {/* JSON 출력 */}
        {jsonOutput && (
          <details open>
            <summary className="cursor-pointer text-xs font-semibold text-gray-600 mb-2 hover:text-gray-800">
              editor.getJSON() — {jsonOutput.length.toLocaleString()}자
            </summary>
            <pre className="rounded bg-gray-900 text-green-300 p-4 text-[11px] overflow-x-auto max-h-96 leading-relaxed">
              {jsonOutput}
            </pre>
          </details>
        )}

        {/* 체크리스트 */}
        <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">검증 체크리스트</h2>
          <ul className="text-xs space-y-1 text-gray-700">
            <li>✅ Tiptap 에디터 렌더링</li>
            <li>✅ 텍스트 입력</li>
            <li>✅ 굵게/제목/목록 서식</li>
            <li>✅ 표 삽입 (extension-table)</li>
            <li>✅ 표 내 편집 (행/열 추가)</li>
            <li>✅ editor.getJSON() 출력</li>
            <li className="text-gray-400">— 슬래시 메뉴: 이 단계에서 생략 (공식 확장 별도 필요)</li>
          </ul>
        </div>
      </div>

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 150px;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          min-width: 80px;
          vertical-align: top;
        }
        .ProseMirror table th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .ProseMirror p { margin: 4px 0; }
        .ProseMirror h2 { font-size: 1.2em; font-weight: 700; margin: 8px 0 4px; }
        .ProseMirror ul { padding-left: 20px; }
        .ProseMirror li { margin: 2px 0; }
        .selectedCell { background: #dbeafe; }
      `}</style>
    </div>
  );
}
