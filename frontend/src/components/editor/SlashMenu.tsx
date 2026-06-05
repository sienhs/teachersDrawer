import { useEffect, useState } from 'react';
import type { Editor, JSONContent } from '@tiptap/react';
import { enrollmentApi } from '../../api/enrollment';
import type { Enrollment } from '../../types/enrollment';

interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const ITEMS: SlashMenuItem[] = [
  { id: 'children-table', label: '담당 아이 목록', description: '현재 반 아이들을 표로 삽입', icon: '📋' },
  { id: 'blank-table',    label: '빈 표',          description: '2×3 표 삽입',               icon: '📊' },
  { id: 'checklist',      label: '체크리스트',      description: 'taskList 삽입',             icon: '✅' },
];

interface Props {
  editor: Editor;
  position: { top: number; left: number };
  classroomId: number | null;
  onClose: () => void;
}

function textNodes(text: string): unknown[] {
  return text ? [{ type: 'text', text }] : [];
}

function fillTableWithChildren(
  json: { content?: Array<{ type: string; content?: unknown[] }> },
  enrollments: Enrollment[],
) {
  if (!json.content) return;
  const tables = json.content.filter((n) => n.type === 'table');
  if (tables.length === 0) return;
  const table = tables[tables.length - 1];
  const rows = (table.content ?? []) as Array<{
    content?: Array<{ content?: unknown[] }>;
  }>;

  if (rows[0]) {
    const headerCells = rows[0].content ?? [];
    ['이름', '비고'].forEach((t, ci) => {
      const cell = headerCells[ci] as { content?: unknown[] } | undefined;
      if (cell) cell.content = [{ type: 'paragraph', content: textNodes(t) }];
    });
  }

  enrollments.forEach((enr, ri) => {
    const row = rows[ri + 1];
    if (!row) return;
    const cells = row.content ?? [];
    const c0 = cells[0] as { content?: unknown[] } | undefined;
    const c1 = cells[1] as { content?: unknown[] } | undefined;
    if (c0) c0.content = [{ type: 'paragraph', content: textNodes(enr.childName) }];
    if (c1) c1.content = [{ type: 'paragraph', content: [] }];
  });
}

export default function SlashMenu({ editor, position, classroomId, onClose }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, ITEMS.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); void handleSelect(ITEMS[activeIdx]); }
      if (e.key === 'Escape')    { onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  // activeIdx는 핸들러 내부 참조라 린트 경고 무시 OK
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, onClose]);

  const handleSelect = async (item: SlashMenuItem) => {
    // "/" 문자 제거 후 메뉴 닫기
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    onClose();

    if (item.id === 'children-table') {
      if (!classroomId) return;
      setBusy(true);
      try {
        const enrollments: Enrollment[] = await enrollmentApi.listByClassroom(classroomId);
        const rows = enrollments.length + 1;
        editor.chain().focus().insertTable({ rows, cols: 2, withHeaderRow: true }).run();
        const json: JSONContent = editor.getJSON();
        fillTableWithChildren(
          json as unknown as { content?: Array<{ type: string; content?: unknown[] }> },
          enrollments,
        );
        editor.commands.setContent(json);
      } catch {
        // 목록 불러오기 실패 시 빈 표로 대체
        editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
      } finally {
        setBusy(false);
      }
    } else if (item.id === 'blank-table') {
      editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
    } else if (item.id === 'checklist') {
      editor.chain().focus().toggleTaskList().run();
    }
  };

  return (
    <div
      className="slash-menu-popup fixed z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-56 overflow-hidden"
      style={{ top: position.top, left: position.left }}
    >
      {busy ? (
        <div className="px-3 py-2 text-xs text-gray-400">목록 불러오는 중…</div>
      ) : (
        ITEMS.map((item, i) => (
          <button
            key={item.id}
            onClick={() => void handleSelect(item)}
            className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
              i === activeIdx ? 'bg-[#FFF0E6]' : 'hover:bg-[#FFF8F0]'
            }`}
          >
            <span className="text-base leading-none mt-0.5 shrink-0">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-800">{item.label}</div>
              <div className="text-xs text-gray-400">{item.description}</div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
