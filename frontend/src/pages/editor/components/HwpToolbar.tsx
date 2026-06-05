import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import HwpMenuBar from './toolbar/HwpMenuBar';
import HwpIconBar from './toolbar/HwpIconBar';
import HwpFormatBar from './toolbar/HwpFormatBar';

interface Props {
  editor: Editor | null;
  onSave?: () => void;
  onExport?: () => void;
}

export default function HwpToolbar({ editor, onSave, onExport }: Props) {
  // editor 트랜잭션마다 강제 리렌더 → 자식 컴포넌트가 isActive() 등 최신 값 반영
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = () => forceUpdate(n => n + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <HwpMenuBar editor={editor} onSave={onSave} onExport={onExport} />
      <HwpIconBar editor={editor} />
      <HwpFormatBar editor={editor} />
    </div>
  );
}
