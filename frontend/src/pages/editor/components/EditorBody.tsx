import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { mergeAttributes } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextAlign } from '@tiptap/extension-text-align';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextStyle, FontSize } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import type { Editor } from '@tiptap/react';
import SlashMenu from '../../../components/editor/SlashMenu';
import api from '../../../api/instance';
import type { ApiResponse } from '../../../types/auth';

// ── HWP 보존 가능한 셀 속성: padding / 행 높이 / 수직 정렬 ──────────────────
// backgroundColor·borderColor·borderWidth 는 rhwp/core 미지원(한컴 저장 후 소멸) → 제거
const CUSTOM_CELL_KEYS = new Set([
  'cellPaddingLeft', 'cellPaddingRight', 'cellPaddingTop', 'cellPaddingBottom',
  'cellHeight', 'cellVerticalAlign',
]);

function stripCellKeys(htmlAttrs: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(htmlAttrs).filter(([k]) => !CUSTOM_CELL_KEYS.has(k)));
}

const CELL_EXTRA_ATTRS = {
  addAttributes() {
    return {
      ...((this as { parent?: () => Record<string, unknown> }).parent?.() ?? {}),
      cellPaddingLeft: {
        default: null,
        parseHTML: (el: HTMLElement) => { const m = el.style.paddingLeft?.match(/^([\d.]+)pt$/); return m ? parseFloat(m[1]) : null; },
        renderHTML: (attrs: Record<string, unknown>) => attrs.cellPaddingLeft != null ? { style: `padding-left: ${attrs.cellPaddingLeft}pt` } : {},
      },
      cellPaddingRight: {
        default: null,
        parseHTML: (el: HTMLElement) => { const m = el.style.paddingRight?.match(/^([\d.]+)pt$/); return m ? parseFloat(m[1]) : null; },
        renderHTML: (attrs: Record<string, unknown>) => attrs.cellPaddingRight != null ? { style: `padding-right: ${attrs.cellPaddingRight}pt` } : {},
      },
      cellPaddingTop: {
        default: null,
        parseHTML: (el: HTMLElement) => { const m = el.style.paddingTop?.match(/^([\d.]+)pt$/); return m ? parseFloat(m[1]) : null; },
        renderHTML: (attrs: Record<string, unknown>) => attrs.cellPaddingTop != null ? { style: `padding-top: ${attrs.cellPaddingTop}pt` } : {},
      },
      cellPaddingBottom: {
        default: null,
        parseHTML: (el: HTMLElement) => { const m = el.style.paddingBottom?.match(/^([\d.]+)pt$/); return m ? parseFloat(m[1]) : null; },
        renderHTML: (attrs: Record<string, unknown>) => attrs.cellPaddingBottom != null ? { style: `padding-bottom: ${attrs.cellPaddingBottom}pt` } : {},
      },
      cellHeight: {
        default: null,
        parseHTML: (el: HTMLElement) => { const m = el.style.minHeight?.match(/^([\d.]+)pt$/); return m ? parseFloat(m[1]) : null; },
        renderHTML: (attrs: Record<string, unknown>) => attrs.cellHeight != null ? { style: `min-height: ${attrs.cellHeight}pt` } : {},
      },
      cellVerticalAlign: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const css = el.style.verticalAlign;
          if (!css) return null;
          return css === 'middle' ? 'center' : css;
        },
        renderHTML: (attrs: Record<string, unknown>) => {
          if (!attrs.cellVerticalAlign) return {};
          const cssVa = attrs.cellVerticalAlign === 'center' ? 'middle' : String(attrs.cellVerticalAlign);
          return { style: `vertical-align: ${cssVa}` };
        },
      },
    };
  },
};

const CustomTableCell = TableCell.extend({
  ...CELL_EXTRA_ATTRS,
  renderHTML({ HTMLAttributes }) {
    return ['td', mergeAttributes(this.options.HTMLAttributes ?? {}, stripCellKeys(HTMLAttributes as Record<string, unknown>)), 0];
  },
});

const CustomTableHeader = TableHeader.extend({
  ...CELL_EXTRA_ATTRS,
  renderHTML({ HTMLAttributes }) {
    return ['th', mergeAttributes(this.options.HTMLAttributes ?? {}, stripCellKeys(HTMLAttributes as Record<string, unknown>)), 0];
  },
});

interface Props {
  classroomId: number | null;
  onEditorReady: (editor: Editor | null) => void;
}

async function fetchSuggestions(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  try {
    const res = await api.get<ApiResponse<string[]>>('/api/activity-plans/suggestions', { params: { q } });
    return res.data.data ?? [];
  } catch {
    return [];
  }
}

