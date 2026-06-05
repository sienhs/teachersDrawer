import type { Editor } from '@tiptap/react';

// ── 상수 ──────────────────────────────────────────────────────────────────────

const FONT_FAMILIES = [
  '함초롬바탕', '함초롬돋움', '맑은 고딕', '나눔고딕', '나눔명조',
  '바탕', '돋움', '굴림', '궁서',
];

const FONT_SIZES = [9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];

const BAR_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  background: '#F2F2F2',
  borderBottom: '1px solid #E5E7EB',
  padding: '5px 10px',
  gap: 3,
  overflowX: 'auto',
  flexWrap: 'nowrap',
  userSelect: 'none',
  flexShrink: 0,
};

const SELECT_STYLE: React.CSSProperties = {
  height: 28,
  fontSize: 12,
  border: '1px solid #D1D5DB',
  borderRadius: 3,
  background: '#FFFFFF',
  color: '#1F2937',
  padding: '0 4px',
  cursor: 'pointer',
  outline: 'none',
};

const SEP: React.CSSProperties = {
  width: 1, height: 20, background: '#D1D5DB', margin: '0 4px', flexShrink: 0,
};

const BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 30,
  height: 28,
  padding: '0 5px',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  background: 'transparent',
  color: '#374151',
  fontSize: 13,
  fontWeight: 600,
  flexShrink: 0,
  outline: 'none',
};

const BTN_ACTIVE: React.CSSProperties = { ...BTN, background: '#FFE4CC', color: '#C05000' };

// ── ToolBtn ──────────────────────────────────────────────────────────────────

