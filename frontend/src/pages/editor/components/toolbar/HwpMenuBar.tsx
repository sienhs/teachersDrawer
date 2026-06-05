import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { ChevronDown } from 'lucide-react';

// ── 스타일 상수 ─────────────────────────────────────────────────────────────

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: '#F0F0F0',
  borderBottom: '1px solid #D1D5DB',
  padding: '2px 6px',
  gap: 0,
  userSelect: 'none',
  flexShrink: 0,
  position: 'relative',
};

const MENU_BTN_STYLE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
  padding: '2px 8px',
  fontSize: 12,
  fontWeight: 400,
  color: '#1F2937',
  background: 'transparent',
  border: 'none',
  borderRadius: 2,
  cursor: 'pointer',
  height: 24,
  outline: 'none',
  whiteSpace: 'nowrap',
};

const DROPDOWN_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  minWidth: 180,
  background: '#FFFFFF',
  border: '1px solid #D1D5DB',
  borderRadius: 4,
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  zIndex: 200,
  padding: '4px 0',
};

const ITEM_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: '4px 14px',
  fontSize: 12,
  color: '#1F2937',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ITEM_DISABLED_STYLE: React.CSSProperties = {
  ...ITEM_STYLE,
  color: '#9CA3AF',
  cursor: 'default',
};

const SEP_STYLE: React.CSSProperties = {
  height: 1,
  background: '#E5E7EB',
  margin: '4px 0',
};

// ── 아이템 컴포넌트 ──────────────────────────────────────────────────────────

interface MenuItemDef {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  action?: () => void;
}

function MenuItem({ item, onDone }: { item: MenuItemDef; onDone: () => void }) {
  if (item.disabled) {
    return (
      <button style={ITEM_DISABLED_STYLE} disabled title="준비 중">
        <span>{item.label}</span>
        {item.shortcut && <span style={{ color: '#9CA3AF', fontSize: 11 }}>{item.shortcut}</span>}
      </button>
    );
  }
  return (
    <button
      style={ITEM_STYLE}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFF0E6'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
      onMouseDown={e => {
        e.preventDefault();
        item.action?.();
        onDone();
      }}
    >
      <span>{item.label}</span>
      {item.shortcut && <span style={{ color: '#9CA3AF', fontSize: 11 }}>{item.shortcut}</span>}
    </button>
  );
}

// ── 메뉴 wrapper ─────────────────────────────────────────────────────────────

interface MenuProps {
  id: string;
  label: string;
  items: (MenuItemDef | 'sep')[];
  open: boolean;
  onOpen: (id: string) => void;
  onClose: () => void;
}

function Menu({ id, label, items, open, onOpen, onClose }: MenuProps) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{
          ...MENU_BTN_STYLE,
          background: open ? '#E5E7EB' : 'transparent',
        }}
        onMouseDown={e => {
          e.preventDefault();
          open ? onClose() : onOpen(id);
        }}
      >
        {label}
        <ChevronDown size={10} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={DROPDOWN_STYLE}>
          {items.map((item, i) =>
            item === 'sep'
              ? <div key={i} style={SEP_STYLE} />
              : <MenuItem key={i} item={item} onDone={onClose} />
          )}
        </div>
      )}
    </div>
  );
}

// ── HwpMenuBar ───────────────────────────────────────────────────────────────

interface Props {
  editor: Editor | null;
  onSave?: () => void;
  onExport?: () => void;
}

