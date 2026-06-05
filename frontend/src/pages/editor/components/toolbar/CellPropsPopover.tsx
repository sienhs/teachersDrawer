import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface Props {
  editor: Editor;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export default function CellPropsPopover({ editor, triggerRef, onClose }: Props) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: Math.max(8, rect.left - 4) });
  }, [triggerRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, triggerRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const cellType = editor.isActive('tableHeader') ? 'tableHeader' : 'tableCell';
  const attrs = editor.getAttributes(cellType) as {
    cellPaddingLeft?: number | null;
    cellPaddingRight?: number | null;
    cellPaddingTop?: number | null;
    cellPaddingBottom?: number | null;
    cellHeight?: number | null;
    cellVerticalAlign?: string | null;
  };

  const apply = (patch: Record<string, unknown>) => {
    editor.chain().focus().updateAttributes(cellType, patch).run();
  };

  const reset = () => {
    editor.chain().focus().updateAttributes(cellType, {
      cellPaddingLeft: null,
      cellPaddingRight: null,
      cellPaddingTop: null,
      cellPaddingBottom: null,
      cellHeight: null,
      cellVerticalAlign: null,
    }).run();
  };

  const vAlign = attrs.cellVerticalAlign ?? 'top';

  return (
    <div
      ref={popRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 300,
        background: '#FFFFFF',
        border: '1px solid #D1D5DB',
        borderRadius: 6,
        boxShadow: '0 4px 20px rgba(0,0,0,0.16)',
        padding: '12px 14px',
        minWidth: 230,
        fontSize: 12,
        color: '#1F2937',
        userSelect: 'none',
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>셀 속성</span>
        <button
          onMouseDown={e => { e.preventDefault(); onClose(); }}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', fontSize: 16, lineHeight: 1, padding: 2 }}
        >×</button>
      </div>

      {/* HWP 보존 안내 */}
      <div style={{ fontSize: 10, color: '#059669', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 3, padding: '3px 6px', marginBottom: 10 }}>
        ✅ HWP 저장 시 보존됨
      </div>

      {/* 안쪽 여백 */}
      <SectionLabel>안쪽 여백 (pt)</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 10 }}>
        <NumInput
          label="위"
          value={attrs.cellPaddingTop ?? ''}
          onChange={v => apply({ cellPaddingTop: v })}
        />
        <NumInput
          label="아래"
          value={attrs.cellPaddingBottom ?? ''}
          onChange={v => apply({ cellPaddingBottom: v })}
        />
        <NumInput
          label="왼쪽"
          value={attrs.cellPaddingLeft ?? ''}
          onChange={v => apply({ cellPaddingLeft: v })}
        />
        <NumInput
          label="오른쪽"
          value={attrs.cellPaddingRight ?? ''}
          onChange={v => apply({ cellPaddingRight: v })}
        />
      </div>

      {/* 행 높이 */}
      <SectionLabel>행 높이 (pt)</SectionLabel>
      <div style={{ marginBottom: 10 }}>
        <NumInput
          label=""
          value={attrs.cellHeight ?? ''}
          onChange={v => apply({ cellHeight: v })}
          wide
        />
      </div>

      {/* 수직 정렬 */}
      <SectionLabel>수직 정렬</SectionLabel>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['top', 'center', 'bottom'] as const).map(v => (
          <button
            key={v}
            onMouseDown={e => { e.preventDefault(); apply({ cellVerticalAlign: v }); }}
            style={{
              flex: 1,
              padding: '3px 0',
              fontSize: 11,
              border: `1px solid ${vAlign === v ? '#6366F1' : '#D1D5DB'}`,
              borderRadius: 3,
              background: vAlign === v ? '#EEF2FF' : 'transparent',
              color: vAlign === v ? '#4338CA' : '#374151',
              cursor: 'pointer',
              fontWeight: vAlign === v ? 600 : 400,
            }}
          >
            {v === 'top' ? '위' : v === 'center' ? '가운데' : '아래'}
          </button>
        ))}
      </div>

      {/* 초기화 */}
      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10 }}>
        <button
          onMouseDown={e => { e.preventDefault(); reset(); }}
          style={{
            width: '100%',
            height: 28,
            border: '1px solid #D1D5DB',
            borderRadius: 4,
            background: '#F9FAFB',
            cursor: 'pointer',
            fontSize: 12,
            color: '#374151',
          }}
        >
          초기화
        </button>
      </div>
    </div>
  );
}

// ── 보조 컴포넌트 ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 4 }}>{children}</div>
  );
}

function NumInput({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: number | string;
  onChange: (v: number | null) => void;
  wide?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {label && <span style={{ fontSize: 10, color: '#9CA3AF', minWidth: 22 }}>{label}</span>}
      <input
        type="number"
        min={0}
        max={999}
        step={1}
        value={value === null || value === '' ? '' : String(value)}
        style={{
          width: wide ? 80 : 50,
          height: 24,
          fontSize: 11,
          border: '1px solid #D1D5DB',
          borderRadius: 3,
          padding: '0 4px',
          outline: 'none',
          background: '#fff',
        }}
        onChange={e => {
          const n = parseFloat(e.target.value);
          onChange(isNaN(n) ? null : n);
        }}
      />
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>pt</span>
    </label>
  );
}
