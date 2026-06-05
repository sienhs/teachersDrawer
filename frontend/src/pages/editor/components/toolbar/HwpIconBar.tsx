import { useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Undo2, Redo2,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListIndentIncrease, ListIndentDecrease,
  Table, SeparatorHorizontal, Link, Search, TableProperties,
} from 'lucide-react';
import CellPropsPopover from './CellPropsPopover';

// ── 공유 스타일 ───────────────────────────────────────────────────────────────

const BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  padding: 0,
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  background: 'transparent',
  color: '#374151',
  flexShrink: 0,
  outline: 'none',
  transition: 'background 0.1s',
};

const BTN_ACTIVE: React.CSSProperties = { ...BTN, background: '#FFE4CC', color: '#C05000' };
const BTN_DISABLED: React.CSSProperties = { ...BTN, color: '#D1D5DB', cursor: 'default' };

const SEP: React.CSSProperties = {
  width: 1, height: 22, background: '#D1D5DB', margin: '0 4px', flexShrink: 0,
};

// ── ToolBtn ──────────────────────────────────────────────────────────────────

interface TBProps {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onAction: () => void;
  children: React.ReactNode;
}

function TB({ active, disabled, title, onAction, children }: TBProps) {
  if (disabled) {
    return <button style={BTN_DISABLED} disabled title="준비 중">{children}</button>;
  }
  return (
    <button
      style={active ? BTN_ACTIVE : BTN}
      title={title}
      onMouseDown={e => { e.preventDefault(); onAction(); }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#FFF0E6'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

// ── HwpIconBar ────────────────────────────────────────────────────────────────

interface Props {
  editor: Editor | null;
}

export default function HwpIconBar({ editor }: Props) {
  const cellPropsBtnRef = useRef<HTMLDivElement>(null);
  const [showCellProps, setShowCellProps] = useState(false);

  if (!editor) return (
    <div style={{ height: 40, background: '#F5F5F5', borderBottom: '1px solid #E5E7EB' }} />
  );

  const c = () => editor.chain().focus();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tc = () => editor.chain().focus() as any;

  const isInTable = editor.isActive('tableCell') || editor.isActive('tableHeader');

  const handleLink = () => {
    if (editor.isActive('link')) {
      c().unsetLink().run();
    } else {
      const url = window.prompt('URL을 입력하세요:', 'https://');
      if (url) c().setLink({ href: url }).run();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#F5F5F5',
        borderBottom: '1px solid #E5E7EB',
        padding: '4px 10px',
        gap: 2,
        overflowX: 'auto',
        flexWrap: 'nowrap',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* 되돌리기 / 다시실행 */}
      <TB title="되돌리기 (Ctrl+Z)" onAction={() => c().undo().run()}>
        <Undo2 size={17} />
      </TB>
      <TB title="다시 실행 (Ctrl+Y)" onAction={() => c().redo().run()}>
        <Redo2 size={17} />
      </TB>

      <div style={SEP} />

      {/* 글자 서식 */}
      <TB active={editor.isActive('bold')} title="굵게 (Ctrl+B)" onAction={() => c().toggleBold().run()}>
        <Bold size={17} />
      </TB>
      <TB active={editor.isActive('italic')} title="기울임 (Ctrl+I)" onAction={() => c().toggleItalic().run()}>
        <Italic size={17} />
      </TB>
      <TB active={editor.isActive('underline')} title="밑줄 (Ctrl+U)" onAction={() => c().toggleUnderline().run()}>
        <Underline size={17} />
      </TB>
      <TB active={editor.isActive('strike')} title="취소선" onAction={() => c().toggleStrike().run()}>
        <Strikethrough size={17} />
      </TB>

      <div style={SEP} />

      {/* 정렬 */}
      <TB active={editor.isActive({ textAlign: 'left' })} title="왼쪽 정렬" onAction={() => c().setTextAlign('left').run()}>
        <AlignLeft size={17} />
      </TB>
      <TB active={editor.isActive({ textAlign: 'center' })} title="가운데 정렬" onAction={() => c().setTextAlign('center').run()}>
        <AlignCenter size={17} />
      </TB>
      <TB active={editor.isActive({ textAlign: 'right' })} title="오른쪽 정렬" onAction={() => c().setTextAlign('right').run()}>
        <AlignRight size={17} />
      </TB>
      <TB active={editor.isActive({ textAlign: 'justify' })} title="양쪽 정렬" onAction={() => c().setTextAlign('justify').run()}>
        <AlignJustify size={17} />
      </TB>

      <div style={SEP} />

      {/* 목록 */}
      <TB active={editor.isActive('bulletList')} title="글머리표 목록" onAction={() => c().toggleBulletList().run()}>
        <List size={17} />
      </TB>
      <TB active={editor.isActive('orderedList')} title="번호 목록" onAction={() => c().toggleOrderedList().run()}>
        <ListOrdered size={17} />
      </TB>
      <TB title="수준 늘리기 (Tab)" onAction={() => { try { tc().sinkListItem('listItem').run(); } catch { /* ignore */ } }}>
        <ListIndentIncrease size={17} />
      </TB>
      <TB title="수준 줄이기 (Shift+Tab)" onAction={() => { try { tc().liftListItem('listItem').run(); } catch { /* ignore */ } }}>
        <ListIndentDecrease size={17} />
      </TB>

      <div style={SEP} />

      {/* 표 삽입 */}
      <TB title="표 삽입 (3×3)" onAction={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run()}>
        <Table size={17} />
      </TB>

      {/* 셀 속성 — 커서가 표 안에 있을 때만 활성 */}
      <div ref={cellPropsBtnRef} style={{ display: 'inline-flex' }}>
        {isInTable ? (
          <button
            style={showCellProps ? BTN_ACTIVE : BTN}
            title="셀 속성 (배경색·테두리)"
            onMouseDown={e => { e.preventDefault(); setShowCellProps(v => !v); }}
            onMouseEnter={e => { if (!showCellProps) (e.currentTarget as HTMLButtonElement).style.background = '#FFF0E6'; }}
            onMouseLeave={e => { if (!showCellProps) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <TableProperties size={17} />
          </button>
        ) : (
          <button style={BTN_DISABLED} disabled title="표 안에서만 사용 가능">
            <TableProperties size={17} />
          </button>
        )}
      </div>

      {/* 구분선 */}
      <TB title="구분선 삽입" onAction={() => c().setHorizontalRule().run()}>
        <SeparatorHorizontal size={17} />
      </TB>

      <div style={SEP} />

      {/* 하이퍼링크 [B] */}
      <TB active={editor.isActive('link')} title="하이퍼링크 (화면 전용)" onAction={handleLink}>
        <Link size={17} />
      </TB>

      {/* 찾기 [C] */}
      <TB disabled title="준비 중" onAction={() => {}}>
        <Search size={17} />
      </TB>

      {/* 셀 속성 팝오버 */}
      {showCellProps && isInTable && (
        <CellPropsPopover
          editor={editor}
          triggerRef={cellPropsBtnRef}
          onClose={() => setShowCellProps(false)}
        />
      )}
    </div>
  );
}