export default function HwpMenuBar({ editor, onSave, onExport }: Props) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  if (!editor) return <div style={{ height: 28, ...BAR_STYLE }} />;

  const c = editor.chain().focus();

  const fileItems: (MenuItemDef | 'sep')[] = [
    { label: '새로 만들기', action: () => { if (confirm('현재 내용을 지우고 새 문서를 만드시겠습니까?')) editor.commands.clearContent(); } },
    'sep',
    { label: 'HWP로 저장', shortcut: 'Ctrl+S', action: onSave },
    { label: 'HWP 내보내기', action: onExport },
    'sep',
    { label: '인쇄', shortcut: 'Ctrl+P', disabled: true },
  ];

  const editItems: (MenuItemDef | 'sep')[] = [
    { label: '되돌리기', shortcut: 'Ctrl+Z', action: () => c.undo().run() },
    { label: '다시 실행', shortcut: 'Ctrl+Y', action: () => c.redo().run() },
    'sep',
    { label: '모두 선택', shortcut: 'Ctrl+A', action: () => c.selectAll().run() },
    'sep',
    { label: '찾기', shortcut: 'Ctrl+F', disabled: true },
    { label: '찾아 바꾸기', disabled: true },
  ];

  const formatItems: (MenuItemDef | 'sep')[] = [
    { label: '진하게', shortcut: 'Ctrl+B', action: () => c.toggleBold().run() },
    { label: '기울임꼴', shortcut: 'Ctrl+I', action: () => c.toggleItalic().run() },
    { label: '밑줄', shortcut: 'Ctrl+U', action: () => c.toggleUnderline().run() },
    { label: '취소선', action: () => c.toggleStrike().run() },
    'sep',
    { label: '왼쪽 정렬', action: () => c.setTextAlign('left').run() },
    { label: '가운데 정렬', action: () => c.setTextAlign('center').run() },
    { label: '오른쪽 정렬', action: () => c.setTextAlign('right').run() },
    { label: '양쪽 정렬', action: () => c.setTextAlign('justify').run() },
    'sep',
    { label: '글머리표 목록', action: () => c.toggleBulletList().run() },
    { label: '번호 매기기 목록', action: () => c.toggleOrderedList().run() },
  ];

  const insertItems: (MenuItemDef | 'sep')[] = [
    { label: '표 삽입 (3×3)', action: () => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run() },
    { label: '구분선', action: () => c.setHorizontalRule().run() },
    'sep',
    {
      label: '하이퍼링크',
      shortcut: 'Ctrl+K',
      action: () => {
        const url = window.prompt('URL을 입력하세요:', 'https://');
        if (url) c.setLink({ href: url }).run();
        else c.unsetLink().run();
      },
    },
    'sep',
    { label: '머리말/꼬리말', disabled: true },
    { label: '각주/미주', disabled: true },
    { label: '수식', disabled: true },
    { label: '문자표', disabled: true },
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ec = editor.chain().focus() as any;
  const tableItems: (MenuItemDef | 'sep')[] = [
    { label: '표 삽입 (3×3)', action: () => c.insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run() },
    'sep',
    { label: '줄 추가 (위)', action: () => { try { ec.addRowBefore().run(); } catch { /* ignore */ } } },
    { label: '줄 추가 (아래)', action: () => { try { ec.addRowAfter().run(); } catch { /* ignore */ } } },
    { label: '칸 추가 (왼쪽)', action: () => { try { ec.addColumnBefore().run(); } catch { /* ignore */ } } },
    { label: '칸 추가 (오른쪽)', action: () => { try { ec.addColumnAfter().run(); } catch { /* ignore */ } } },
    'sep',
    { label: '줄 삭제', action: () => { try { ec.deleteRow().run(); } catch { /* ignore */ } } },
    { label: '칸 삭제', action: () => { try { ec.deleteColumn().run(); } catch { /* ignore */ } } },
    { label: '표 삭제', action: () => { try { ec.deleteTable().run(); } catch { /* ignore */ } } },
    'sep',
    { label: '셀 합치기', action: () => { try { ec.mergeCells().run(); } catch { /* ignore */ } } },
    { label: '셀 나누기', action: () => { try { ec.splitCell().run(); } catch { /* ignore */ } } },
  ];

  const toolItems: (MenuItemDef | 'sep')[] = [
    { label: '환경 설정', disabled: true },
  ];

  const menus = [
    { id: 'file', label: '파일', items: fileItems },
    { id: 'edit', label: '편집', items: editItems },
    { id: 'format', label: '서식', items: formatItems },
    { id: 'insert', label: '입력', items: insertItems },
    { id: 'table', label: '표', items: tableItems },
    { id: 'tools', label: '도구', items: toolItems },
  ];

  return (
    <div ref={barRef} style={BAR_STYLE}>
      {menus.map(m => (
        <Menu
          key={m.id}
          id={m.id}
          label={m.label}
          items={m.items}
          open={openMenu === m.id}
          onOpen={setOpenMenu}
          onClose={() => setOpenMenu(null)}
        />
      ))}
    </div>
  );
}
