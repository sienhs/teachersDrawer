/**
 * /_editor-slash-test — 슬래시 메뉴 + 자동완성 기초 PoC
 * Phase 4 Step 4-A-2: 2단계(슬래시 메뉴) + 3단계(자동완성)
 * 사이드바 미표시, URL 직접 입력으로만 접근
 */
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { useEffect, useRef, useState, useCallback } from 'react';
import { classroomApi } from '../../api/classroom';
import { enrollmentApi } from '../../api/enrollment';
import type { Classroom } from '../../types/classroom';
import type { Enrollment } from '../../types/enrollment';
import api from '../../api/instance';
import type { ApiResponse } from '../../types/auth';
import type { JSONContent } from '@tiptap/react';

// ── 슬래시 메뉴 아이템 정의 ────────────────────────────────────────────
interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
}

const SLASH_MENU_ITEMS: SlashMenuItem[] = [
  { id: 'children-table', label: '담당 아이 목록', description: '현재 반 아이들을 표로 삽입', icon: '👧' },
  { id: 'blank-table', label: '빈 표 삽입', description: '3행 2열 빈 표 삽입', icon: '⬛' },
];

// ── 슬래시 메뉴 팝업 컴포넌트 ─────────────────────────────────────────
interface SlashMenuPopupProps {
  items: SlashMenuItem[];
  position: { top: number; left: number };
  onSelect: (item: SlashMenuItem) => void;
  onClose: () => void;
}