function TB({
  active, title, onAction, children,
}: {
  active?: boolean; title: string; onAction: () => void; children: React.ReactNode;
}) {
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

// ── 글자 크기 조절 버튼 ──────────────────────────────────────────────────────

function SizeAdjBtn({ label, title, onAction }: { label: string; title: string; onAction: () => void }) {
  return (
    <button
      style={{ ...BTN, fontSize: 10, minWidth: 20, padding: '0 2px' }}
      title={title}
      onMouseDown={e => { e.preventDefault(); onAction(); }}
    >
      {label}
    </button>
  );
}

// ── HwpFormatBar ─────────────────────────────────────────────────────────────

interface Props {
  editor: Editor | null;
}

export default function HwpFormatBar({ editor }: Props) {
  if (!editor) return <div style={{ height: 32, ...BAR_STYLE }} />;

  // 현재 서식 값 읽기
  const headingLevel =
    editor.isActive('heading', { level: 1 }) ? '1' :
    editor.isActive('heading', { level: 2 }) ? '2' :
    editor.isActive('heading', { level: 3 }) ? '3' : '0';

  const attrs = editor.getAttributes('textStyle') as Record<string, unknown>;
  const currentFont = (attrs.fontFamily as string | undefined) ?? '';
  const currentSize = (attrs.fontSize as string | undefined) ?? '';
  const currentColor = (attrs.color as string | undefined) ?? '#000000';

  const adjustSize = (delta: number) => {
    const cur = parseFloat(currentSize) || 10;
    const newSize = Math.max(6, Math.min(72, Math.round(cur + delta)));
    editor.chain().focus().setFontSize(`${newSize}pt`).run();
  };

  return (
    <div style={BAR_STYLE}>
      {/* 스타일/제목 */}
      <select
        value={headingLevel}
        style={{ ...SELECT_STYLE, width: 70 }}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const v = Number(e.target.value);
          if (v === 0) editor.chain().focus().setParagraph().run();
          else editor.chain().focus().setHeading({ level: v as 1 | 2 | 3 }).run();
          editor.commands.focus();
        }}
      >
        <option value="0">본문</option>
        <option value="1">제목 1</option>
        <option value="2">제목 2</option>
        <option value="3">제목 3</option>
      </select>

      <div style={SEP} />

      {/* 폰트 패밀리 [B] — 화면+HWP 모두 반영 */}
      <select
        value={currentFont}
        style={{ ...SELECT_STYLE, width: 100 }}
        title="글꼴 (화면+HWP 반영)"
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const font = e.target.value;
          if (font) editor.chain().focus().setFontFamily(font).run();
          else editor.chain().focus().unsetFontFamily().run();
          editor.commands.focus();
        }}
      >
        <option value="">글꼴</option>
        {FONT_FAMILIES.map(f => (
          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
        ))}
      </select>

      {/* 폰트 크기 [B] — 화면+HWP 모두 반영 */}
      <select
        value={currentSize}
        style={{ ...SELECT_STYLE, width: 48 }}
        title="글자 크기 (화면+HWP 반영)"
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const sz = Number(e.target.value);
          if (sz > 0) editor.chain().focus().setFontSize(`${sz}pt`).run();
          editor.commands.focus();
        }}
      >
        <option value="">pt</option>
        {FONT_SIZES.map(s => (
          <option key={s} value={String(s)}>{s}</option>
        ))}
      </select>

      {/* 크기 ▲▼ [B] */}
      <SizeAdjBtn label="▲" title="글자 크기 크게" onAction={() => adjustSize(2)} />
      <SizeAdjBtn label="▼" title="글자 크기 작게" onAction={() => adjustSize(-2)} />

      <div style={SEP} />

      {/* 진하게 / 기울임 / 밑줄 [A] */}
      <TB active={editor.isActive('bold')} title="굵게 (Ctrl+B)" onAction={() => editor.chain().focus().toggleBold().run()}>
        <strong style={{ fontSize: 13 }}>가</strong>
      </TB>
      <TB active={editor.isActive('italic')} title="기울임 (Ctrl+I)" onAction={() => editor.chain().focus().toggleItalic().run()}>
        <em style={{ fontSize: 13, fontStyle: 'italic' }}>가</em>
      </TB>
      <TB active={editor.isActive('underline')} title="밑줄 (Ctrl+U)" onAction={() => editor.chain().focus().toggleUnderline().run()}>
        <span style={{ textDecoration: 'underline', fontSize: 13 }}>가</span>
      </TB>

      <div style={SEP} />

      {/* 글자색 [B] — 화면+HWP 모두 반영 */}
      <label
        title="글자색 (화면+HWP 반영)"
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 2 }}
      >
        <span style={{ fontSize: 11, color: '#374151' }}>글자색</span>
        <input
          type="color"
          value={currentColor.startsWith('#') ? currentColor : '#000000'}
          style={{ width: 20, height: 20, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
          onChange={e => { editor.chain().focus().setColor(e.target.value).run(); }}
        />
      </label>

      {/* 형광펜 [B] — 화면 전용 (HWP 변환 미지원) */}
      <label
        title="형광펜 — 화면 전용 (HWP 저장 시 손실됨)"
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 2 }}
      >
        <span style={{ fontSize: 11, color: '#374151' }}>형광펜</span>
        <input
          type="color"
          defaultValue="#FFFF00"
          style={{ width: 20, height: 20, border: 'none', cursor: 'pointer', background: 'none', padding: 0 }}
          onChange={e => {
            editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
          }}
        />
        <span style={{ fontSize: 9, color: '#F59E0B' }}>★화면전용</span>
      </label>

      <div style={SEP} />

      {/* 줄 간격 [B] — 화면 전용 (HWP 변환 미지원) */}
      <label
        title="줄 간격 — 화면 전용 (HWP 저장 시 손실됨)"
        style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 2 }}
      >
        <span style={{ fontSize: 11, color: '#374151' }}>줄간격</span>
        <select
          style={{ ...SELECT_STYLE, width: 52 }}
          onMouseDown={e => e.stopPropagation()}
          defaultValue="160"
          onChange={e => {
            const lh = e.target.value;
            // lineHeight는 CSS 적용 (HWP 변환 미지원)
            const el = document.querySelector('.ProseMirror') as HTMLElement | null;
            if (el) el.style.lineHeight = `${Number(lh) / 100}`;
          }}
        >
          {[100, 130, 160, 180, 200, 300].map(v => (
            <option key={v} value={String(v)}>{v}%</option>
          ))}
        </select>
        <span style={{ fontSize: 9, color: '#F59E0B' }}>★화면전용</span>
      </label>
    </div>
  );
}