export default function EditorBody({ classroomId, onEditorReady }: Props) {
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const closeSlashMenu = useCallback(() => setSlashMenuPos(null), []);

  const [acSuggestions, setAcSuggestions] = useState<string[]>([]);
  const [acPos, setAcPos] = useState<{ top: number; left: number } | null>(null);
  const [acActiveIdx, setAcActiveIdx] = useState(0);
  const acTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableCell,
      CustomTableHeader,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Highlight.configure({ multicolor: true }),
    ],
    content: '<p></p>',
  });

  useEffect(() => {
    onEditorReady(editor ?? null);
    return () => onEditorReady(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from } = editor.state.selection;
      const $pos = editor.state.doc.resolve(from);
      const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset);

      if (textBefore.endsWith('/')) {
        const coords = editor.view.coordsAtPos(from);
        setSlashMenuPos({ top: coords.bottom + 4, left: coords.left });
        setAcSuggestions([]);
        setAcPos(null);
        if (acTimerRef.current) clearTimeout(acTimerRef.current);
        return;
      }
      setSlashMenuPos(null);

      const acMatch = textBefore.match(/(\S{2,})$/);
      const word = acMatch?.[1] ?? '';
      if (!word || word.startsWith('/')) {
        setAcSuggestions([]);
        setAcPos(null);
        if (acTimerRef.current) clearTimeout(acTimerRef.current);
        return;
      }

      const coords = editor.view.coordsAtPos(from);
      setAcPos({ top: coords.bottom + 4, left: coords.left });
      setAcActiveIdx(0);

      if (acTimerRef.current) clearTimeout(acTimerRef.current);
      acTimerRef.current = setTimeout(async () => {
        const results = await fetchSuggestions(word);
        setAcSuggestions(results.slice(0, 5));
      }, 300);
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
      if (acTimerRef.current) clearTimeout(acTimerRef.current);
    };
  }, [editor]);

  useEffect(() => {
    if (acSuggestions.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcActiveIdx(i => Math.min(i + 1, acSuggestions.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAcActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); handleAcSelect(acSuggestions[acActiveIdx]); }
      if (e.key === 'Escape')    { setAcSuggestions([]); setAcPos(null); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acSuggestions, acActiveIdx]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!t.closest('.slash-menu-popup') && !t.closest('.ac-dropdown') && !t.closest('.ProseMirror')) {
        closeSlashMenu();
        setAcSuggestions([]);
        setAcPos(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeSlashMenu]);

  const handleAcSelect = (text: string) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    const $pos = editor.state.doc.resolve(from);
    const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset);
    const wordMatch = textBefore.match(/\S+$/);
    const wordLen = wordMatch?.[0]?.length ?? 0;
    if (wordLen > 0) {
      editor.chain().focus().deleteRange({ from: from - wordLen, to: from }).insertContent(text).run();
    } else {
      editor.chain().focus().insertContent(text).run();
    }
    setAcSuggestions([]);
    setAcPos(null);
  };

  return (
    <div className="relative">
      {/* 흰색 종이 — A4 비슷한 비율, 중앙 정렬 */}
      <div
        style={{
          maxWidth: 830,
          margin: '0 auto',
          background: '#FFFFFF',
          boxShadow: '0 2px 16px rgba(0,0,0,0.22)',
          minHeight: 1100,
          padding: '80px 90px 100px',
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {slashMenuPos && editor && (
        <SlashMenu
          editor={editor}
          position={slashMenuPos}
          classroomId={classroomId}
          onClose={closeSlashMenu}
        />
      )}

      {acSuggestions.length > 0 && acPos && (
        <div
          className="ac-dropdown fixed z-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-max"
          style={{ top: acPos.top, left: acPos.left, maxWidth: 360 }}
        >
          {acSuggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleAcSelect(s)}
              className={`block w-full text-left px-3 py-1.5 text-xs text-gray-700 truncate transition-colors ${
                i === acActiveIdx ? 'bg-[#FFF0E6]' : 'hover:bg-[#FFF8F0]'
              }`}
              title={s}
            >
              {s.length > 80 ? s.slice(0, 80) + '…' : s}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 800px;
          font-size: 11pt;
          line-height: 1.7;
          font-family: '함초롬바탕', '바탕', serif;
          color: #1a1a1a;
        }
        .ProseMirror p { margin: 4px 0; }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          font-weight: 700;
          margin: 12px 0 4px;
        }
        .ProseMirror h1 { font-size: 1.5em; }
        .ProseMirror h2 { font-size: 1.25em; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
        }
        .ProseMirror table td, .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 6px 10px;
          min-width: 60px;
          vertical-align: top;
        }
        .ProseMirror table th { background: #f9fafb; font-weight: 600; }
        .ProseMirror .selectedCell { background: #fff0e6; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.5em; margin: 4px 0; }
        .ProseMirror ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .ProseMirror ul[data-type="taskList"] > li {
          display: flex; align-items: flex-start; gap: 8px;
        }
        .ProseMirror ul[data-type="taskList"] > li > label { flex-shrink: 0; margin-top: 3px; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        /* 컬럼 리사이즈 핸들 */
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px; top: 0; bottom: -2px;
          width: 4px;
          background: #FF9F66;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .ProseMirror table:hover .column-resize-handle,
        .ProseMirror.resize-cursor .column-resize-handle { opacity: 1; }
        .ProseMirror.resize-cursor { cursor: col-resize; }
      `}</style>
    </div>
  );
}
