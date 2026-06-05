interface Props {
  title: string;
  onTitleChange: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
  onExport: () => void;
  saving: boolean;
  exporting: boolean;
}

export default function EditorToolbar({
  title,
  onTitleChange,
  onBack,
  onSave,
  onExport,
  saving,
  exporting,
}: Props) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        height: 52,
        flexShrink: 0,
        background: '#FFF8F0',
        borderBottom: '1px solid #F0E8E0',
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-orange-100 hover:text-gray-700 transition-colors"
      >
        ← 뒤로
      </button>

      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="문서 제목을 입력하세요"
        className="flex-1 min-w-0 bg-transparent border-none outline-none text-lg font-semibold text-gray-800 placeholder-gray-300"
      />

      <button
        type="button"
        onClick={onExport}
        disabled={exporting || saving}
        className="shrink-0 rounded-lg px-3 py-1.5 text-sm border border-gray-300 text-gray-600 hover:bg-white hover:border-gray-400 transition-colors disabled:opacity-50"
      >
        {exporting ? '내보내는 중…' : '내보내기'}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={saving || exporting}
        className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
        style={{ background: saving ? '#ccc' : '#FF9F66' }}
      >
        {saving ? '저장 중…' : 'HWP로 저장'}
      </button>
    </div>
  );
}