function SlashMenuPopup({ items, position, onSelect, onClose }: SlashMenuPopupProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); onSelect(items[activeIdx]); }
      if (e.key === 'Escape')    { onClose(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [items, activeIdx, onSelect, onClose]);

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-56"
      style={{ top: position.top, left: position.left }}
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 ${i === activeIdx ? 'bg-blue-50' : ''}`}
        >
          <span className="text-base leading-none mt-0.5">{item.icon}</span>
          <div>
            <div className="text-sm font-medium text-gray-800">{item.label}</div>
            <div className="text-xs text-gray-400">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── 슬래시 감지 Tiptap Extension ──────────────────────────────────────
const slashPluginKey = new PluginKey('slash-menu');

function createSlashExtension(onSlash: (pos: { top: number; left: number }) => void, onClose: () => void) {
  return Extension.create({
    name: 'slashMenu',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: slashPluginKey,
          props: {
            handleKeyDown(view, event) {
              if (event.key === '/') {
                // "/" 키 입력 후 다음 프레임에 커서 위치 계산
                setTimeout(() => {
                  const { from } = view.state.selection;
                  const coords = view.coordsAtPos(from);
                  onSlash({ top: coords.bottom + 4, left: coords.left });
                }, 0);
                return false; // "/" 문자 입력은 허용
              }
              if (event.key === 'Escape') {
                onClose();
                return false;
              }
              return false;
            },
          },
        }),
      ];
    },
  });
}

// ── 자동완성: suggestions API ─────────────────────────────────────────
async function fetchSuggestions(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  try {
    const res = await api.get<ApiResponse<string[]>>('/api/activity-plans/suggestions', { params: { q } });
    return res.data.data ?? [];
  } catch {
    return [];
  }
}

// ── 메인 페이지 ──────────────────────────────────────────────────────
export default function EditorSlashTestPage() {
  // 반 선택
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null);
  const [classroomsLoading, setClassroomsLoading] = useState(false);

  // 슬래시 메뉴 상태
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isInsertingChildren, setIsInsertingChildren] = useState(false);

  // 자동완성 상태
  const [acQuery, setAcQuery] = useState('');
  const [acSuggestions, setAcSuggestions] = useState<string[]>([]);
  const [acLoading, setAcLoading] = useState(false);
  const acTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeSlashMenu = useCallback(() => setSlashMenuPos(null), []);

  // 슬래시 Extension 생성 (의존성: closeSlashMenu는 안정적)
  const [slashExt] = useState(() =>
    createSlashExtension((pos) => setSlashMenuPos(pos), closeSlashMenu)
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      slashExt,
    ],
    content: `<p>여기에 입력하세요. <strong>/</strong>를 입력하면 슬래시 메뉴가 나타납니다.</p>`,
    // 에디터 클릭 시 슬래시 메뉴 닫기
    onFocus() { /* keep open until item selected */ },
  });

  // 에디터 바깥 클릭 시 슬래시 메뉴 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.slash-menu-popup') && !target.closest('.ProseMirror')) {
        closeSlashMenu();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeSlashMenu]);

  // 반 목록 로드
  useEffect(() => {
    setClassroomsLoading(true);
    classroomApi.list('ACTIVE').then((list) => {
      setClassrooms(list);
      if (list.length > 0) setSelectedClassroomId(list[0].id);
    }).catch(console.error).finally(() => setClassroomsLoading(false));
  }, []);

  // 자동완성 debounce
  useEffect(() => {
    if (acTimerRef.current) clearTimeout(acTimerRef.current);
    if (acQuery.trim().length < 2) { setAcSuggestions([]); return; }
    acTimerRef.current = setTimeout(async () => {
      setAcLoading(true);
      const results = await fetchSuggestions(acQuery);
      setAcSuggestions(results);
      setAcLoading(false);
    }, 300);
  }, [acQuery]);

  // 슬래시 메뉴 아이템 선택 처리
  const handleSlashSelect = async (item: SlashMenuItem) => {
    setSlashMenuPos(null);
    if (!editor) return;

    // "/" 문자 삭제 (커서 바로 앞의 "/" 제거)
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();

    if (item.id === 'children-table') {
      if (!selectedClassroomId) {
        alert('먼저 반을 선택해 주세요.');
        return;
      }
      setIsInsertingChildren(true);
      try {
        const enrollments: Enrollment[] = await enrollmentApi.listByClassroom(selectedClassroomId);
        // 헤더(이름/비고) + 아이 수 만큼 행
        const rows = enrollments.length + 1;
        editor.chain().focus().insertTable({ rows, cols: 2, withHeaderRow: true }).run();

        // Tiptap 표 삽입 후 셀에 텍스트 채우기
        // insertTable 직후 헤더 셀에 포커스가 있으므로 Tab으로 이동하며 텍스트 입력
        // Tiptap에서 표 셀 내용을 직접 설정하는 API가 없어 setContent로 전체 교체
        const currentJson = editor.getJSON();
        fillTableWithChildren(currentJson, enrollments);
        editor.commands.setContent(currentJson as JSONContent);
      } catch (e) {
        console.error('아이 목록 불러오기 실패', e);
      } finally {
        setIsInsertingChildren(false);
      }
    } else if (item.id === 'blank-table') {
      editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
    }
  };

  // 자동완성 항목 선택
  const handleAcSelect = (text: string) => {
    if (!editor) return;
    editor.chain().focus().insertContent(text).run();
    setAcQuery('');
    setAcSuggestions([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-mono text-sm">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">슬래시 메뉴 + 자동완성 PoC</h1>
          <p className="text-xs text-gray-500 mt-1">Phase 4 Step 4-A-2 — 2단계(슬래시 메뉴) + 3단계(자동완성)</p>
        </div>

        {/* 반 선택 */}
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-white border border-gray-200 p-3">
          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">담당 반</label>
          {classroomsLoading ? (
            <span className="text-xs text-gray-400">로딩 중…</span>
          ) : classrooms.length === 0 ? (
            <span className="text-xs text-red-400">반 없음 (로그인 필요 또는 반 미등록)</span>
          ) : (
            <select
              value={selectedClassroomId ?? ''}
              onChange={(e) => setSelectedClassroomId(Number(e.target.value))}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 bg-white"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.year}년)</option>
              ))}
            </select>
          )}
          <span className="text-xs text-gray-400">← 슬래시 메뉴 "담당 아이 목록"에서 사용</span>
        </div>

        {/* 에디터 */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-1 uppercase">에디터 (/ 입력 → 슬래시 메뉴)</div>
          <div className="rounded-lg border border-gray-300 bg-white min-h-[200px] p-4 relative">
            <EditorContent editor={editor} />
            {isInsertingChildren && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs text-gray-500">
                아이 목록 삽입 중…
              </div>
            )}
          </div>
        </div>

        {/* 슬래시 메뉴 팝업 */}
        {slashMenuPos && (
          <div className="slash-menu-popup">
            <SlashMenuPopup
              items={SLASH_MENU_ITEMS}
              position={slashMenuPos}
              onSelect={handleSlashSelect}
              onClose={closeSlashMenu}
            />
          </div>
        )}

        {/* ── 3단계: 자동완성 기초 ── */}
        <div className="mt-6 rounded-lg bg-white border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">
            자동완성 기초 — 과거 활동계획안 문장 검색
          </h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={acQuery}
              onChange={(e) => setAcQuery(e.target.value)}
              placeholder="검색어 입력 (예: 등원, 점심, 바깥놀이)"
              className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 placeholder-gray-300"
            />
            {acLoading && <span className="text-xs text-gray-400 self-center">검색 중…</span>}
          </div>

          {acSuggestions.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-gray-400 mb-1">{acSuggestions.length}개 결과 — 클릭 시 에디터에 삽입</div>
              {acSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleAcSelect(s)}
                  className="block w-full text-left rounded border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:border-blue-200 truncate"
                  title={s}
                >
                  {s.length > 100 ? s.slice(0, 100) + '…' : s}
                </button>
              ))}
            </div>
          )}

          {acQuery.trim().length >= 2 && !acLoading && acSuggestions.length === 0 && (
            <p className="text-xs text-gray-400">결과 없음 (백엔드 API 미구현 시 빈 배열 반환)</p>
          )}
        </div>

        {/* 검증 체크리스트 */}
        <div className="mt-4 rounded-lg bg-white border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">검증 체크리스트</h2>
          <ul className="text-xs space-y-1 text-gray-700">
            <li>[ ] 반 선택 드롭다운 동작</li>
            <li>[ ] 에디터에 / 입력 → 팝업 표시</li>
            <li>[ ] "담당 아이 목록" 클릭 → 해당 반 아이들 표 삽입</li>
            <li>[ ] "빈 표 삽입" 클릭 → 빈 표 삽입</li>
            <li>[ ] 자동완성: "등원" 입력 → 과거 섹션 내용 표시 (백엔드 API 필요)</li>
            <li>[ ] 자동완성: 클릭 시 에디터에 삽입</li>
          </ul>
        </div>
      </div>

      <style>{`
        .ProseMirror {
          outline: none;
          min-height: 160px;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
        }
        .ProseMirror table td, .ProseMirror table th {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          min-width: 60px;
          vertical-align: top;
        }
        .ProseMirror table th {
          background: #f3f4f6;
          font-weight: 600;
        }
        .ProseMirror p { margin: 4px 0; }
        .selectedCell { background: #dbeafe; }
      `}</style>
    </div>
  );
}

// ProseMirror text node는 빈 문자열 불가 → 비어있으면 content: []
function textNodes(text: string): unknown[] {
  return text ? [{ type: 'text', text }] : [];
}

// Tiptap JSON의 마지막 table 노드 셀에 아이 이름 채우기
function fillTableWithChildren(json: { content?: Array<{ type: string; content?: unknown[] }> }, enrollments: Enrollment[]) {
  if (!json.content) return;
  const tables = json.content.filter((n) => n.type === 'table');
  if (tables.length === 0) return;
  const table = tables[tables.length - 1];
  const rows = (table.content ?? []) as Array<{ type: string; content?: Array<{ type: string; content?: unknown[] }> }>;

  // 헤더 행 (row 0)
  if (rows[0]) {
    const headerCells = rows[0].content ?? [];
    ['이름', '비고'].forEach((t, ci) => {
      if (headerCells[ci]) {
        (headerCells[ci] as { content: unknown[] }).content = [
          { type: 'paragraph', content: textNodes(t) },
        ];
      }
    });
  }

  // 데이터 행 (row 1부터)
  enrollments.forEach((enr, ri) => {
    const row = rows[ri + 1];
    if (!row) return;
    const cells = row.content ?? [];
    if (cells[0]) (cells[0] as { content: unknown[] }).content = [{ type: 'paragraph', content: textNodes(enr.childName) }];
    if (cells[1]) (cells[1] as { content: unknown[] }).content = [{ type: 'paragraph', content: [] }];
  });
}
